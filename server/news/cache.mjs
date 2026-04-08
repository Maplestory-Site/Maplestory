import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { BUNDLED_FEED_FILE, CACHE_FILE, EMPTY_FEED } from "./config.mjs";

async function readJson(file) {
  try {
    const raw = await readFile(file, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function readBundledFeed() {
  return (await readJson(BUNDLED_FEED_FILE)) ?? EMPTY_FEED;
}

export async function readCacheFeed() {
  return (await readJson(CACHE_FILE)) ?? null;
}

export async function writeCacheFeed(payload) {
  try {
    await mkdir(path.dirname(CACHE_FILE), { recursive: true });
    await writeFile(CACHE_FILE, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
    return true;
  } catch (error) {
    console.warn("[news-cache] Failed to write runtime cache.", error instanceof Error ? error.message : error);
    return false;
  }
}

export async function writeBundledFeed(payload) {
  try {
    await mkdir(path.dirname(BUNDLED_FEED_FILE), { recursive: true });
    await writeFile(BUNDLED_FEED_FILE, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
    return true;
  } catch (error) {
    console.warn("[news-cache] Failed to write bundled feed.", error instanceof Error ? error.message : error);
    return false;
  }
}

export async function getBestAvailableFeed() {
  const [cacheFeed, bundledFeed] = await Promise.all([readCacheFeed(), readBundledFeed()]);
  const candidates = [cacheFeed, bundledFeed].filter(Boolean);

  if (!candidates.length) {
    return EMPTY_FEED;
  }

  return candidates.sort((left, right) => {
    const leftTime = new Date(left.meta?.lastUpdated || 0).getTime();
    const rightTime = new Date(right.meta?.lastUpdated || 0).getTime();
    return rightTime - leftTime;
  })[0];
}
