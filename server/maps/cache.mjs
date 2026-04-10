import fs from "node:fs/promises";

import { MAPS_RUNTIME_CACHE_DIR, MAPS_RUNTIME_CACHE_FILE } from "./config.mjs";
import { seededMapFeed } from "./seed.mjs";

async function ensureRuntimeCacheDir() {
  await fs.mkdir(MAPS_RUNTIME_CACHE_DIR, { recursive: true });
}

export async function readMapCacheFeed() {
  try {
    const raw = await fs.readFile(MAPS_RUNTIME_CACHE_FILE, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function writeMapCacheFeed(feed) {
  await ensureRuntimeCacheDir();
  await fs.writeFile(MAPS_RUNTIME_CACHE_FILE, JSON.stringify(feed, null, 2), "utf8");
}

export function getSeedMapFeed() {
  return JSON.parse(JSON.stringify(seededMapFeed));
}
