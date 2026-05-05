import {
  ARCHIVED_ENDPOINT,
  CACHE_TTL_MINUTES,
  EMPTY_FEED,
  FETCH_TIMEOUT_MS,
  MAX_ITEMS,
  NEWS_ENDPOINT,
  OFFICIAL_SOURCE
} from "./config.mjs";
import { getBestAvailableFeed, readBundledFeed, writeBundledFeed, writeCacheFeed } from "./cache.mjs";
import { fetchKmsArticle } from "./kmsArticle.mjs";
import { fetchKmsRss, normalizeKmsItem } from "./kms.mjs";
import { normalizeNewsItem, sortNewsItems } from "./normalize.mjs";

let memoryFeed = null;
let inFlightRefresh = null;
const KMS_CARD_IMAGE_ENRICH_LIMIT = 8;

function isFresh(feed) {
  if (!feed?.meta?.lastUpdated) {
    return false;
  }

  const lastUpdated = new Date(feed.meta.lastUpdated).getTime();
  return Date.now() - lastUpdated < CACHE_TTL_MINUTES * 60 * 1000;
}

async function fetchJson(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  const response = await fetch(url, {
    headers: {
      Accept: "application/json"
    },
    signal: controller.signal
  }).finally(() => {
    clearTimeout(timeout);
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }

  return response.json();
}

function normalizeDedupeText(value = "") {
  return String(value || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^\p{L}\p{N}\s:/.-]/gu, "")
    .trim();
}

export function dedupeNewsItems(items = []) {
  const byId = new Set();
  const bySourceOrTitle = new Set();
  const deduped = [];

  items.forEach((item) => {
    if (!item?.id) return;
    const id = String(item.id);
    const sourceKey = normalizeDedupeText(item.sourceUrl || "");
    const titleDateKey = `${normalizeDedupeText(item.region || "")}:${normalizeDedupeText(item.title || "")}:${normalizeDedupeText((item.publishedAt || "").slice(0, 10))}`;
    const contentKey = sourceKey || titleDateKey;
    if (byId.has(id) || (contentKey && bySourceOrTitle.has(contentKey))) {
      return;
    }
    byId.add(id);
    if (contentKey) bySourceOrTitle.add(contentKey);
    deduped.push(item);
  });

  return deduped;
}

function buildMeta({ status, itemCount, freshItemCount = 0, updatedAt, lastSuccessfulSync, bundled = false, gmsCount = 0, kmsCount = 0, kmsLimit = 0 }) {
  return {
    lastUpdated: updatedAt,
    lastSuccessfulSync,
    cacheTtlMinutes: CACHE_TTL_MINUTES,
    sourceStatus: status,
    itemCount,
    freshItemCount,
    gmsCount,
    kmsCount,
    kmsLimit,
    canAutoSync: true,
    sourceName: OFFICIAL_SOURCE.sourceName,
    bundledFallback: bundled
  };
}

async function enrichKmsCardImages(items) {
  let remaining = KMS_CARD_IMAGE_ENRICH_LIMIT;

  return Promise.all(
    items.map(async (item) => {
      if (item.region !== "kms" || item.image || !item.sourceUrl || remaining <= 0) {
        return item;
      }

      remaining -= 1;

      try {
        const breakdown = await fetchKmsArticle(item.sourceUrl);
        return {
          ...item,
          image: breakdown.heroImage || item.image || "",
          kmsBreakdown: breakdown
        };
      } catch (error) {
        console.warn(
          "[news-sync] KMS card image enrichment failed.",
          item.sourceUrl,
          error instanceof Error ? error.message : error
        );
        return item;
      }
    })
  );
}

async function refreshNewsFeed({ persistBundled = false } = {}) {
  const existing = memoryFeed ?? (await getBestAvailableFeed()) ?? (await readBundledFeed());
  const previousIds = new Set((existing?.items ?? []).map((item) => String(item.id)));
  const fetchedAt = new Date().toISOString();

  const [newsItems, archivedItems, kmsRssItems] = await Promise.all([
    fetchJson(NEWS_ENDPOINT),
    fetchJson(ARCHIVED_ENDPOINT),
    fetchKmsRss().catch((error) => {
      console.warn("[news-sync] KMST feed fetch failed. Continuing without KMS.", error instanceof Error ? error.message : error);
      return [];
    })
  ]);
  const featuredIds = new Set(
    [...newsItems, ...archivedItems]
      .filter((item) => item && item.featured)
      .map((item) => String(item.id))
  );

  const collected = [];

  kmsRssItems.forEach((item) => {
    const normalized = normalizeKmsItem(item, previousIds, fetchedAt);
    if (normalized?.id) {
      collected.push(normalized);
    }
  });

  [...newsItems, ...archivedItems].forEach((item) => {
    if (!item?.id) {
      return;
    }
    collected.push(normalizeNewsItem(item, featuredIds, previousIds, fetchedAt));
  });

  const enrichedItems = await enrichKmsCardImages(dedupeNewsItems(collected));
  const sortedItems = sortNewsItems(enrichedItems);
  const maxReturnedItems = Math.max(MAX_ITEMS * 2, MAX_ITEMS);
  const items = sortedItems.slice(0, maxReturnedItems);
  const gmsCount = items.filter((item) => item.region === "gms").length;
  const kmsCount = items.filter((item) => item.region === "kms").length;
  const freshItemCount = items.filter((item) => item.isNew).length;

  const payload = {
    items,
    meta: buildMeta({
      status: "fresh",
      itemCount: items.length,
      freshItemCount,
      updatedAt: fetchedAt,
      lastSuccessfulSync: fetchedAt,
      gmsCount,
      kmsCount,
      kmsLimit: kmsRssItems.length
    })
  };

  memoryFeed = payload;
  await writeCacheFeed(payload);

  if (persistBundled) {
    await writeBundledFeed(payload);
  }

  return payload;
}

export async function getNewsFeed({ forceRefresh = false, persistBundled = false } = {}) {
  if (inFlightRefresh && forceRefresh) {
    return inFlightRefresh;
  }

  const baseline = memoryFeed ?? (await getBestAvailableFeed()) ?? EMPTY_FEED;
  memoryFeed = baseline;

  if (!forceRefresh && isFresh(baseline)) {
    return baseline;
  }

  if (!inFlightRefresh) {
    inFlightRefresh = refreshNewsFeed({ persistBundled })
      .catch((error) => {
        const stalePayload = {
          ...baseline,
          meta: {
            ...baseline.meta,
            sourceStatus: baseline.items.length ? "stale" : "error",
            itemCount: baseline.items.length
          }
        };

        memoryFeed = stalePayload;
        console.warn("[news-sync] Returning cached feed after fetch failure.", error instanceof Error ? error.message : error);
        return stalePayload;
      })
      .finally(() => {
        inFlightRefresh = null;
      });
  }

  return inFlightRefresh;
}

export async function getLatestNews(limit = 6) {
  const feed = await getNewsFeed();
  return {
    items: feed.items.slice(0, Math.max(1, limit)),
    meta: feed.meta
  };
}

export async function getNewsItemById(id) {
  const feed = await getNewsFeed();
  return feed.items.find((item) => item.id === String(id)) ?? null;
}
