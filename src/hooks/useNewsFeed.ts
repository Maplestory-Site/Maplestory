import { useEffect, useMemo, useState } from "react";
import { fallbackNewsFeed, type NewsCategory, type NewsFeed, type NewsRegion } from "../data/newsHub";
import { filterNewsItems, getFeaturedNews, getNewsCategoryCounts, normalizeNewsFeed } from "../lib/newsHub";

export function useNewsFeed(activeCategory: NewsCategory, query: string, region: NewsRegion) {
  const [feed, setFeed] = useState<NewsFeed>(() => normalizeNewsFeed(fallbackNewsFeed));

  useEffect(() => {
    let active = true;

    async function loadFeed() {
      try {
        const response = await fetch("/api/news", {
          headers: {
            Accept: "application/json"
          }
        });

        if (!response.ok) {
          throw new Error(`Failed to load news feed: ${response.status}`);
        }

        const payload = (await response.json()) as NewsFeed;
        const normalized = normalizeNewsFeed(payload);

        if (active && normalized.items.length) {
          setFeed(normalized);
        }
      } catch (error) {
        console.warn("[news-feed] Falling back to bundled feed.", error);
      }
    }

    void loadFeed();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function loadKmsFeed() {
      if (region !== "kms") {
        return;
      }

      try {
        const response = await fetch("/api/kms/feed", {
          headers: {
            Accept: "application/json"
          }
        });

        if (!response.ok) {
          throw new Error(`Failed to load KMS feed: ${response.status}`);
        }

        const payload = (await response.json()) as NewsFeed;
        const normalized = normalizeNewsFeed(payload);

        if (active && normalized.items.length) {
          setFeed((current) => {
            const gmsItems = current.items.filter((item) => item.region === "gms");
            return {
              ...current,
              items: [...gmsItems, ...normalized.items],
              meta: {
                ...current.meta,
                lastUpdated: normalized.meta.lastUpdated || current.meta.lastUpdated
              }
            };
          });
        }
      } catch (error) {
        console.warn("[news-feed] KMS feed unavailable.", error);
      }
    }

    void loadKmsFeed();

    return () => {
      active = false;
    };
  }, [region]);

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
    meta: feed.meta,
    filteredItems,
    featuredItem,
    gridItems,
    categoryCounts
  };
}
