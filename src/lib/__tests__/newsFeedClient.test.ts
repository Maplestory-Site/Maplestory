import { beforeEach, describe, expect, it, vi } from "vitest";
import { fallbackNewsFeed, type NewsFeed } from "../../data/newsHub";
import {
  clearNewsFeedClientCache,
  getFallbackNewsFeed,
  loadKmsNewsFeed,
  loadNewsFeed
} from "../newsFeedClient";

function makeFeed(title = "Live Patch Notes"): NewsFeed {
  return {
    items: [
      {
        id: "live-1",
        title,
        category: "patch-notes",
        region: "gms",
        publishedAt: "2026-04-20T10:00:00.000Z",
        summary: "Fresh official update.",
        sourceName: "Nexon",
        sourceUrl: "https://www.nexon.com/news/live-1",
        copyrightLabel: "Official",
        fetchedAt: "2026-04-20T10:01:00.000Z"
      }
    ],
    meta: {
      lastUpdated: "2026-04-20T10:01:00.000Z",
      lastSuccessfulSync: "2026-04-20T10:01:00.000Z",
      cacheTtlMinutes: 5,
      sourceStatus: "fresh",
      itemCount: 1,
      canAutoSync: true
    }
  };
}

describe("newsFeedClient", () => {
  beforeEach(() => {
    clearNewsFeedClientCache();
  });

  it("loads and normalizes a valid API feed", async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify(makeFeed()), { status: 200 })) as unknown as typeof fetch;

    const result = await loadNewsFeed({ fetchImpl });

    expect(result.error).toBeNull();
    expect(result.fromFallback).toBe(false);
    expect(result.feed.items[0]?.title).toBe("Live Patch Notes");
  });

  it("falls back safely when the API payload is malformed", async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ broken: true }), { status: 200 })) as unknown as typeof fetch;

    const result = await loadNewsFeed({ fetchImpl });

    expect(result.fromFallback).toBe(true);
    expect(result.feed.items.length).toBeGreaterThan(0);
  });

  // ─── Spec'd scenarios: API failure / fallback / manual refresh / KMS failure ──

  it("API failure (HTTP 500) returns fromFallback=true with bundled JSON items", async () => {
    const fetchImpl = vi.fn(
      async () => new Response("upstream exploded", { status: 500 })
    ) as unknown as typeof fetch;

    const result = await loadNewsFeed({ fetchImpl });

    expect(result.fromFallback).toBe(true);
    expect(result.error).toBeTruthy();
    // The bundled feed JSON should be present so the page stays usable.
    expect(result.feed.items.length).toBeGreaterThan(0);
    expect(result.feed.items.length).toBe(getFallbackNewsFeed().items.length);
  });

  it("API failure (network error) returns fromFallback=true without throwing", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    }) as unknown as typeof fetch;

    const result = await loadNewsFeed({ fetchImpl });

    expect(result.fromFallback).toBe(true);
    expect(result.feed.items.length).toBeGreaterThan(0);
  });

  it("bundled fallback JSON is the same shape the hook expects (items + meta)", () => {
    // Lock the contract: if the JSON file ever drifts, this test fails fast.
    const bundled = getFallbackNewsFeed();
    expect(bundled).toBe(getFallbackNewsFeed()); // memoised — same identity
    expect(Array.isArray(bundled.items)).toBe(true);
    expect(bundled.meta).toMatchObject({
      sourceStatus: expect.any(String),
      cacheTtlMinutes: expect.any(Number),
      canAutoSync: expect.any(Boolean)
    });
    // The exported `fallbackNewsFeed` and the normalised getter agree on items
    expect(bundled.items.length).toBe(fallbackNewsFeed.items.length);
  });

  it("manual refresh (force=true) bypasses cache and re-hits the network", async () => {
    let call = 0;
    const fetchImpl = vi.fn(async () => {
      call += 1;
      return new Response(JSON.stringify(makeFeed(`Pass-${call}`)), { status: 200 });
    }) as unknown as typeof fetch;

    const first = await loadNewsFeed({ fetchImpl });
    expect(first.feed.items[0]?.title).toBe("Pass-1");

    // Without force=true the cache should serve the same payload.
    const cached = await loadNewsFeed({ fetchImpl });
    expect(cached.feed.items[0]?.title).toBe("Pass-1");
    expect(fetchImpl).toHaveBeenCalledTimes(1);

    // With force=true the cache MUST be bypassed.
    const refreshed = await loadNewsFeed({ fetchImpl, force: true });
    expect(refreshed.feed.items[0]?.title).toBe("Pass-2");
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("KMS feed failure returns fromFallback=true and does not poison the main cache", async () => {
    // Prime the main cache with a successful response.
    const okMain = vi.fn(
      async () => new Response(JSON.stringify(makeFeed("Main-OK")), { status: 200 })
    ) as unknown as typeof fetch;
    await loadNewsFeed({ fetchImpl: okMain });

    // KMS endpoint then fails — should fall back gracefully.
    const failKms = vi.fn(
      async () => new Response("kms down", { status: 503 })
    ) as unknown as typeof fetch;

    const kmsResult = await loadKmsNewsFeed({ fetchImpl: failKms });

    expect(kmsResult.fromFallback).toBe(true);
    // Verify the main feed cache is still intact and unaffected.
    const stillCached = await loadNewsFeed({ fetchImpl: okMain });
    expect(stillCached.feed.items[0]?.title).toBe("Main-OK");
    expect(okMain).toHaveBeenCalledTimes(1); // cache hit on second call
  });

  it("KMS feed network error is non-fatal", async () => {
    const failKms = vi.fn(async () => {
      throw new Error("DNS lookup failed");
    }) as unknown as typeof fetch;

    const result = await loadKmsNewsFeed({ fetchImpl: failKms });

    expect(result.fromFallback).toBe(true);
    expect(result.error).toBeTruthy();
    // Must still return a usable feed shape.
    expect(Array.isArray(result.feed.items)).toBe(true);
    expect(result.feed.meta).toBeTruthy();
  });

  it("deduplicates overlapping requests", async () => {
    let releaseResponse: (() => void) | undefined;
    const fetchImpl = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          releaseResponse = () => resolve(new Response(JSON.stringify(makeFeed("Deduped Feed")), { status: 200 }));
        })
    ) as unknown as typeof fetch;

    const first = loadNewsFeed({ fetchImpl });
    const second = loadNewsFeed({ fetchImpl });
    releaseResponse?.();

    const results = await Promise.all([first, second]);

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(results[0].feed.items[0]?.title).toBe("Deduped Feed");
    expect(results[1].feed.items[0]?.title).toBe("Deduped Feed");
  });
});
