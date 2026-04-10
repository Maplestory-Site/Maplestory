export type QuestEntry = {
  id: string;
  pageId: number;
  pageTitle: string;
  name: string;
  category: string;
  categories: string[];
  levelBracket: number | null;
  summary: string;
  notes: string[];
  image: string | null;
  imageTitle: string | null;
  wikiUrl: string;
};

export type QuestDetail = {
  quest: QuestEntry;
  requirements: string[];
  rewards: string[];
  npcs: string[];
  maps: string[];
  steps: string[];
  nextQuests: string[];
  notes: string[];
};

export type QuestFeed = {
  items: QuestEntry[];
  meta: {
    sourceName: string;
    sourceUrl: string;
    copyrightLabel: string;
    updatedAt: string;
    syncState: "seeded" | "synced" | "stale" | "error";
    itemCount: number;
  };
};

export const questFeedFallback: QuestFeed = {
  items: [],
  meta: {
    sourceName: "MapleStory Fandom",
    sourceUrl: "https://maplestory.fandom.com/wiki/Quests",
    copyrightLabel: "Source: MapleStory Fandom / curated quest preview",
    updatedAt: new Date(0).toISOString(),
    syncState: "seeded",
    itemCount: 0,
  },
};
