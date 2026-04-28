import { useCallback, useEffect, useMemo, useState } from "react";
import type { NewsCategory, NewsFeed, NewsRegion } from "../data/newsHub";
import { getFallbackNewsFeed, loadKmsNewsFeed, loadNewsFeed } from "../lib/newsFeedClient";
import { filterNewsItems, getFeaturedNews, getNewsCategoryCounts, normalizeNewsFeed } from "../lib/newsHub";

export function useNewsFeed(activeCategory: NewsCategory, query: string, region: NewsRegion) {
  const [feed, setFeed] = useState<NewsFeed>(() => getFallbackNewsFeed());
  const [requestVersion, setRequestVersion] = useState(0);
  const [status, setStatus] = useState({
    error: null as string | null,
    isLoading: true,
    isRefreshing: false,
    isStale: false,
    isUsingFallback: true,
    lastFetchedAt: ""
  });

  const refresh = useCallback(() => {
    setRequestVersion((current) => current + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function loadFeed() {
      setStatus((current) => ({
        ...current,
        error: null,
        isLoading: current.lastFetchedAt ? current.isLoading : true,
        isRefreshing: Boolean(current.lastFetchedAt)
      }));

      try {
        const result = await loadNewsFeed({
          force: requestVersion > 0,
          signal: controller.signal
        });

        if (controller.signal.aborted) return;
        setFeed(result.feed);
        setStatus({
          error: result.error,
          isLoading: false,
          isRefreshing: false,
          isStale: result.stale || result.feed.meta.sourceStatus === "stale",
          isUsingFallback: result.fromFallback || Boolean(result.feed.meta.bundledFallback),
          lastFetchedAt: result.fetchedAt
        });
      } catch (error) {
        if (controller.signal.aborted) return;
        const message = error instanceof Error ? error.message : "Failed to load news feed.";
        console.warn("[news-feed] Falling back to bundled feed.", error);
        setStatus((current) => ({
          ...current,
          error: message,
          isLoading: false,
          isRefreshing: false,
          isStale: true,
          isUsingFallback: true
        }));
      }
    }

    void loadFeed();

    return () => {
      controller.abort();
    };
  }, [requestVersion]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadKmsFeed() {
      if (region !== "kms") return;

      try {
        const result = await loadKmsNewsFeed({
          force: requestVersion > 0,
          signal: controller.signal,
          timeoutMs: 12000
        });

        if (controller.signal.aborted || !result.feed.items.length) return;
        const normalized = normalizeNewsFeed(result.feed);

        setFeed((current) => {
          const gmsItems = current.items.filter((item) => item.region === "gms");
          return {
            ...current,
            items: [...gmsItems, ...normalized.items],
            meta: {
              ...current.meta,
              lastSuccessfulSync: normalized.meta.lastSuccessfulSync || current.meta.lastSuccessfulSync,
              lastUpdated: normalized.meta.lastUpdated || current.meta.lastUpdated
            }
          };
        });
      } catch (error) {
        if (controller.signal.aborted) return;
        console.warn("[news-feed] KMS feed unavailable.", error);
      }
    }

    void loadKmsFeed();

    return () => {
      controller.abort();
    };
  }, [region, requestVersion]);

  const filteredItems = useMemo(
    () => filterNewsItems(feed.items, activeCategory, query, region),
    [feed.items, activeCategory, query, region]
  );
  const featuredItem = useMemo(() => getFeaturedNews(filteredItems), [filteredItems]);
  const gridItems = useMemo(
    () => filteredItems.filter((item) => item.id !== featuredItem?.id),
    [filteredItems, featuredItem]
  );
  const categoryCounts = useMemo(() => getNewsCategoryCounts(feed.items, region), [feed.items, region]);

  return {
    ...status,
    // Spec-compatible aliases (loading, isFallback). The hook predates the
    // spec and historically used `isLoading` / `isUsingFallback`; consumers
    // can use either name. Do not remove the originals — NewsPage.tsx and
    // any external consumers still depend on them.
    loading: status.isLoading,
    isFallback: status.isUsingFallback,
    categoryCounts,
    featuredItem,
    filteredItems,
    gridItems,
    meta: feed.meta,
    refresh
  };
}
