import { useEffect, useMemo, useState } from "react";
import { fallbackNewsFeed, type NewsCategory, type NewsFeed } from "../data/newsHub";
import { filterNewsItems, getFeaturedNews, getNewsCategoryCounts, normalizeNewsFeed } from "../lib/newsHub";

export function useNewsFeed(activeCategory: NewsCategory, query: string) {
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

        if (active) {
          setFeed(normalizeNewsFeed(payload));
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

  const filteredItems = useMemo(() => filterNewsItems(feed.items, activeCategory, query), [feed.items, activeCategory, query]);
  const featuredItem = useMemo(() => getFeaturedNews(filteredItems), [filteredItems]);
  const gridItems = useMemo(
    () => filteredItems.filter((item) => item.id !== featuredItem?.id),
    [filteredItems, featuredItem]
  );
  const categoryCounts = useMemo(() => getNewsCategoryCounts(feed.items), [feed.items]);

  return {
    meta: feed.meta,
    filteredItems,
    featuredItem,
    gridItems,
    categoryCounts
  };
}
