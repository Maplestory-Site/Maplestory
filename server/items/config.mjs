import os from "node:os";
import path from "node:path";

export const ITEMS_SOURCE_URL = "https://maplestory.fandom.com/wiki/Item";
export const ITEMS_API_URL = "https://maplestory.fandom.com/api.php";
export const ITEMS_CACHE_TTL_MINUTES = 720;
export const ITEMS_FETCH_TIMEOUT_MS = 15000;

const runtimeRoot =
  process.env.TMP ||
  process.env.TEMP ||
  path.join(os.tmpdir(), "snailslayer-site");

export const ITEMS_RUNTIME_CACHE_DIR = path.join(runtimeRoot, "items-cache");
export const ITEMS_RUNTIME_CACHE_FILE = path.join(
  ITEMS_RUNTIME_CACHE_DIR,
  "items-feed.json",
);

export const ITEMS_SOURCE_META = {
  sourceName: "MapleStory Fandom",
  sourceUrl: ITEMS_SOURCE_URL,
  copyrightLabel: "Source: MapleStory Fandom / curated item preview",
};
