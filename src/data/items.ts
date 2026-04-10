export type ItemType = "Equipment" | "Usable" | "Etc" | "Cash" | "Set-up" | "Pet";
export type ItemRarity = "Common" | "Rare" | "Epic";

export type ItemEntry = {
  id: string;
  name: string;
  image: string | null;
  imageFile?: string | null;
  type: ItemType;
  category: string;
  rarity: ItemRarity;
  level: number | null;
  description: string;
  effect: string;
  sourceMonsters: string[];
  rewardSources: string[];
  npcSources: string[];
  craftSources: string[];
  sourceCount: number;
  wikiUrl: string;
};

export type ItemFeed = {
  items: ItemEntry[];
  meta: {
    sourceName: string;
    sourceUrl: string;
    copyrightLabel: string;
    updatedAt: string;
    syncState: "seeded" | "synced" | "stale" | "error";
    itemCount: number;
  };
};

export const itemFeedFallback: ItemFeed = {
  items: [],
  meta: {
    sourceName: "MapleStory Fandom",
    sourceUrl: "https://maplestory.fandom.com/wiki/Item",
    copyrightLabel: "Source: MapleStory Fandom / curated item preview",
    updatedAt: new Date(0).toISOString(),
    syncState: "seeded",
    itemCount: 0,
  },
};
