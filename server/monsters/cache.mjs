import fs from "node:fs/promises";

import { MONSTERS_RUNTIME_CACHE_DIR, MONSTERS_RUNTIME_CACHE_FILE } from "./config.mjs";
import { seededMonsterFeed } from "./seed.mjs";

async function ensureRuntimeCacheDir() {
  await fs.mkdir(MONSTERS_RUNTIME_CACHE_DIR, { recursive: true });
}

export async function readMonsterCacheFeed() {
  try {
    const raw = await fs.readFile(MONSTERS_RUNTIME_CACHE_FILE, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function writeMonsterCacheFeed(feed) {
  await ensureRuntimeCacheDir();
  await fs.writeFile(MONSTERS_RUNTIME_CACHE_FILE, JSON.stringify(feed, null, 2), "utf8");
}

export function getSeedMonsterFeed() {
  return JSON.parse(JSON.stringify(seededMonsterFeed));
}
