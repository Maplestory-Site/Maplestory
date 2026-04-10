import os from "node:os";
import path from "node:path";

export const QUESTS_SOURCE_URL = "https://maplestory.fandom.com/wiki/Quests";
export const QUESTS_API_URL = "https://maplestory.fandom.com/api.php";
export const QUESTS_FETCH_TIMEOUT_MS = 30000;
export const QUESTS_CACHE_TTL_MINUTES = 720;
export const QUESTS_BATCH_SIZE = 40;

const runtimeRoot =
  process.env.TMP ||
  process.env.TEMP ||
  path.join(os.tmpdir(), "snailslayer-site");

export const QUESTS_RUNTIME_CACHE_DIR = path.join(runtimeRoot, "quests-cache");
export const QUESTS_RUNTIME_CACHE_FILE = path.join(QUESTS_RUNTIME_CACHE_DIR, "quests-feed.json");

export const QUESTS_SOURCE_META = {
  sourceName: "MapleStory Fandom",
  sourceUrl: QUESTS_SOURCE_URL,
  copyrightLabel: "Source: MapleStory Fandom / curated quest preview",
};
