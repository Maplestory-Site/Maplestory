/**
 * IdleStory World loot drops.
 * Monsters produce item drops, but inventory decisions stay in inventorySystem.
 */

import type { DatabaseMonster } from "./gameEngine";
import {
  ITEM_TYPES,
  RARITY_ORDER,
  createItem,
  rollRarity,
  type CraftMaterialId,
  type IdleItemInstance,
  type IdleItemRarity,
  type IdleItemType
} from "./itemSystem";
import type { EncounterType } from "./progressionSystem";
import { createItemCollectionKey } from "./collectionSystem";
import { defaultRng, type RngFn } from "./seededRng";

export type MonsterDropProfile = {
  encounterType: EncounterType;
  kills: number;
  dropChance: number;
  rarityBonus: number;
  rareDropChance: number;
};

export type MaterialDropBundle = Partial<Record<CraftMaterialId, number>>;

export const DROP_CHANCE_BY_ENCOUNTER: Record<EncounterType, number> = {
  normal: 0.05,
  elite: 0.24,
  boss: 1
};

export const RARITY_BONUS_BY_ENCOUNTER: Record<EncounterType, number> = {
  normal: 0,
  elite: 8,
  boss: 18
};

export const RARE_DROP_CHANCE_BY_ENCOUNTER: Record<EncounterType, number> = {
  normal: 0.02,
  elite: 0.11,
  boss: 0.32
};

function pickItemType(monster: DatabaseMonster | null, rng: RngFn = defaultRng): IdleItemType {
  const drops = monster?.dropTable ?? monster?.drops ?? [];
  const text = drops.map((drop) => `${drop.kind} ${drop.name}`).join(" ").toLowerCase();

  if (text.includes("weapon") || text.includes("sword") || text.includes("bow") || text.includes("wand")) return "weapon";
  if (text.includes("helmet") || text.includes("hat") || text.includes("cap")) return "helmet";
  if (text.includes("ring")) return "ring";
  if (text.includes("amulet") || text.includes("pendant") || text.includes("charm")) return "amulet";
  if (text.includes("armor") || text.includes("overall") || text.includes("robe")) return "armor";

  return ITEM_TYPES[Math.floor(rng() * ITEM_TYPES.length)] ?? "weapon";
}

function pickDrop(monster: DatabaseMonster | null, rng: RngFn = defaultRng): { name: string; kind: string; rarity?: string } | null {
  const drops = monster?.dropTable ?? monster?.drops ?? [];
  if (!drops.length) return null;
  const weightedDrops = drops as Array<{ name: string; kind: string; rarity?: string; weight?: number }>;
  const totalWeight = weightedDrops.reduce((sum, drop) => sum + (drop.weight ?? 1), 0);
  let roll = rng() * Math.max(1, totalWeight);
  for (const drop of weightedDrops) {
    roll -= drop.weight ?? 1;
    if (roll <= 0) return { name: drop.name, kind: drop.kind, rarity: drop.rarity };
  }
  const fallback = weightedDrops[0];
  return fallback ? { name: fallback.name, kind: fallback.kind, rarity: fallback.rarity } : null;
}

function isIdleItemType(value: string | undefined): value is IdleItemType {
  return Boolean(value && ITEM_TYPES.includes(value as IdleItemType));
}

function pickNameSeed(monster: DatabaseMonster | null): string | undefined {
  const drops = monster?.dropTable ?? monster?.drops ?? [];
  const usable = drops.find((drop) => drop.name && drop.name.length <= 22);
  if (usable) return usable.name.replace(/[^a-zA-Z0-9 ]/g, "").trim();
  return monster?.name?.split(" ")[0];
}

function forceMinimumRarity(rarity: IdleItemRarity, minimum: IdleItemRarity): IdleItemRarity {
  return RARITY_ORDER.indexOf(rarity) < RARITY_ORDER.indexOf(minimum) ? minimum : rarity;
}

function normalizeDropRarity(value: string | undefined): IdleItemRarity | null {
  if (!value) return null;
  const lowered = value.toLowerCase().trim();
  if (lowered === "common") return "common";
  if (lowered === "uncommon") return "uncommon";
  if (lowered === "rare") return "rare";
  if (lowered === "epic") return "epic";
  if (lowered === "legendary") return "legendary";
  return null;
}

export function getMonsterDropProfile(encounterType: EncounterType, kills: number): MonsterDropProfile {
  return {
    encounterType,
    kills: Math.max(0, kills),
    dropChance: DROP_CHANCE_BY_ENCOUNTER[encounterType],
    rarityBonus: RARITY_BONUS_BY_ENCOUNTER[encounterType],
    rareDropChance: RARE_DROP_CHANCE_BY_ENCOUNTER[encounterType]
  };
}

function upgradeRarity(rarity: IdleItemRarity): IdleItemRarity {
  if (rarity === "common") return "uncommon";
  if (rarity === "uncommon") return "rare";
  if (rarity === "rare") return "epic";
  return "legendary";
}

export function generateLootDrops(options: {
  monster: DatabaseMonster | null;
  zoneIndex: number;
  playerLevel: number;
  stage: number;
  normalKills: number;
  eliteKills: number;
  bossKills: number;
  dropChanceMultiplier?: number;
  rarityBonusExtra?: number;
  maxDrops?: number;
  rng?: RngFn;
}): IdleItemInstance[] {
  const {
    monster,
    zoneIndex,
    playerLevel,
    stage,
    normalKills,
    eliteKills,
    bossKills,
    dropChanceMultiplier = 1,
    rarityBonusExtra = 0,
    maxDrops = 14,
    rng = defaultRng
  } = options;

  const drops: IdleItemInstance[] = [];
  const profiles = [
    getMonsterDropProfile("normal", normalKills),
    getMonsterDropProfile("elite", eliteKills),
    getMonsterDropProfile("boss", bossKills)
  ];
  const monsterDropChance = monster?.dropChance;
  const levelRequirement = Math.max(
    1,
    Math.min(playerLevel + 2, Math.floor(zoneIndex * 2.4 + stage / 3))
  );
  const zoneDropScalar = 0.92 + Math.min(0.45, zoneIndex * 0.012);

  for (const profile of profiles) {
    for (let i = 0; i < profile.kills && drops.length < maxDrops; i += 1) {
      const baseChance = profile.encounterType === "boss" ? 1 : monsterDropChance ?? profile.dropChance;
      const dropChance = Math.min(1, baseChance * dropChanceMultiplier * zoneDropScalar);
      if (profile.encounterType !== "boss" && rng() > dropChance) continue;

      const pickedDrop = pickDrop(monster, rng);
      const type = isIdleItemType(pickedDrop?.kind) ? pickedDrop.kind : pickItemType(monster, rng);
      let rarity = rollRarity(zoneIndex, profile.rarityBonus + rarityBonusExtra, rng);
      const dropRarityHint = normalizeDropRarity(pickedDrop?.rarity);
      if (dropRarityHint) {
        rarity = forceMinimumRarity(rarity, dropRarityHint);
      }

      const rareDropTriggered =
        profile.encounterType === "boss" ||
        rng() < Math.min(0.58, profile.rareDropChance + zoneIndex * 0.0075 + rarityBonusExtra * 0.004);

      if (profile.encounterType === "elite") {
        rarity = forceMinimumRarity(rarity, zoneIndex >= 10 ? "rare" : "uncommon");
      }
      if (profile.encounterType === "boss") {
        rarity = forceMinimumRarity(rarity, zoneIndex >= 16 ? "epic" : "rare");
      }
      if (rareDropTriggered && profile.encounterType !== "boss") {
        rarity = forceMinimumRarity(upgradeRarity(rarity), "uncommon");
      }
      const setDropBonus =
        (profile.encounterType === "boss" ? 0.26 : profile.encounterType === "elite" ? 0.1 : 0)
        + (rareDropTriggered ? 0.05 : 0);

      const item = createItem({
        type,
        rarity,
        zoneIndex,
        levelRequirement,
        droppedFrom: monster?.name,
        nameSeed: pickNameSeed(monster),
        rareDropBoost: rareDropTriggered ? 1 : 0,
        setDropBonus,
        forceUnique: profile.encounterType === "boss" && zoneIndex >= 6 && rng() < 0.04
      });

      drops.push({
        ...item,
        collectionKey: createItemCollectionKey(pickedDrop?.name ?? item.name, type),
        collectionName: pickedDrop?.name ?? item.name
      });
    }
  }

  return drops;
}

export function generateMaterialDrops(options: {
  zoneIndex: number;
  normalKills: number;
  eliteKills: number;
  bossKills: number;
  rng?: RngFn;
}): MaterialDropBundle {
  const rng = options.rng ?? defaultRng;
  const zoneIndex = Math.max(1, Math.floor(options.zoneIndex));
  const normalKills = Math.max(0, Math.floor(options.normalKills));
  const eliteKills = Math.max(0, Math.floor(options.eliteKills));
  const bossKills = Math.max(0, Math.floor(options.bossKills));

  const shardFromNormals = Math.floor(
    normalKills * (0.045 + Math.min(0.06, zoneIndex * 0.0008))
    + rng() * Math.min(2, normalKills * 0.02)
  );
  const shardFromElites = Math.floor(
    eliteKills * (1.15 + Math.min(1.1, zoneIndex * 0.02))
    + rng() * (1 + eliteKills * 0.28)
  );
  const shardFromBosses = Math.floor(
    bossKills * (4 + Math.min(6, zoneIndex * 0.16))
    + rng() * (2 + bossKills * 0.45)
  );

  const essenceFromElites = Math.floor(
    eliteKills * (0.2 + Math.min(0.24, zoneIndex * 0.0022))
    + rng() * Math.min(2, eliteKills * 0.18)
  );
  const essenceFromBosses = Math.floor(
    bossKills * (1.2 + Math.min(1.5, zoneIndex * 0.021))
    + rng() * Math.max(1, bossKills * 0.45)
  );

  const crystalFromBosses = Math.floor(
    bossKills * (0.38 + Math.min(0.6, zoneIndex * 0.008))
    + rng() * Math.min(2, bossKills * 0.32)
  );

  const bossCoreFromBosses = Math.floor(
    bossKills * (0.12 + Math.min(0.22, zoneIndex * 0.0025))
    + rng() * Math.min(1, bossKills * 0.2)
  );

  const drops: MaterialDropBundle = {};
  const shardTotal = Math.max(0, shardFromNormals + shardFromElites + shardFromBosses);
  const essenceTotal = Math.max(0, essenceFromElites + essenceFromBosses);
  const crystalTotal = Math.max(0, crystalFromBosses);
  const bossCoreTotal = Math.max(0, bossCoreFromBosses);

  if (shardTotal > 0) drops.shard = shardTotal;
  if (essenceTotal > 0) drops.essence = essenceTotal;
  if (crystalTotal > 0) drops.crystal = crystalTotal;
  if (bossCoreTotal > 0) drops.bossCore = bossCoreTotal;
  return drops;
}

