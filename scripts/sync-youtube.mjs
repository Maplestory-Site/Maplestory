import { execFile } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { promisify } from "node:util";
import path from "node:path";

const execFileAsync = promisify(execFile);

const CHANNEL_URL = "https://www.youtube.com/@snailslayermain/videos";
const OUTPUT_FILE = path.resolve("src/data/youtubeVideos.json");
const MAX_VIDEOS = 24;

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

  return cleaned.length <= maxLength ? cleaned : `${cleaned.slice(0, maxLength - 1).trimEnd()}…`;
}

function formatDuration(seconds) {
  if (!Number.isFinite(seconds)) {
    return "";
  }

  const total = Math.max(0, Math.round(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }

  return `${minutes}:${String(secs).padStart(2, "0")}`;
}

function formatPublished(uploadDate) {
  if (!uploadDate || uploadDate.length !== 8) {
    return "";
  }

  const year = Number(uploadDate.slice(0, 4));
  const month = Number(uploadDate.slice(4, 6)) - 1;
  const day = Number(uploadDate.slice(6, 8));
  const date = new Date(Date.UTC(year, month, day));

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(date);
}

function formatViews(viewCount) {
  if (!Number.isFinite(viewCount)) {
    return "";
  }

  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1
  }).format(viewCount);
}

async function fetchYoutubeData() {
  const { stdout } = await execFileAsync(
    "yt-dlp",
    [
      "--dump-single-json",
      "--playlist-end",
      String(MAX_VIDEOS),
      "--extractor-args",
      "youtube:player_client=android_vr",
      CHANNEL_URL
    ],
    { maxBuffer: 1024 * 1024 * 20 }
  );

  return JSON.parse(stdout);
}

async function readExisting() {
  try {
    const raw = await readFile(OUTPUT_FILE, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function main() {
  const existing = await readExisting();

  try {
    const data = await fetchYoutubeData();
    const entries = Array.isArray(data.entries) ? data.entries : [];

    const videos = entries
      .filter((entry) => entry?.id && (entry?.webpage_url || entry?.original_url))
      .map((entry) => ({
        id: entry.id,
        title: entry.title || "Untitled video",
        description: shorten(entry.description || ""),
        category: inferCategory(entry.title || "", entry.description || ""),
        duration: formatDuration(entry.duration),
        published: formatPublished(entry.upload_date),
        href: entry.webpage_url || entry.original_url,
        thumbnail: entry.thumbnail || entry.thumbnails?.[entry.thumbnails.length - 1]?.url || "",
        viewCount: formatViews(entry.view_count)
      }));

    const payload = {
      channelTitle: data.channel || "snailslayer",
      channelUrl: "https://www.youtube.com/@snailslayermain",
      lastSynced: new Date().toISOString(),
      videos
    };

    await mkdir(path.dirname(OUTPUT_FILE), { recursive: true });
    await writeFile(OUTPUT_FILE, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
    console.log(`Synced ${videos.length} YouTube videos.`);
  } catch (error) {
    if (existing) {
      console.warn("YouTube sync failed. Keeping existing cached data.");
      return;
    }

    throw error;
  }
}

main().catch((error) => {
  console.error("Failed to sync YouTube videos.");
  console.error(error);
  process.exit(1);
});
