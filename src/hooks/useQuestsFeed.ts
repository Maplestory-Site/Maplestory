import { useEffect, useMemo, useState } from "react";
import type { QuestFeed } from "../data/quests";
import { questFeedFallback } from "../data/quests";

export function useQuestsFeed() {
  const fallbackFeed = useMemo(() => questFeedFallback, []);
  const [feed, setFeed] = useState<QuestFeed>(fallbackFeed);

  useEffect(() => {
    let active = true;

    async function loadFeed() {
      const candidates = ["/api/quests", "/quests-feed.json"];

      for (const url of candidates) {
        try {
          const response = await fetch(url);
          if (!response.ok) continue;
          const payload = (await response.json()) as QuestFeed;
          if (!active) return;
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
