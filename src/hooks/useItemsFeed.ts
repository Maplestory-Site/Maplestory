import { useEffect, useMemo, useState } from "react";
import type { ItemFeed } from "../data/items";
import { itemFeedFallback } from "../data/items";

export function useItemsFeed() {
  const fallbackFeed = useMemo(() => itemFeedFallback, []);
  const [feed, setFeed] = useState<ItemFeed>(fallbackFeed);

  useEffect(() => {
    let active = true;

    async function loadFeed() {
      const candidates = ["/api/items", "/items-feed.json"];

      for (const url of candidates) {
        try {
          const response = await fetch(url);
          if (!response.ok) {
            continue;
          }

          const payload = (await response.json()) as ItemFeed;
          if (!active) {
            return;
          }

          if (payload.items.length) {
            setFeed(payload);
            return;
          }
        } catch {
          continue;
        }
      }

      if (active) {
        setFeed(fallbackFeed);
      }
    }

    loadFeed();

    return () => {
      active = false;
    };
  }, [fallbackFeed]);

  return feed;
}
