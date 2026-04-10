import { useEffect, useMemo, useState } from "react";
import type { MonsterEntry, MonsterFeed } from "../data/monsters";
import { getMonsterFeedFallback } from "../lib/monsters";

function mergeMonsterItem(primary: MonsterEntry, fallback?: MonsterEntry): MonsterEntry {
  if (!fallback) return primary;

  return {
    ...primary,
    image: primary.image || fallback.image,
    portrait: primary.portrait || fallback.portrait,
    type: fallback.isBoss ? fallback.type : primary.type,
    category: fallback.category || primary.category,
    description:
      fallback.description && fallback.description !== "MapleStory monster entry."
        ? fallback.description
        : primary.description,
    shortDescription:
      fallback.shortDescription && fallback.shortDescription !== "MapleStory monster entry."
        ? fallback.shortDescription
        : primary.shortDescription,
    weaknesses: fallback.weaknesses.length ? fallback.weaknesses : primary.weaknesses,
    drops: fallback.drops.length ? fallback.drops : primary.drops,
    locations: fallback.locations.length ? fallback.locations : primary.locations,
    isBoss: fallback.isBoss || primary.isBoss,
    isElite: fallback.isElite || primary.isElite,
    farmingScore: fallback.farmingScore > primary.farmingScore ? fallback.farmingScore : primary.farmingScore,
    farmingTier: fallback.farmingTags.length ? fallback.farmingTier : primary.farmingTier,
    farmingTags: fallback.farmingTags.length ? fallback.farmingTags : primary.farmingTags,
    farmingReason:
      fallback.farmingReason && fallback.farmingReason !== "Steady farming route."
        ? fallback.farmingReason
        : primary.farmingReason,
  };
}

function mergeMonsterFeed(payload: MonsterFeed, fallbackFeed: MonsterFeed): MonsterFeed {
  const fallbackMap = new Map(fallbackFeed.items.map((item) => [item.id, item]));
  const mergedItems = payload.items.map((item) => mergeMonsterItem(item, fallbackMap.get(item.id)));

  for (const item of fallbackFeed.items) {
    if (!mergedItems.some((entry) => entry.id === item.id)) {
      mergedItems.push(item);
    }
  }

  return {
    ...payload,
    items: mergedItems,
    meta: {
      ...payload.meta,
      itemCount: mergedItems.length,
    },
  };
}

export function useMonstersFeed() {
  const fallbackFeed = useMemo(() => getMonsterFeedFallback(), []);
  const [feed, setFeed] = useState<MonsterFeed>(fallbackFeed);

  useEffect(() => {
    let active = true;

    async function loadFeed() {
      const candidates = ["/api/monsters", "/monsters-feed.json"];

      for (const url of candidates) {
        try {
          const response = await fetch(url);
          if (!response.ok) {
            continue;
          }

          const payload = (await response.json()) as MonsterFeed;
          if (!active) {
            return;
          }

          if (payload.items.length >= fallbackFeed.items.length) {
            setFeed(mergeMonsterFeed(payload, fallbackFeed));
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
