export type PetEntry = {
  id: string;
  name: string;
  category: string;
  image: string | null;
  summary: string;
  tags: string[];
  sourceUrl: string;
};

export type PetFeed = {
  items: PetEntry[];
  meta: {
    sourceName: string;
    sourceUrl: string;
    copyrightLabel: string;
    updatedAt: string;
    syncState: "seeded" | "synced" | "stale" | "error";
    itemCount: number;
  };
};

export const petFeedFallback: PetFeed = {
  items: [],
  meta: {
    sourceName: "StrategyWiki",
    sourceUrl: "https://strategywiki.org/wiki/MapleStory/Pets",
    copyrightLabel: "Source: StrategyWiki / curated pet preview",
    updatedAt: new Date(0).toISOString(),
    syncState: "seeded",
    itemCount: 0,
  },
};
