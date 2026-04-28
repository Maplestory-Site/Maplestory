import { fallbackNewsFeed, type NewsFeed } from "../data/newsHub";
import { normalizeNewsFeed } from "./newsHub";
import { safeFetchJson } from "./safeJsonFetch";

export type NewsFeedLoadResult = {
  error: string | null;
  feed: NewsFeed;
  fetchedAt: string;
  fromFallback: boolean;
  stale: boolean;
};

type LoadNewsFeedOptions = {
  fetchImpl?: typeof fetch;
  force?: boolean;
  signal?: AbortSignal;
  timeoutMs?: number;
};

const FEED_CACHE_MS = 5 * 60 * 1000;
const KMS_CACHE_MS = 10 * 60 * 1000;
const normalizedFallback = normalizeNewsFeed(fallbackNewsFeed);

let cachedFeed: NewsFeed | null = null;
let cachedFeedAt = 0;
let inFlightFeed: Promise<NewsFeedLoadResult> | null = null;
let cachedKmsFeed: NewsFeed | null = null;
let cachedKmsFeedAt = 0;
let inFlightKmsFeed: Promise<NewsFeedLoadResult> | null = null;

export function getFallbackNewsFeed() {
  return normalizedFallback;
}

export function clearNewsFeedClientCache() {
  cachedFeed = null;
  cachedFeedAt = 0;
  inFlightFeed = null;
  cachedKmsFeed = null;
  cachedKmsFeedAt = 0;
  inFlightKmsFeed = null;
}

export async function loadNewsFeed(options: LoadNewsFeedOptions = {}): Promise<NewsFeedLoadResult> {
  return loadFeedWithCache("/api/news", "main", FEED_CACHE_MS, options);
}

export async function loadKmsNewsFeed(options: LoadNewsFeedOptions = {}): Promise<NewsFeedLoadResult> {
  return loadFeedWithCache("/api/kms/feed", "kms", KMS_CACHE_MS, options);
}

function isValidFeed(payload: Partial<NewsFeed> | null | undefined): payload is NewsFeed {
  return Boolean(payload?.meta && Array.isArray(payload.items));
}

function readCache(kind: "main" | "kms") {
  return kind === "main"
    ? { feed: cachedFeed, fetchedAt: cachedFeedAt, inFlight: inFlightFeed }
    : { feed: cachedKmsFeed, fetchedAt: cachedKmsFeedAt, inFlight: inFlightKmsFeed };
}

function writeCache(kind: "main" | "kms", feed: NewsFeed | null, fetchedAt: number, inFlight: Promise<NewsFeedLoadResult> | null) {
  if (kind === "main") {
    cachedFeed = feed;
    cachedFeedAt = fetchedAt;
    inFlightFeed = inFlight;
    return;
  }
  cachedKmsFeed = feed;
  cachedKmsFeedAt = fetchedAt;
  inFlightKmsFeed = inFlight;
}

async function loadFeedWithCache(
  url: string,
  kind: "main" | "kms",
  ttlMs: number,
  { fetchImpl, force = false, signal, timeoutMs = 10000 }: LoadNewsFeedOptions
): Promise<NewsFeedLoadResult> {
  const cache = readCache(kind);
  const now = Date.now();

  if (!force && cache.feed && now - cache.fetchedAt < ttlMs) {
    return {
      error: null,
      feed: cache.feed,
      fetchedAt: new Date(cache.fetchedAt).toISOString(),
      fromFallback: false,
      stale: false
    };
  }

  if (!force && cache.inFlight) {
    return cache.inFlight;
  }

  const request = safeFetchJson<NewsFeed>(url, {
    fallback: cache.feed ?? normalizedFallback,
    fetchImpl,
    signal,
    timeoutMs
  })
    .then((result): NewsFeedLoadResult => {
      const usedFallbackCandidate = !isValidFeed(result.data);
      const candidate = usedFallbackCandidate ? cache.feed ?? normalizedFallback : result.data;
      const normalized = normalizeNewsFeed(candidate);
      const valid = isValidFeed(normalized);
      const stale = !result.ok && Boolean(cache.feed);
      const feed = valid ? normalized : cache.feed ?? normalizedFallback;
      const fetchedAt = Date.now();

      if (valid && result.ok && !usedFallbackCandidate) {
        writeCache(kind, feed, fetchedAt, null);
      }

      return {
        error: result.ok && !usedFallbackCandidate ? null : result.error || "News feed payload was malformed.",
        feed,
        fetchedAt: new Date(fetchedAt).toISOString(),
        fromFallback: !result.ok || usedFallbackCandidate || !valid,
        stale
      };
    })
    .finally(() => {
      writeCache(kind, readCache(kind).feed, readCache(kind).fetchedAt, null);
    });

  writeCache(kind, cache.feed, cache.fetchedAt, request);
  return request;
}
