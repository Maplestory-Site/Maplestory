import os from "node:os";
import path from "node:path";

export const MONSTERS_SOURCE_URL = "https://maplestory.fandom.com/wiki/Monster";
export const MONSTERS_CACHE_TTL_MINUTES = 360;
export const MONSTERS_FETCH_TIMEOUT_MS = 12000;

const runtimeRoot =
  process.env.TMP ||
  process.env.TEMP ||
  path.join(os.tmpdir(), "snailslayer-site");

export const MONSTERS_RUNTIME_CACHE_DIR = path.join(runtimeRoot, "monsters-cache");
export const MONSTERS_RUNTIME_CACHE_FILE = path.join(
  MONSTERS_RUNTIME_CACHE_DIR,
  "monsters-feed.json",
);

export const MONSTERS_SOURCE_META = {
  sourceName: "MapleStory Fandom",
  sourceUrl: MONSTERS_SOURCE_URL,
  copyrightLabel: "Source: MapleStory Fandom / curated preview",
};
