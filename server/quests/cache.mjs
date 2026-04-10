import fs from "node:fs/promises";

import { QUESTS_RUNTIME_CACHE_DIR, QUESTS_RUNTIME_CACHE_FILE } from "./config.mjs";
import { seededQuestFeed } from "./seed.mjs";

async function ensureRuntimeCacheDir() {
  await fs.mkdir(QUESTS_RUNTIME_CACHE_DIR, { recursive: true });
}

export async function readQuestCacheFeed() {
  try {
    const raw = await fs.readFile(QUESTS_RUNTIME_CACHE_FILE, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function writeQuestCacheFeed(feed) {
  await ensureRuntimeCacheDir();
  await fs.writeFile(QUESTS_RUNTIME_CACHE_FILE, JSON.stringify(feed, null, 2), "utf8");
}

export function getSeedQuestFeed() {
  return JSON.parse(JSON.stringify(seededQuestFeed));
}
