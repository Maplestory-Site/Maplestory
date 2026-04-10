import fs from "node:fs/promises";

import { ITEMS_RUNTIME_CACHE_DIR, ITEMS_RUNTIME_CACHE_FILE } from "./config.mjs";
import { seededItemFeed } from "./seed.mjs";

async function ensureRuntimeCacheDir() {
  await fs.mkdir(ITEMS_RUNTIME_CACHE_DIR, { recursive: true });
}

export async function readItemCacheFeed() {
  try {
    const raw = await fs.readFile(ITEMS_RUNTIME_CACHE_FILE, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function writeItemCacheFeed(feed) {
  await ensureRuntimeCacheDir();
  await fs.writeFile(ITEMS_RUNTIME_CACHE_FILE, JSON.stringify(feed, null, 2), "utf8");
}

export function getSeedItemFeed() {
  return JSON.parse(JSON.stringify(seededItemFeed));
}
