import { useEffect, useMemo, useState } from "react";
import type { PetFeed } from "../data/pets";
import { petFeedFallback } from "../data/pets";

export function usePetsFeed() {
  const fallbackFeed = useMemo(() => petFeedFallback, []);
  const [feed, setFeed] = useState<PetFeed>(fallbackFeed);

  useEffect(() => {
    let active = true;

    async function loadFeed() {
      const candidates = ["/api/pets", "/pets-feed.json"];

      for (const url of candidates) {
        try {
          const response = await fetch(url);
          if (!response.ok) {
            continue;
          }

          const payload = (await response.json()) as PetFeed;
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
