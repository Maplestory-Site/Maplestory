/**
 * IdleStory World collection / codex progression.
 *
 * Tracks monster and item discoveries and grants small evergreen completion
 * bonuses that encourage long-term play without breaking balance.
 */

import { MAP_MONSTER_CONTENT, type MapMonster } from "./monsterSystem";
import type { IdleItemInstance } from "./itemSystem";

export type CollectionEntry = {
  key: string;
  name: string;
  discoveredAt: number;
  lastSeenAt: number;
  copies: number;
  sourceMapId?: string;
  rarity?: string;
};

export type CollectionState = {
  monsters: Record<string, CollectionEntry>;
  items: Record<string, CollectionEntry>;
};

export type CollectionProgress = {
  discovered: number;
  total: number;
  percent: number;
};

export type CollectionBonuses = {
  xpMult: number;
  goldMult: number;
  dpsMult: number;
};

type CollectibleItemTemplate = {
  key: string;
  name: string;
  type: string;
  rarity: string;
  sourceMapId: string;
};

export const DEFAULT_COLLECTION_STATE: CollectionState = {
  monsters: {},
  items: {}
};

const ALL_COLLECTIBLE_MONSTERS: MapMonster[] = MAP_MONSTER_CONTENT.flatMap((map) => [
  ...map.monsterPool,
  map.eliteMonster,
  map.bossMonster
]);

const ALL_COLLECTIBLE_ITEMS: CollectibleItemTemplate[] = Array.from(
  new Map(
    ALL_COLLECTIBLE_MONSTERS.flatMap((monster) =>
      (monster.dropTable ?? []).map((drop) => {
        const key = createItemCollectionKey(drop.name, drop.kind);
        return [
          key,
          {
            key,
            name: drop.name,
            type: drop.kind,
            rarity: drop.rarity,
            sourceMapId: monster.mapId
          } satisfies CollectibleItemTemplate
        ] as const;
      })
    )
  ).values()
);

function upsertEntry(
  current: Record<string, CollectionEntry>,
  key: string,
  patch: Omit<CollectionEntry, "copies"> & { copies?: number }
): Record<string, CollectionEntry> {
  const now = patch.lastSeenAt;
  const existing = current[key];
  return {
    ...current,
    [key]: existing
      ? {
          ...existing,
          lastSeenAt: now,
          copies: existing.copies + (patch.copies ?? 1)
        }
      : {
          ...patch,
          copies: patch.copies ?? 1
        }
  };
}

export function createItemCollectionKey(name: string, type: string): string {
  return `${type.trim().toLowerCase()}::${name.trim().toLowerCase()}`;
}

export function discoverMonster(
  collection: CollectionState | undefined,
  monster: Pick<MapMonster, "id" | "name"> & Partial<Pick<MapMonster, "mapId" | "rarity">> | null | undefined,
  discoveredAt = Date.now()
): CollectionState {
  if (!monster) return collection ?? DEFAULT_COLLECTION_STATE;
  const base = collection ?? DEFAULT_COLLECTION_STATE;
  return {
    ...base,
    monsters: upsertEntry(base.monsters, monster.id, {
      key: monster.id,
      name: monster.name,
      discoveredAt,
      lastSeenAt: discoveredAt,
      sourceMapId: monster.mapId,
      rarity: monster.rarity ?? "common"
    })
  };
}

export function discoverMonsters(
  collection: CollectionState | undefined,
  monsters: Array<(Pick<MapMonster, "id" | "name"> & Partial<Pick<MapMonster, "mapId" | "rarity">>) | null | undefined>,
  discoveredAt = Date.now()
): CollectionState {
  return monsters.reduce(
    (state, monster) => discoverMonster(state, monster, discoveredAt),
    collection ?? DEFAULT_COLLECTION_STATE
  );
}

export function discoverItems(
  collection: CollectionState | undefined,
  items: IdleItemInstance[],
  discoveredAt = Date.now()
): CollectionState {
  const base = collection ?? DEFAULT_COLLECTION_STATE;
  if (!items.length) return base;

  const nextItems = items.reduce((acc, item) => {
    const key = item.collectionKey ?? createItemCollectionKey(item.collectionName ?? item.name, item.type);
    const displayName = item.collectionName ?? item.name;
    return upsertEntry(acc, key, {
      key,
      name: displayName,
      discoveredAt,
      lastSeenAt: discoveredAt,
      sourceMapId: undefined,
      rarity: item.rarity
    });
  }, base.items);

  return { ...base, items: nextItems };
}

export function getMonsterCollectionProgress(collection: CollectionState | undefined): CollectionProgress {
  const discovered = Object.keys(collection?.monsters ?? {}).length;
  const total = ALL_COLLECTIBLE_MONSTERS.length;
  return {
    discovered,
    total,
    percent: total ? Math.round((discovered / total) * 100) : 0
  };
}

export function getItemCollectionProgress(collection: CollectionState | undefined): CollectionProgress {
  const discovered = Object.keys(collection?.items ?? {}).length;
  const total = ALL_COLLECTIBLE_ITEMS.length;
  return {
    discovered,
    total,
    percent: total ? Math.round((discovered / total) * 100) : 0
  };
}

export function getCollectionBonuses(collection: CollectionState | undefined): CollectionBonuses {
  const monsterProgress = getMonsterCollectionProgress(collection);
  const itemProgress = getItemCollectionProgress(collection);
  const monsterMilestones = Math.floor(monsterProgress.percent / 10);
  const itemMilestones = Math.floor(itemProgress.percent / 10);
  const totalMilestones = Math.floor((monsterMilestones + itemMilestones) / 2);

  return {
    xpMult: 1 + monsterMilestones * 0.0125,
    goldMult: 1 + itemMilestones * 0.0125,
    dpsMult: 1 + totalMilestones * 0.005
  };
}

export function getTotalCollectibleMonsterCount(): number {
  return ALL_COLLECTIBLE_MONSTERS.length;
}

export function getTotalCollectibleItemCount(): number {
  return ALL_COLLECTIBLE_ITEMS.length;
}
