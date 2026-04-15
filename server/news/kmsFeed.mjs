import { KMS_FEED_FILE, KMS_FEED_TTL_MINUTES } from "./config.mjs";
import { fetchKmsRss, normalizeKmsItem } from "./kms.mjs";
import { fetchKmsArticle } from "./kmsArticle.mjs";
import { sortNewsItems } from "./normalize.mjs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const MAX_KMS_ITEMS = 36;

async function readJson(file) {
  try {
    const raw = await readFile(file, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function writeJson(file, payload) {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function isFresh(meta) {
  if (!meta?.lastUpdated) {
    return false;
  }
  return Date.now() - new Date(meta.lastUpdated).getTime() < KMS_FEED_TTL_MINUTES * 60 * 1000;
}

function buildMeta({ status, itemCount, updatedAt, lastSuccessfulSync }) {
  return {
    lastUpdated: updatedAt,
    lastSuccessfulSync,
    sourceStatus: status,
    itemCount
  };
}

export async function getKmsFeed({ forceRefresh = false } = {}) {
  const cached = await readJson(KMS_FEED_FILE);

  if (cached && !forceRefresh && isFresh(cached.meta)) {
    return cached;
  }

  const fetchedAt = new Date().toISOString();
  let items = [];

  try {
    const rssItems = await fetchKmsRss();
    const normalized = rssItems.map((item) => normalizeKmsItem(item, null, fetchedAt));
    const topItems = normalized.slice(0, MAX_KMS_ITEMS);

    items = await Promise.all(
      topItems.map(async (entry) => {
        if (!entry.sourceUrl) {
          return entry;
        }
        try {
          const breakdown = await fetchKmsArticle(entry.sourceUrl);
          return { ...entry, image: entry.image || breakdown.heroImage || "", kmsBreakdown: breakdown };
        } catch {
          return entry;
        }
      })
    );
  } catch (error) {
    if (cached) {
      return cached;
    }
    return { items: [], meta: buildMeta({ status: "error", itemCount: 0, updatedAt: fetchedAt, lastSuccessfulSync: "" }) };
  }

  const sorted = sortNewsItems(items).slice(0, MAX_KMS_ITEMS);
  const payload = {
    items: sorted,
    meta: buildMeta({ status: "fresh", itemCount: sorted.length, updatedAt: fetchedAt, lastSuccessfulSync: fetchedAt })
  };

  await writeJson(KMS_FEED_FILE, payload);
  return payload;
}
