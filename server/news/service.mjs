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

function buildMeta({ status, itemCount, freshItemCount = 0, updatedAt, lastSuccessfulSync, bundled = false }) {
  return {
    lastUpdated: updatedAt,
    lastSuccessfulSync,
    cacheTtlMinutes: CACHE_TTL_MINUTES,
    sourceStatus: status,
    itemCount,
    freshItemCount,
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

  const deduped = new Map();

  kmsRssItems.forEach((item) => {
    const normalized = normalizeKmsItem(item, previousIds, fetchedAt);
    if (normalized?.id && !deduped.has(normalized.id)) {
      deduped.set(normalized.id, normalized);
    }
  });

  [...newsItems, ...archivedItems].forEach((item) => {
    if (!item?.id || deduped.has(String(item.id))) {
      return;
    }

    deduped.set(String(item.id), normalizeNewsItem(item, featuredIds, previousIds, fetchedAt));
  });

  const enrichedItems = await enrichKmsCardImages([...deduped.values()]);
  const sortedItems = sortNewsItems(enrichedItems);
  const grouped = sortedItems.reduce(
    (acc, item) => {
      const key = item.region === "kms" ? "kms" : "gms";
      acc[key].push(item);
      return acc;
    },
    { gms: [], kms: [] }
  );

  const items = [...grouped.gms.slice(0, MAX_ITEMS), ...grouped.kms.slice(0, MAX_ITEMS)];
  const freshItemCount = items.filter((item) => item.isNew).length;

  const payload = {
    items,
    meta: buildMeta({
      status: "fresh",
      itemCount: items.length,
      freshItemCount,
      updatedAt: fetchedAt,
      lastSuccessfulSync: fetchedAt
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
