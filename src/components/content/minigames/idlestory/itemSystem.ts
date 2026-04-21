/**
 * IdleStory World item definitions and stat rolling.
 * Pure loot logic only; no React or browser APIs.
 */

export type IdleItemType = "weapon" | "armor" | "helmet" | "ring" | "amulet";
export type IdleItemRarity = "common" | "rare" | "epic" | "legendary";
export type IdleElement = "neutral" | "fire" | "ice" | "lightning" | "holy" | "shadow";

export type IdleItemStats = {
  attack: number;
  defense: number;
  hp: number;
  critChance: number;
  critDamage: number;
  attackSpeed: number;
};

export type IdleItemInstance = {
  id: string;
  name: string;
  type: IdleItemType;
  rarity: IdleItemRarity;
  levelRequirement: number;
  zoneIndex: number;
  stats: IdleItemStats;
  setId?: string;
  element?: IdleElement;
  enhanceLevel: number;
  droppedFrom?: string;
  createdAt: number;
};

export type EquippedItems = Partial<Record<IdleItemType, IdleItemInstance>>;

export type RarityConfig = {
  statMultiplier: number;
  dropWeight: number;
};

export const ITEM_TYPES: IdleItemType[] = ["weapon", "armor", "helmet", "ring", "amulet"];

export const RARITY_CONFIG: Record<IdleItemRarity, RarityConfig> = {
  common: { statMultiplier: 1, dropWeight: 60 },
  rare: { statMultiplier: 1.35, dropWeight: 25 },
  epic: { statMultiplier: 1.85, dropWeight: 10 },
  legendary: { statMultiplier: 2.6, dropWeight: 5 }
};

export const EMPTY_EQUIPMENT: EquippedItems = {
  weapon: undefined,
  armor: undefined,
  helmet: undefined,
  ring: undefined,
  amulet: undefined
};

const BASE_STATS: Record<IdleItemType, IdleItemStats> = {
  weapon: { attack: 9, defense: 0, hp: 0, critChance: 0.03, critDamage: 0.12, attackSpeed: 0.04 },
  armor: { attack: 1, defense: 7, hp: 45, critChance: 0, critDamage: 0, attackSpeed: 0 },
  helmet: { attack: 2, defense: 4, hp: 25, critChance: 0.01, critDamage: 0.04, attackSpeed: 0 },
  ring: { attack: 4, defense: 1, hp: 10, critChance: 0.025, critDamage: 0.08, attackSpeed: 0.02 },
  amulet: { attack: 3, defense: 2, hp: 18, critChance: 0.015, critDamage: 0.1, attackSpeed: 0.015 }
};

const TYPE_NAMES: Record<IdleItemType, string[]> = {
  weapon: ["Blade", "Wand", "Bow", "Dagger"],
  armor: ["Coat", "Plate", "Robe", "Guard"],
  helmet: ["Cap", "Helm", "Hood", "Crown"],
  ring: ["Ring", "Band", "Loop", "Seal"],
  amulet: ["Amulet", "Charm", "Pendant", "Medal"]
};

const ELEMENTS: IdleElement[] = ["neutral", "fire", "ice", "lightning", "holy", "shadow"];

export function getEmptyStats(): IdleItemStats {
  return { attack: 0, defense: 0, hp: 0, critChance: 0, critDamage: 0, attackSpeed: 0 };
}

export function addItemStats(a: IdleItemStats, b: IdleItemStats): IdleItemStats {
  return {
    attack: a.attack + b.attack,
    defense: a.defense + b.defense,
    hp: a.hp + b.hp,
    critChance: a.critChance + b.critChance,
    critDamage: a.critDamage + b.critDamage,
    attackSpeed: a.attackSpeed + b.attackSpeed
  };
}

export function rollRarity(zoneIndex: number, rarityBonus = 0): IdleItemRarity {
  const zoneBonus = Math.max(0, zoneIndex - 1) * 1.8 + rarityBonus;
  const weights: Array<[IdleItemRarity, number]> = [
    ["common", Math.max(25, RARITY_CONFIG.common.dropWeight - zoneBonus * 2.1)],
    ["rare", RARITY_CONFIG.rare.dropWeight + zoneBonus],
    ["epic", RARITY_CONFIG.epic.dropWeight + zoneBonus * 0.75],
    ["legendary", RARITY_CONFIG.legendary.dropWeight + zoneBonus * 0.35]
  ];
  const total = weights.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = Math.random() * total;

  for (const [rarity, weight] of weights) {
    roll -= weight;
    if (roll <= 0) return rarity;
  }

  return "common";
}

export function createItem(options: {
  type: IdleItemType;
  rarity: IdleItemRarity;
  zoneIndex: number;
  levelRequirement: number;
  droppedFrom?: string;
  nameSeed?: string;
}): IdleItemInstance {
  const { type, rarity, zoneIndex, levelRequirement, droppedFrom, nameSeed } = options;
  const base = BASE_STATS[type];
  const rarityMult = RARITY_CONFIG[rarity].statMultiplier;
  const zoneMult = Math.pow(Math.max(1, zoneIndex), 1.3);
  const levelMult = 1 + Math.max(0, levelRequirement - 1) * 0.055;
  const variation = 0.8 + Math.random() * 0.4;
  const scale = rarityMult * zoneMult * levelMult * variation;
  const suffix = TYPE_NAMES[type][Math.floor(Math.random() * TYPE_NAMES[type].length)] ?? "Relic";
  const element = ELEMENTS[Math.floor(Math.random() * ELEMENTS.length)] ?? "neutral";
  const rarityTitle = rarity[0].toUpperCase() + rarity.slice(1);

  return {
    id: `${type}-${rarity}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    name: `${rarityTitle} ${nameSeed ? `${nameSeed} ` : ""}${suffix}`,
    type,
    rarity,
    levelRequirement,
    zoneIndex,
    element,
    setId: rarity === "legendary" || rarity === "epic" ? `${element}-maple` : undefined,
    enhanceLevel: 0,
    droppedFrom,
    createdAt: Date.now(),
    stats: {
      attack: Math.max(0, Math.floor(base.attack * scale)),
      defense: Math.max(0, Math.floor(base.defense * scale)),
      hp: Math.max(0, Math.floor(base.hp * scale)),
      critChance: Number((base.critChance * rarityMult * variation).toFixed(4)),
      critDamage: Number((base.critDamage * rarityMult * variation).toFixed(4)),
      attackSpeed: Number((base.attackSpeed * rarityMult * variation).toFixed(4))
    }
  };
}

export function getItemPower(item: IdleItemInstance): number {
  const stats = item.stats;
  return (
    stats.attack * 4 +
    stats.defense * 1.6 +
    stats.hp * 0.18 +
    stats.critChance * 220 +
    stats.critDamage * 110 +
    stats.attackSpeed * 170
  ) * (1 + item.enhanceLevel * 0.08);
}

export function enhanceItem(item: IdleItemInstance): IdleItemInstance {
  const nextLevel = item.enhanceLevel + 1;
  const mult = 1 + nextLevel * 0.08;

  return {
    ...item,
    enhanceLevel: nextLevel,
    stats: {
      attack: Math.floor(item.stats.attack * mult),
      defense: Math.floor(item.stats.defense * mult),
      hp: Math.floor(item.stats.hp * mult),
      critChance: Number((item.stats.critChance * (1 + nextLevel * 0.025)).toFixed(4)),
      critDamage: Number((item.stats.critDamage * (1 + nextLevel * 0.035)).toFixed(4)),
      attackSpeed: Number((item.stats.attackSpeed * (1 + nextLevel * 0.02)).toFixed(4))
    }
  };
}
