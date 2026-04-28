import staticFeed from "../../src/data/youtubeVideos.json" with { type: "json" };

const CHANNEL_HANDLE_URL = "https://www.youtube.com/@snailslayermain";
const CHANNEL_VIDEOS_URL = `${CHANNEL_HANDLE_URL}/videos`;
const MAX_VIDEOS = 24;
const CACHE_MS = 5 * 60 * 1000;

let memoryCache = null;

function decodeXml(text = "") {
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function readTag(xml = "", tag) {
  const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match ? decodeXml(match[1]) : "";
}

function readAttr(xml = "", tag, attr) {
  const match = xml.match(new RegExp(`<${tag}[^>]*${attr}="([^"]*)"`, "i"));
  return match ? decodeXml(match[1]) : "";
}

function inferCategory(title = "", description = "") {
  const text = `${title} ${description}`.toLowerCase();

  if (/(boss|lotus|damien|lucid|will|kalos|seren|gloom|vhilla|verus|weekly boss)/.test(text)) {
    return "Bossing";
  }

  if (/(progress|fragment|upgrade|gear|cubing|meso|reboot|account|arcane|hexa|symbol)/.test(text)) {
    return "Progression";
  }

  if (/(guide|preview|explained|what'?s next|update|remaster|tips|how to|patch notes)/.test(text)) {
    return "Guides";
  }

  return "Highlights";
}

function shorten(text = "", maxLength = 130) {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) {
    return "Watch the latest MapleStory upload on the channel.";
  }

  return cleaned.length <= maxLength ? cleaned : `${cleaned.slice(0, maxLength - 3).trimEnd()}...`;
}

function formatPublished(value = "") {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(date);
}

function formatViews(viewCount) {
  const numeric = Number(viewCount);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return "";
  }

  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1
  }).format(numeric);
}

function formatDuration(value = "") {
  if (/^\d+$/.test(value)) {
    const total = Number(value);
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const seconds = total % 60;

    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    }

    return `${minutes}:${String(seconds).padStart(2, "0")}`;
  }

  const match = value.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!match) {
    return "";
  }

  const hours = Number(match[1] || 0);
  const minutes = Number(match[2] || 0);
  const seconds = Number(match[3] || 0);

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function publishedTime(video) {
  const value = video?.published || "";
  const time = Date.parse(value);
  if (!Number.isNaN(time)) {
    return time;
  }

  const match = value.match(/^([A-Za-z]{3}) (\d{1,2}), (\d{4})$/);
  const monthIndex = {
    Jan: 0,
    Feb: 1,
    Mar: 2,
    Apr: 3,
    May: 4,
    Jun: 5,
    Jul: 6,
    Aug: 7,
    Sep: 8,
    Oct: 9,
    Nov: 10,
    Dec: 11
  }[match?.[1] || ""];

  if (monthIndex === undefined) {
    return 0;
  }

  return Date.UTC(Number(match[3]), monthIndex, Number(match[2]));
}

function readStaticVideos() {
  return Array.isArray(staticFeed.videos) ? staticFeed.videos : [];
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      Accept: "text/html,application/xml,text/xml;q=0.9,*/*;q=0.8",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36"
    }
  });

  if (!response.ok) {
    throw new Error(`YouTube request failed: ${response.status}`);
  }

  return response.text();
}

async function resolveChannelId() {
  const html = await fetchText(CHANNEL_VIDEOS_URL);

  const matches = [
    html.match(/"channelId":"(UC[\w-]+)"/),
    html.match(/channelId=("|')(UC[\w-]+)\1/),
    html.match(/https:\/\/www\.youtube\.com\/channel\/(UC[\w-]+)/),
    html.match(/itemprop="identifier"\s+content="(UC[\w-]+)"/)
  ];

  for (const match of matches) {
    if (!match) continue;
    const candidate = match[2] || match[1];
    if (candidate?.startsWith("UC")) {
      return candidate;
    }
  }

  throw new Error("Failed to resolve YouTube channel id.");
}

function parseRssFeed(xml = "") {
  const entries = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/gi)].map((match) => match[1]);

  return entries
    .map((entry) => {
      const id = readTag(entry, "yt:videoId");
      if (!id) {
        return null;
      }

      const title = readTag(entry, "title") || "Untitled video";
      const description = readTag(entry, "media:description");
      const href = readAttr(entry, "link", "href") || `https://www.youtube.com/watch?v=${id}`;
      const thumbnail =
        readAttr(entry, "media:thumbnail", "url") || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

      return {
        id,
        title,
        description: shorten(description),
        category: inferCategory(title, description),
        duration: formatDuration(readAttr(entry, "media:content", "duration") || readAttr(entry, "yt:duration", "seconds")),
        published: formatPublished(readTag(entry, "published")),
        href,
        thumbnail,
        viewCount: formatViews(readAttr(entry, "media:statistics", "views"))
      };
    })
    .filter(Boolean)
    .slice(0, MAX_VIDEOS);
}

export async function getYoutubeFeed({ forceRefresh = false } = {}) {
  const now = Date.now();
  if (!forceRefresh && memoryCache && now - memoryCache.createdAt < CACHE_MS) {
    return memoryCache.payload;
  }

  try {
    const channelId = await resolveChannelId();
    const rssXml = await fetchText(`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`);
    const liveVideos = parseRssFeed(rssXml);
    const staticVideos = readStaticVideos();
    const videos = [...liveVideos, ...staticVideos]
      .filter((video, index, allVideos) => video?.id && allVideos.findIndex((item) => item?.id === video.id) === index)
      .toSorted((a, b) => publishedTime(b) - publishedTime(a))
      .slice(0, MAX_VIDEOS);

    if (!videos.length) {
      throw new Error("YouTube RSS returned no videos.");
    }

    const payload = {
      channelTitle: staticFeed.channelTitle || "snailslayer",
      channelUrl: CHANNEL_HANDLE_URL,
      lastSynced: new Date().toISOString(),
      videos
    };

    memoryCache = { createdAt: now, payload };
    return payload;
  } catch (error) {
    if (memoryCache?.payload) {
      return memoryCache.payload;
    }

    const staticVideos = readStaticVideos();
    if (!staticVideos.length) {
      throw error;
    }

    return {
      channelTitle: staticFeed.channelTitle || "snailslayer",
      channelUrl: CHANNEL_HANDLE_URL,
      lastSynced: staticFeed.lastSynced || new Date().toISOString(),
      videos: staticVideos.slice(0, MAX_VIDEOS)
    };
  }
}
