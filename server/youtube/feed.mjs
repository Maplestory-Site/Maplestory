import staticFeed from "../../src/data/youtubeVideos.json" with { type: "json" };

const CHANNEL_HANDLE_URL = "https://www.youtube.com/@snailslayermain";
const MAX_VIDEOS = 24;
const CACHE_MS = 5 * 60 * 1000;
const SEED_VIDEO_IDS = ["0Xjqa0LXQlg", "d_A90T991Qg", "-i-iViq2jjU", "5mIrGj4dR1A", "FUF1NI8vm1o"];

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

function readMeta(html = "", name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = html.match(new RegExp(`<(?:meta|link) itemprop="${escaped}" (?:content|href)="([^"]*)"`, "i"));
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

  if (/(guide|preview|explained|what'?s next|update|remaster|tips|how to)/.test(text)) {
    return "Guides";
  }

  return "Highlights";
}

function shorten(text = "", maxLength = 130) {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) {
    return "Watch the latest MapleStory upload on the channel.";
  }

  return cleaned.length <= maxLength ? cleaned : `${cleaned.slice(0, maxLength - 1).trimEnd()}...`;
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

function formatDuration(value = "") {
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

async function fetchWatchHtml(videoId) {
  const response = await fetch(`https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`, {
    headers: {
      Accept: "text/html",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36"
    }
  });

  if (!response.ok) {
    throw new Error(`YouTube watch page failed: ${response.status}`);
  }

  return response.text();
}

async function fetchOembed(videoId) {
  const response = await fetch(
    `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}&format=json`
  );
  if (!response.ok) {
    return null;
  }

  return response.json();
}

async function buildVideo(videoId) {
  const [html, oembed] = await Promise.all([fetchWatchHtml(videoId), fetchOembed(videoId)]);
  const authorUrl = oembed?.author_url || readMeta(html, "url");
  if (!String(authorUrl).includes("@snailslayermain")) {
    return null;
  }

  const title = readMeta(html, "name") || oembed?.title || "Untitled video";
  const description = readMeta(html, "description");

  return {
    id: videoId,
    title,
    description: shorten(description),
    category: inferCategory(title, description),
    duration: formatDuration(readMeta(html, "duration")),
    published: formatPublished(readMeta(html, "uploadDate") || readMeta(html, "datePublished")),
    href: `https://www.youtube.com/watch?v=${videoId}`,
    thumbnail: readMeta(html, "thumbnailUrl") || oembed?.thumbnail_url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    viewCount: ""
  };
}

function readCandidateIds(html = "") {
  return [...html.matchAll(/"videoId":"([^"]+)"/g)]
    .map((match) => match[1])
    .filter((id, index, ids) => id && ids.indexOf(id) === index);
}

export async function getYoutubeFeed({ forceRefresh = false } = {}) {
  const now = Date.now();
  if (!forceRefresh && memoryCache && now - memoryCache.createdAt < CACHE_MS) {
    return memoryCache.payload;
  }

  const seedHtml = await fetchWatchHtml(SEED_VIDEO_IDS[0]);
  const ids = [...readCandidateIds(seedHtml), ...SEED_VIDEO_IDS]
    .filter((id, index, allIds) => allIds.indexOf(id) === index)
    .slice(0, MAX_VIDEOS);
  const liveVideos = (await Promise.all(ids.map((id) => buildVideo(id)))).filter(Boolean);
  const staticVideos = readStaticVideos();
  const mergedVideos = [...liveVideos, ...staticVideos].filter(
    (video, index, videos) => video?.id && videos.findIndex((item) => item?.id === video.id) === index
  );
  const videos = mergedVideos.toSorted((a, b) => publishedTime(b) - publishedTime(a)).slice(0, MAX_VIDEOS);

  if (!videos.length) {
    throw new Error("YouTube scraper returned no videos.");
  }

  const payload = {
    channelTitle: "snailslayer",
    channelUrl: CHANNEL_HANDLE_URL,
    lastSynced: new Date().toISOString(),
    videos
  };

  memoryCache = { createdAt: now, payload };
  return payload;
}
