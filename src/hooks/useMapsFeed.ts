import { useEffect, useMemo, useState } from "react";
import type { MapFeed } from "../data/maps";
import { mapFeedFallback } from "../data/maps";

export function useMapsFeed() {
  const fallbackFeed = useMemo(() => mapFeedFallback, []);
  const [feed, setFeed] = useState<MapFeed>(fallbackFeed);

  useEffect(() => {
    let active = true;

    async function loadFeed() {
      const candidates = ["/api/maps", "/maps-feed.json"];

      for (const url of candidates) {
        try {
          const response = await fetch(url);
          if (!response.ok) {
            continue;
          }

          const payload = (await response.json()) as MapFeed;
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
