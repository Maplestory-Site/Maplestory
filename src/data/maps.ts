export type MapEntry = {
  id: string;
  mapId: number;
  name: string;
  streetName: string;
  region: string;
  regionCode: string;
  image: string;
  imageMedium: string;
  imageLarge: string;
  sourceUrl: string;
};

export type MapFeed = {
  items: MapEntry[];
  meta: {
    sourceName: string;
    sourceUrl: string;
    copyrightLabel: string;
    updatedAt: string;
    syncState: "seeded" | "synced" | "stale" | "error";
    itemCount: number;
  };
};

export type MapMonsterEntry = {
  id: string;
  monsterId: number;
  name: string;
  level: number;
  hp: number;
  image: string | null;
  portrait: string;
};

export type MapDetail = {
  map: {
    id: string;
    mapId: number;
    name: string;
    streetName: string;
    region: string;
    regionCode: string;
    worldMapName: string;
    parentWorld: string;
    avgLevel: number;
    capacityPerGen: number;
    spawnPoints: number;
    image: string;
    imageMedium: string;
    imageLarge: string;
    sourceUrl: string;
  };
  monsters: MapMonsterEntry[];
  meta: {
    sourceName: string;
    sourceUrl: string;
    copyrightLabel: string;
    updatedAt: string;
    monsterCount: number;
  };
};

export const mapFeedFallback: MapFeed = {
  items: [],
  meta: {
    sourceName: "Maplemaps",
    sourceUrl: "https://maplemaps.net/",
    copyrightLabel: "Source: Maplemaps / curated map preview",
    updatedAt: new Date(0).toISOString(),
    syncState: "seeded",
    itemCount: 0,
  },
};
