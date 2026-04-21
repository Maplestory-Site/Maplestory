/**
 * IdleStory World loot drops.
 * Monsters produce item drops, but inventory decisions stay in inventorySystem.
 */

import type { DatabaseMonster } from "./gameEngine";
import {
  ITEM_TYPES,
  createItem,
  rollRarity,
  type IdleItemInstance,
  type IdleItemRarity,
  type IdleItemType
} from "./itemSystem";
import type { EncounterType } from "./progressionSystem";

export type MonsterDropProfile = {
  encounterType: EncounterType;
  kills: number;
  dropChance: number;
  rarityBonus: number;
};

export const DROP_CHANCE_BY_ENCOUNTER: Record<EncounterType, number> = {
  normal: 0.08,
  elite: 0.28,
  boss: 1
};

export const RARITY_BONUS_BY_ENCOUNTER: Record<EncounterType, number> = {
  normal: 0,
  elite: 6,
  boss: 14
};

function pickItemType(monster: DatabaseMonster | null): IdleItemType {
  const drops = monster?.dropTable ?? monster?.drops ?? [];
  const text = drops.map((drop) => `${drop.kind} ${drop.name}`).join(" ").toLowerCase();

  if (text.includes("weapon") || text.includes("sword") || text.includes("bow") || text.includes("wand")) return "weapon";
  if (text.includes("helmet") || text.includes("hat") || text.includes("cap")) return "helmet";
  if (text.includes("ring")) return "ring";
  if (text.includes("amulet") || text.includes("pendant") || text.includes("charm")) return "amulet";
  if (text.includes("armor") || text.includes("overall") || text.includes("robe")) return "armor";

  return ITEM_TYPES[Math.floor(Math.random() * ITEM_TYPES.length)] ?? "weapon";
}

function pickNameSeed(monster: DatabaseMonster | null): string | undefined {
  const drops = monster?.dropTable ?? monster?.drops ?? [];
  const usable = drops.find((drop) => drop.name && drop.name.length <= 22);
  if (usable) return usable.name.replace(/[^a-zA-Z0-9 ]/g, "").trim();
  return monster?.name?.split(" ")[0];
}

function forceMinimumRarity(rarity: IdleItemRarity, minimum: IdleItemRarity): IdleItemRarity {
  const order: IdleItemRarity[] = ["common", "rare", "epic", "legendary"];
  return order.indexOf(rarity) < order.indexOf(minimum) ? minimum : rarity;
}

export function getMonsterDropProfile(encounterType: EncounterType, kills: number): MonsterDropProfile {
  return {
    encounterType,
    kills: Math.max(0, kills),
    dropChance: DROP_CHANCE_BY_ENCOUNTER[encounterType],
    rarityBonus: RARITY_BONUS_BY_ENCOUNTER[encounterType]
  };
}

export function generateLootDrops(options: {
  monster: DatabaseMonster | null;
  zoneIndex: number;
  playerLevel: number;
  stage: number;
  normalKills: number;
  eliteKills: number;
  bossKills: number;
  maxDrops?: number;
}): IdleItemInstance[] {
  const {
    monster,
    zoneIndex,
    playerLevel,
    stage,
    normalKills,
    eliteKills,
    bossKills,
    maxDrops = 18
  } = options;

  const drops: IdleItemInstance[] = [];
  const profiles = [
    getMonsterDropProfile("normal", normalKills),
    getMonsterDropProfile("elite", eliteKills),
    getMonsterDropProfile("boss", bossKills)
  ];
  const monsterDropChance = monster?.dropChance;
  const levelRequirement = Math.max(1, Math.min(playerLevel, Math.floor(zoneIndex * 3 + stage / 2)));

  for (const profile of profiles) {
    for (let i = 0; i < profile.kills && drops.length < maxDrops; i += 1) {
      const dropChance = profile.encounterType === "boss" ? 1 : monsterDropChance ?? profile.dropChance;
      if (profile.encounterType !== "boss" && Math.random() > dropChance) continue;

      const type = pickItemType(monster);
      let rarity = rollRarity(zoneIndex, profile.rarityBonus);
      if (profile.encounterType === "elite") rarity = forceMinimumRarity(rarity, "rare");
      if (profile.encounterType === "boss") rarity = forceMinimumRarity(rarity, "epic");

      drops.push(createItem({
        type,
        rarity,
        zoneIndex,
        levelRequirement,
        droppedFrom: monster?.name,
        nameSeed: pickNameSeed(monster)
      }));
    }
  }

  return drops;
}
