/**
 * IdleStory World item definitions and stat rolling.
 * Pure loot logic only; no React or browser APIs.
 */

import { normalizeItemSetId, rollItemSetId } from "./setSystem";
import { type RngFn, defaultRng } from "./seededRng";

export type IdleItemType = "weapon" | "armor" | "helmet" | "ring" | "amulet";
export type IdleItemCategory = "weapon" | "armor" | "accessory";
export type IdleItemRarity = "common" | "uncommon" | "rare" | "epic" | "legendary";
export type IdleElement = "neutral" | "fire" | "ice" | "lightning" | "holy" | "shadow";
export type CraftMaterialId = "shard" | "essence" | "crystal" | "bossCore";
export type CraftingMaterials = Record<CraftMaterialId, number>;
export type MaterialCost = Partial<Record<CraftMaterialId, number>>;
export type RerollMode = "all" | "prefix" | "suffix";
export type CraftRecipeId = "rare_cache" | "epic_cache";
export type CraftRecipeDefinition = {
  id: CraftRecipeId;
  label: string;
  description: string;
  targetRarity: IdleItemRarity;
  mesosCost: number;
  materials: CraftingMaterials;
};
export type IdleItemAffixKey =
  | "damage_pct"
  | "crit_chance_pct"
  | "attack_speed_pct"
  | "gold_gain_pct"
  | "xp_gain_pct"
  | "flat_attack"
  | "flat_defense"
  | "flat_hp"
  | "crit_damage_pct";

export type IdleItemAffix = {
  id: string;
  key: IdleItemAffixKey;
  label: string;
  value: number;
  display: string;
};

export type IdleItemStats = {
  attack: number;
  defense: number;
  hp: number;
  critChance: number;
  critDamage: number;
  attackSpeed: number;
  damageMultiplier: number;
  goldMultiplier: number;
  xpMultiplier: number;
};

export type IdleItemInstance = {
  id: string;
  databaseId?: string;
  mapleId?: string;
  name: string;
  description?: string;
  icon?: string;
  image?: string;
  fallbackIcon?: string;
  type: IdleItemType;
  category: IdleItemCategory;
  slot?: IdleItemType;
  rarity: IdleItemRarity;
  level: number;
  levelRequirement: number;
  zoneIndex: number;
  baseStats: IdleItemStats;
  bonusStats?: Partial<IdleItemStats>;
  affixes: IdleItemAffix[];
  stats: IdleItemStats;
  value: number;
  sellValue?: number;
  setId?: string;
  setName?: string;
  element?: IdleElement;
  prefix?: string;
  suffix?: string;
  upgradeLevel?: number;
  enhancementLevel?: number;
  starForce?: number;
  potentialLines?: string[];
  isUnique?: boolean;
  isRareDrop?: boolean;
  isNew?: boolean;
  isLocked?: boolean;
  isFavorite?: boolean;
  tradeable?: boolean;
  bound?: boolean;
  qualityRoll?: number;
  collectionKey?: string;
  collectionName?: string;
  source?: string;
  dropSource?: string;
  databaseCategory?: string;
  databaseType?: string;
  databaseUrl?: string;
  tags?: string[];
  enhanceLevel: number;
  rerollCount: number;
  droppedFrom?: string;
  createdAt: number;
};

export type EquippedItems = Partial<Record<IdleItemType, IdleItemInstance>>;

export type RarityConfig = {
  statMultiplier: number;
  dropWeight: number;
  minAffixes: number;
  maxAffixes: number;
  valueMultiplier: number;
};

export const ITEM_TYPES: IdleItemType[] = ["weapon", "armor", "helmet", "ring", "amulet"];
export const RARITY_ORDER: IdleItemRarity[] = ["common", "uncommon", "rare", "epic", "legendary"];

export const RARITY_CONFIG: Record<IdleItemRarity, RarityConfig> = {
  common: { statMultiplier: 1, dropWeight: 55, minAffixes: 0, maxAffixes: 1, valueMultiplier: 1 },
  uncommon: { statMultiplier: 1.18, dropWeight: 28, minAffixes: 1, maxAffixes: 2, valueMultiplier: 1.45 },
  rare: { statMultiplier: 1.42, dropWeight: 12, minAffixes: 2, maxAffixes: 2, valueMultiplier: 2.25 },
  epic: { statMultiplier: 1.9, dropWeight: 4.2, minAffixes: 2, maxAffixes: 3, valueMultiplier: 3.8 },
  legendary: { statMultiplier: 2.45, dropWeight: 0.9, minAffixes: 3, maxAffixes: 4, valueMultiplier: 6.4 }
};

export const MAX_ITEM_ENHANCE_LEVEL = 12;
export const MAX_ITEM_REROLLS = 24;

export const EMPTY_CRAFTING_MATERIALS: CraftingMaterials = {
  shard: 0,
  essence: 0,
  crystal: 0,
  bossCore: 0
};

export const EMPTY_EQUIPMENT: EquippedItems = {
  weapon: undefined,
  armor: undefined,
  helmet: undefined,
  ring: undefined,
  amulet: undefined
};

const BASE_STATS: Record<IdleItemType, IdleItemStats> = {
  weapon: {
    attack: 9,
    defense: 0,
    hp: 0,
    critChance: 0.03,
    critDamage: 0.12,
    attackSpeed: 0.04,
    damageMultiplier: 0,
    goldMultiplier: 0,
    xpMultiplier: 0
  },
  armor: {
    attack: 1,
    defense: 7,
    hp: 45,
    critChance: 0,
    critDamage: 0,
    attackSpeed: 0,
    damageMultiplier: 0,
    goldMultiplier: 0,
    xpMultiplier: 0
  },
  helmet: {
    attack: 2,
    defense: 4,
    hp: 25,
    critChance: 0.01,
    critDamage: 0.04,
    attackSpeed: 0,
    damageMultiplier: 0,
    goldMultiplier: 0,
    xpMultiplier: 0
  },
  ring: {
    attack: 4,
    defense: 1,
    hp: 10,
    critChance: 0.025,
    critDamage: 0.08,
    attackSpeed: 0.02,
    damageMultiplier: 0,
    goldMultiplier: 0,
    xpMultiplier: 0
  },
  amulet: {
    attack: 3,
    defense: 2,
    hp: 18,
    critChance: 0.015,
    critDamage: 0.1,
    attackSpeed: 0.015,
    damageMultiplier: 0,
    goldMultiplier: 0,
    xpMultiplier: 0
  }
};

const TYPE_NAMES: Record<IdleItemType, string[]> = {
  weapon: ["Blade", "Wand", "Bow", "Dagger"],
  armor: ["Coat", "Plate", "Robe", "Guard"],
  helmet: ["Cap", "Helm", "Hood", "Crown"],
  ring: ["Ring", "Band", "Loop", "Seal"],
  amulet: ["Amulet", "Charm", "Pendant", "Medal"]
};

const TYPE_CATEGORY: Record<IdleItemType, IdleItemCategory> = {
  weapon: "weapon",
  armor: "armor",
  helmet: "armor",
  ring: "accessory",
  amulet: "accessory"
};

const ELEMENTS: IdleElement[] = ["neutral", "fire", "ice", "lightning", "holy", "shadow"];

const UNIQUE_ITEM_NAMES: Partial<Record<IdleItemType, string[]>> = {
  weapon: ["Dawnsplitter", "Ashwing Saber", "Fablethorn Bow"],
  armor: ["Starwoven Aegis", "Rootguard Mail"],
  helmet: ["Crown of Echoes", "Mushking Visor"],
  ring: ["Whisper Loop", "Stormpetal Ring"],
  amulet: ["Heart of Henesys", "Skyroot Pendant"]
};

const RARITY_ENHANCE_COST_MULT: Record<IdleItemRarity, number> = {
  common: 1,
  uncommon: 1.22,
  rare: 1.55,
  epic: 2.1,
  legendary: 2.95
};

const RARITY_REROLL_COST_MULT: Record<IdleItemRarity, number> = {
  common: 1,
  uncommon: 1.3,
  rare: 1.7,
  epic: 2.35,
  legendary: 3.2
};

const CRAFT_RECIPES: Record<CraftRecipeId, CraftRecipeDefinition> = {
  rare_cache: {
    id: "rare_cache",
    label: "Rare Cache",
    description: "Forge one random rare item.",
    targetRarity: "rare",
    mesosCost: 1800,
    materials: { shard: 30, essence: 7, crystal: 0, bossCore: 0 }
  },
  epic_cache: {
    id: "epic_cache",
    label: "Epic Cache",
    description: "Forge one random epic item.",
    targetRarity: "epic",
    mesosCost: 6200,
    materials: { shard: 68, essence: 22, crystal: 3, bossCore: 1 }
  }
};

type AffixDefinition = {
  key: IdleItemAffixKey;
  label: string;
  minValue: number;
  maxValue: number;
  levelGrowth: number;
  percent: boolean;
  cap?: number;
  categoryBias?: IdleItemCategory[];
  apply: (stats: IdleItemStats, amount: number) => IdleItemStats;
};

const AFFIX_POOL: AffixDefinition[] = [
  {
    key: "damage_pct",
    label: "Damage",
    minValue: 0.012,
    maxValue: 0.042,
    levelGrowth: 0.004,
    percent: true,
    cap: 0.2,
    apply: (stats, amount) => ({ ...stats, damageMultiplier: Number((stats.damageMultiplier + amount).toFixed(4)) })
  },
  {
    key: "crit_chance_pct",
    label: "Crit Chance",
    minValue: 0.006,
    maxValue: 0.026,
    levelGrowth: 0.003,
    percent: true,
    cap: 0.14,
    categoryBias: ["weapon", "accessory"],
    apply: (stats, amount) => ({ ...stats, critChance: Number((stats.critChance + amount).toFixed(4)) })
  },
  {
    key: "attack_speed_pct",
    label: "Attack Speed",
    minValue: 0.01,
    maxValue: 0.035,
    levelGrowth: 0.0035,
    percent: true,
    cap: 0.2,
    categoryBias: ["weapon", "accessory"],
    apply: (stats, amount) => ({ ...stats, attackSpeed: Number((stats.attackSpeed + amount).toFixed(4)) })
  },
  {
    key: "gold_gain_pct",
    label: "Gold Gain",
    minValue: 0.012,
    maxValue: 0.032,
    levelGrowth: 0.003,
    percent: true,
    cap: 0.18,
    categoryBias: ["accessory", "armor"],
    apply: (stats, amount) => ({ ...stats, goldMultiplier: Number((stats.goldMultiplier + amount).toFixed(4)) })
  },
  {
    key: "xp_gain_pct",
    label: "XP Gain",
    minValue: 0.004,
    maxValue: 0.015,
    levelGrowth: 0.0019,
    percent: true,
    cap: 0.08,
    categoryBias: ["accessory"],
    apply: (stats, amount) => ({ ...stats, xpMultiplier: Number((stats.xpMultiplier + amount).toFixed(4)) })
  },
  {
    key: "flat_attack",
    label: "Attack",
    minValue: 2.5,
    maxValue: 8.5,
    levelGrowth: 0.08,
    percent: false,
    categoryBias: ["weapon", "accessory"],
    apply: (stats, amount) => ({ ...stats, attack: Math.max(0, Math.floor(stats.attack + amount)) })
  },
  {
    key: "flat_defense",
    label: "Defense",
    minValue: 2.8,
    maxValue: 8.2,
    levelGrowth: 0.075,
    percent: false,
    categoryBias: ["armor"],
    apply: (stats, amount) => ({ ...stats, defense: Math.max(0, Math.floor(stats.defense + amount)) })
  },
  {
    key: "flat_hp",
    label: "HP",
    minValue: 14,
    maxValue: 38,
    levelGrowth: 0.18,
    percent: false,
    categoryBias: ["armor"],
    apply: (stats, amount) => ({ ...stats, hp: Math.max(0, Math.floor(stats.hp + amount)) })
  },
  {
    key: "crit_damage_pct",
    label: "Crit Damage",
    minValue: 0.02,
    maxValue: 0.06,
    levelGrowth: 0.0036,
    percent: true,
    cap: 0.35,
    categoryBias: ["weapon", "accessory"],
    apply: (stats, amount) => ({ ...stats, critDamage: Number((stats.critDamage + amount).toFixed(4)) })
  }
];

const AFFIX_TITLE_BY_KEY: Record<IdleItemAffixKey, string> = {
  damage_pct: "Savage",
  crit_chance_pct: "Keen",
  attack_speed_pct: "Swift",
  gold_gain_pct: "Prosperous",
  xp_gain_pct: "Scholar",
  flat_attack: "Honed",
  flat_defense: "Fortified",
  flat_hp: "Stalwart",
  crit_damage_pct: "Ruthless"
};

const AFFIX_SUFFIX_BY_KEY: Record<IdleItemAffixKey, string> = {
  damage_pct: "of Ruin",
  crit_chance_pct: "of Precision",
  attack_speed_pct: "of Haste",
  gold_gain_pct: "of Fortune",
  xp_gain_pct: "of Insight",
  flat_attack: "of Striking",
  flat_defense: "of Bulwarks",
  flat_hp: "of Giants",
  crit_damage_pct: "of Execution"
};

function toFiniteNumber(value: unknown, fallback = 0): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function randomToken(length = 7, rng: RngFn = defaultRng): string {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  let token = "";
  for (let i = 0; i < length; i += 1) {
    token += alphabet[Math.floor(rng() * alphabet.length)] ?? "0";
  }
  return token;
}

// Monotonic counter ensures item IDs are globally unique even when
// multiple items are created within the same millisecond (batch loot drops).
let _itemIdCounter = 0;
export function generateItemId(type: string, rarity: string): string {
  _itemIdCounter = (_itemIdCounter + 1) % 0x7fffffff;
  return `${type}-${rarity}-${Date.now().toString(36)}-${_itemIdCounter.toString(36)}`;
}

function toPositiveInt(value: unknown, fallback: number): number {
  return Math.max(1, Math.floor(toFiniteNumber(value, fallback)));
}

function randomBetween(min: number, max: number, rng: RngFn = defaultRng): number {
  return min + rng() * Math.max(0, max - min);
}

function categoryForType(type: IdleItemType): IdleItemCategory {
  return TYPE_CATEGORY[type] ?? "weapon";
}

function normalizeRarity(value: unknown): IdleItemRarity {
  if (typeof value === "string" && RARITY_ORDER.includes(value as IdleItemRarity)) {
    return value as IdleItemRarity;
  }
  return "common";
}

function normalizeItemType(value: unknown): IdleItemType {
  if (typeof value === "string" && ITEM_TYPES.includes(value as IdleItemType)) {
    return value as IdleItemType;
  }
  return "weapon";
}

function normalizeStatValue(value: unknown): number {
  const numeric = toFiniteNumber(value, 0);
  return Math.max(0, numeric);
}

function normalizeMaterialValue(value: unknown): number {
  const numeric = toFiniteNumber(value, 0);
  return Math.max(0, Math.floor(numeric));
}

function clampRerollCount(value: unknown): number {
  return Math.max(0, Math.floor(toFiniteNumber(value, 0)));
}

export function getEmptyStats(): IdleItemStats {
  return {
    attack: 0,
    defense: 0,
    hp: 0,
    critChance: 0,
    critDamage: 0,
    attackSpeed: 0,
    damageMultiplier: 0,
    goldMultiplier: 0,
    xpMultiplier: 0
  };
}

export function normalizeItemStats(input?: Partial<IdleItemStats> | null): IdleItemStats {
  const source = input ?? {};
  return {
    attack: Math.floor(normalizeStatValue(source.attack)),
    defense: Math.floor(normalizeStatValue(source.defense)),
    hp: Math.floor(normalizeStatValue(source.hp)),
    critChance: Number(normalizeStatValue(source.critChance).toFixed(4)),
    critDamage: Number(normalizeStatValue(source.critDamage).toFixed(4)),
    attackSpeed: Number(normalizeStatValue(source.attackSpeed).toFixed(4)),
    damageMultiplier: Number(normalizeStatValue(source.damageMultiplier).toFixed(4)),
    goldMultiplier: Number(normalizeStatValue(source.goldMultiplier).toFixed(4)),
    xpMultiplier: Number(normalizeStatValue(source.xpMultiplier).toFixed(4))
  };
}

export function addItemStats(a: IdleItemStats, b: IdleItemStats): IdleItemStats {
  return normalizeItemStats({
    attack: a.attack + b.attack,
    defense: a.defense + b.defense,
    hp: a.hp + b.hp,
    critChance: a.critChance + b.critChance,
    critDamage: a.critDamage + b.critDamage,
    attackSpeed: a.attackSpeed + b.attackSpeed,
    damageMultiplier: a.damageMultiplier + b.damageMultiplier,
    goldMultiplier: a.goldMultiplier + b.goldMultiplier,
    xpMultiplier: a.xpMultiplier + b.xpMultiplier
  });
}

export function normalizeCraftingMaterials(
  materials?: Partial<Record<CraftMaterialId, number>>
): CraftingMaterials {
  return {
    shard: normalizeMaterialValue(materials?.shard),
    essence: normalizeMaterialValue(materials?.essence),
    crystal: normalizeMaterialValue(materials?.crystal),
    bossCore: normalizeMaterialValue(materials?.bossCore)
  };
}

export function mergeCraftingMaterials(
  ...bundles: Array<Partial<Record<CraftMaterialId, number>> | undefined>
): CraftingMaterials {
  return bundles.reduce<CraftingMaterials>((acc, bundle) => ({
    shard: acc.shard + normalizeMaterialValue(bundle?.shard),
    essence: acc.essence + normalizeMaterialValue(bundle?.essence),
    crystal: acc.crystal + normalizeMaterialValue(bundle?.crystal),
    bossCore: acc.bossCore + normalizeMaterialValue(bundle?.bossCore)
  }), { ...EMPTY_CRAFTING_MATERIALS });
}

export function hasMaterialCost(materials: CraftingMaterials, cost: MaterialCost): boolean {
  const normalizedMaterials = normalizeCraftingMaterials(materials);
  return (
    normalizedMaterials.shard >= normalizeMaterialValue(cost.shard) &&
    normalizedMaterials.essence >= normalizeMaterialValue(cost.essence) &&
    normalizedMaterials.crystal >= normalizeMaterialValue(cost.crystal) &&
    normalizedMaterials.bossCore >= normalizeMaterialValue(cost.bossCore)
  );
}

export function subtractMaterialCost(materials: CraftingMaterials, cost: MaterialCost): CraftingMaterials {
  const normalizedMaterials = normalizeCraftingMaterials(materials);
  return {
    shard: Math.max(0, normalizedMaterials.shard - normalizeMaterialValue(cost.shard)),
    essence: Math.max(0, normalizedMaterials.essence - normalizeMaterialValue(cost.essence)),
    crystal: Math.max(0, normalizedMaterials.crystal - normalizeMaterialValue(cost.crystal)),
    bossCore: Math.max(0, normalizedMaterials.bossCore - normalizeMaterialValue(cost.bossCore))
  };
}

function buildBaseStats(type: IdleItemType, rarity: IdleItemRarity, zoneIndex: number, level: number, variation: number): IdleItemStats {
  const rarityMult = RARITY_CONFIG[rarity].statMultiplier;
  const zoneMult = Math.pow(Math.max(1, zoneIndex), 1.18);
  const levelMult = 1 + Math.max(0, level - 1) * 0.047;
  const scale = rarityMult * zoneMult * levelMult * variation;
  const base = BASE_STATS[type];

  return normalizeItemStats({
    attack: base.attack * scale,
    defense: base.defense * scale,
    hp: base.hp * scale,
    critChance: base.critChance * rarityMult * variation,
    critDamage: base.critDamage * rarityMult * variation,
    attackSpeed: base.attackSpeed * rarityMult * variation,
    damageMultiplier: 0,
    goldMultiplier: 0,
    xpMultiplier: 0
  });
}

function rollAffixCount(rarity: IdleItemRarity, zoneIndex: number, rng: RngFn = defaultRng): number {
  const config = RARITY_CONFIG[rarity];
  let count = config.minAffixes;
  while (count < config.maxAffixes) {
    const chance = Math.min(0.85, 0.35 + zoneIndex * 0.012 + count * 0.09);
    if (rng() > chance) break;
    count += 1;
  }
  return count;
}

function rollAffixValue(definition: AffixDefinition, level: number, rarity: IdleItemRarity, rng: RngFn = defaultRng): number {
  const rarityTier = RARITY_ORDER.indexOf(rarity);
  const rarityScale = 1 + rarityTier * 0.11;
  const levelScale = 1 + Math.max(0, level - 1) * definition.levelGrowth;
  const rolled = randomBetween(definition.minValue, definition.maxValue, rng) * rarityScale * levelScale;
  const withCap = definition.cap ? Math.min(definition.cap, rolled) : rolled;
  return definition.percent ? Number(withCap.toFixed(4)) : Math.max(1, Math.round(withCap));
}

function formatAffixDisplay(definition: AffixDefinition, value: number): string {
  if (definition.percent) {
    return `+${Math.round(value * 100)}% ${definition.label}`;
  }
  return `+${Math.round(value)} ${definition.label}`;
}

function pickAffixPool(category: IdleItemCategory): AffixDefinition[] {
  const biased = AFFIX_POOL.filter((affix) => affix.categoryBias?.includes(category));
  const neutral = AFFIX_POOL.filter((affix) => !affix.categoryBias);
  return [...biased, ...neutral];
}

function rollAffixes(type: IdleItemType, rarity: IdleItemRarity, level: number, rng: RngFn = defaultRng): IdleItemAffix[] {
  const category = categoryForType(type);
  const candidatePool = pickAffixPool(category);
  const affixCount = rollAffixCount(rarity, level, rng);
  const selected: IdleItemAffix[] = [];
  const usedKeys = new Set<IdleItemAffixKey>();

  while (selected.length < affixCount && usedKeys.size < candidatePool.length) {
    const candidate = candidatePool[Math.floor(rng() * candidatePool.length)];
    if (!candidate || usedKeys.has(candidate.key)) continue;
    usedKeys.add(candidate.key);

    const value = rollAffixValue(candidate, level, rarity, rng);
    selected.push({
      id: `${candidate.key}-${selected.length + 1}`,
      key: candidate.key,
      label: candidate.label,
      value,
      display: formatAffixDisplay(candidate, value)
    });
  }

  return selected;
}

function applyAffixesToStats(baseStats: IdleItemStats, affixes: IdleItemAffix[]): IdleItemStats {
  let next = normalizeItemStats(baseStats);
  for (const affix of affixes) {
    const definition = AFFIX_POOL.find((entry) => entry.key === affix.key);
    if (!definition) continue;
    next = normalizeItemStats(definition.apply(next, affix.value));
  }
  return next;
}

function buildItemName(type: IdleItemType, rarity: IdleItemRarity, affixes: IdleItemAffix[], nameSeed?: string, isUnique?: boolean, rng: RngFn = defaultRng): string {
  const typeNames = TYPE_NAMES[type] ?? TYPE_NAMES.weapon;
  const core = typeNames[Math.floor(rng() * typeNames.length)] ?? "Relic";
  const descriptor = affixes[0] ? AFFIX_TITLE_BY_KEY[affixes[0].key] : "";
  const suffix = affixes[1] ? AFFIX_SUFFIX_BY_KEY[affixes[1].key] : "";
  const seed = nameSeed?.trim();
  const rarityTitle = rarity[0].toUpperCase() + rarity.slice(1);
  if (isUnique) return `${rarityTitle} ${seed ? `${seed} ` : ""}${core}`.trim();
  return `${descriptor ? `${descriptor} ` : ""}${seed ? `${seed} ` : ""}${core}${suffix ? ` ${suffix}` : ""}`.trim();
}

function calculateItemValue(stats: IdleItemStats, rarity: IdleItemRarity, level: number, zoneIndex: number, enhanceLevel: number): number {
  const weightedPower =
    stats.attack * 4.1 +
    stats.defense * 1.8 +
    stats.hp * 0.2 +
    stats.critChance * 220 +
    stats.critDamage * 118 +
    stats.attackSpeed * 175 +
    stats.damageMultiplier * 260 +
    stats.goldMultiplier * 90 +
    stats.xpMultiplier * 120;
  const baseValue = 22 + level * 14 + zoneIndex * 24 + weightedPower * 0.44;
  const rarityMult = RARITY_CONFIG[rarity].valueMultiplier;
  const enhancementMult = 1 + Math.max(0, enhanceLevel) * 0.11;
  return Math.max(8, Math.floor(baseValue * rarityMult * enhancementMult));
}

export function rollRarity(zoneIndex: number, rarityBonus = 0, rng: RngFn = defaultRng): IdleItemRarity {
  const zoneBonus = Math.max(0, zoneIndex - 1) * 1.6 + rarityBonus;
  const weights: Array<[IdleItemRarity, number]> = [
    ["common", Math.max(18, RARITY_CONFIG.common.dropWeight - zoneBonus * 1.8)],
    ["uncommon", Math.max(10, RARITY_CONFIG.uncommon.dropWeight + zoneBonus * 0.72)],
    ["rare", Math.max(2.5, RARITY_CONFIG.rare.dropWeight + zoneBonus * 0.42)],
    ["epic", Math.max(0.8, RARITY_CONFIG.epic.dropWeight + zoneBonus * 0.2)],
    ["legendary", Math.max(0.1, RARITY_CONFIG.legendary.dropWeight + zoneBonus * 0.07)]
  ];
  const total = weights.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = rng() * total;

  for (const [rarity, weight] of weights) {
    roll -= weight;
    if (roll <= 0) return rarity;
  }

  return "common";
}

export function normalizeItemAffix(value: unknown): IdleItemAffix | null {
  if (!value || typeof value !== "object") return null;
  const parsed = value as Partial<IdleItemAffix>;
  const key = parsed.key;
  if (typeof key !== "string" || !AFFIX_POOL.some((entry) => entry.key === key)) return null;
  const definition = AFFIX_POOL.find((entry) => entry.key === key)!;
  const numericValue = Math.max(0, toFiniteNumber(parsed.value, 0));
  return {
    id: typeof parsed.id === "string" ? parsed.id : `${key}-${randomToken(6)}`,
    key: key as IdleItemAffixKey,
    label: typeof parsed.label === "string" ? parsed.label : definition.label,
    value: definition.percent ? Number(numericValue.toFixed(4)) : Math.round(numericValue),
    display: typeof parsed.display === "string" && parsed.display.trim()
      ? parsed.display
      : formatAffixDisplay(definition, numericValue)
  };
}

function normalizeOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function normalizeStringList(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const list = value
    .map((entry) => normalizeOptionalString(entry))
    .filter((entry): entry is string => Boolean(entry));
  return list.length ? Array.from(new Set(list)) : undefined;
}

function normalizeOptionalStats(value: unknown): Partial<IdleItemStats> | undefined {
  if (!value || typeof value !== "object") return undefined;
  const source = value as Partial<IdleItemStats>;
  const normalized = normalizeItemStats(source);
  const result: Partial<IdleItemStats> = {};
  for (const key of Object.keys(getEmptyStats()) as Array<keyof IdleItemStats>) {
    if (normalized[key] > 0) result[key] = normalized[key];
  }
  return Object.keys(result).length ? result : undefined;
}

export function normalizeItemInstance(input: unknown): IdleItemInstance {
  const parsed = (input && typeof input === "object" ? input : {}) as Partial<IdleItemInstance>;
  const type = normalizeItemType(parsed.type);
  const rarity = normalizeRarity(parsed.rarity);
  const levelRequirement = toPositiveInt(parsed.levelRequirement ?? parsed.level, 1);
  const level = toPositiveInt(parsed.level ?? parsed.levelRequirement, levelRequirement);
  const zoneIndex = toPositiveInt(parsed.zoneIndex, 1);
  const enhanceLevel = Math.max(
    0,
    Math.floor(toFiniteNumber(parsed.enhanceLevel ?? parsed.enhancementLevel ?? parsed.upgradeLevel, 0))
  );
  const rerollCount = clampRerollCount(parsed.rerollCount);
  const category = parsed.category && ["weapon", "armor", "accessory"].includes(parsed.category)
    ? parsed.category
    : categoryForType(type);
  const baseStats = normalizeItemStats(parsed.baseStats ?? parsed.stats ?? BASE_STATS[type]);
  const parsedAffixes = Array.isArray(parsed.affixes)
    ? parsed.affixes.map(normalizeItemAffix).filter((entry): entry is IdleItemAffix => Boolean(entry))
    : [];
  const stats = parsed.stats
    ? normalizeItemStats(parsed.stats)
    : applyAffixesToStats(baseStats, parsedAffixes);
  const value = Math.max(
    1,
    Math.floor(
      toFiniteNumber(
        parsed.value,
        calculateItemValue(stats, rarity, level, zoneIndex, enhanceLevel)
      )
    )
  );

  return {
    id: typeof parsed.id === "string" && parsed.id.trim()
      ? parsed.id
      : `${type}-${rarity}-${Date.now()}-${randomToken(7)}`,
    databaseId: normalizeOptionalString(parsed.databaseId),
    mapleId: normalizeOptionalString(parsed.mapleId),
    name: typeof parsed.name === "string" && parsed.name.trim() ? parsed.name : buildItemName(type, rarity, parsedAffixes),
    description: normalizeOptionalString(parsed.description),
    icon: normalizeOptionalString(parsed.icon),
    image: normalizeOptionalString(parsed.image),
    fallbackIcon: normalizeOptionalString(parsed.fallbackIcon),
    type,
    category,
    slot: type,
    rarity,
    level,
    levelRequirement,
    zoneIndex,
    baseStats,
    bonusStats: normalizeOptionalStats(parsed.bonusStats),
    affixes: parsedAffixes,
    stats,
    value,
    sellValue: Math.max(1, Math.floor(toFiniteNumber(parsed.sellValue ?? parsed.value, value))),
    setId: normalizeItemSetId(typeof parsed.setId === "string" ? parsed.setId : undefined),
    setName: normalizeOptionalString(parsed.setName),
    element: parsed.element ?? "neutral",
    prefix: typeof parsed.prefix === "string" ? parsed.prefix : undefined,
    suffix: typeof parsed.suffix === "string" ? parsed.suffix : undefined,
    upgradeLevel: enhanceLevel,
    enhancementLevel: enhanceLevel,
    starForce: Math.max(0, Math.floor(toFiniteNumber(parsed.starForce, enhanceLevel))),
    potentialLines: normalizeStringList(parsed.potentialLines),
    isUnique: Boolean(parsed.isUnique),
    isRareDrop: Boolean(parsed.isRareDrop),
    isNew: Boolean(parsed.isNew),
    isLocked: Boolean(parsed.isLocked),
    isFavorite: Boolean(parsed.isFavorite),
    tradeable: parsed.tradeable !== false,
    bound: Boolean(parsed.bound),
    qualityRoll: Number(toFiniteNumber(parsed.qualityRoll, 1).toFixed(3)),
    collectionKey: typeof parsed.collectionKey === "string" ? parsed.collectionKey : undefined,
    collectionName: typeof parsed.collectionName === "string" ? parsed.collectionName : undefined,
    source: normalizeOptionalString(parsed.source ?? parsed.dropSource ?? parsed.droppedFrom),
    dropSource: normalizeOptionalString(parsed.dropSource ?? parsed.droppedFrom),
    databaseCategory: normalizeOptionalString(parsed.databaseCategory),
    databaseType: normalizeOptionalString(parsed.databaseType),
    databaseUrl: normalizeOptionalString(parsed.databaseUrl),
    tags: normalizeStringList(parsed.tags),
    enhanceLevel,
    rerollCount,
    droppedFrom: typeof parsed.droppedFrom === "string" ? parsed.droppedFrom : undefined,
    createdAt: Math.max(0, Math.floor(toFiniteNumber(parsed.createdAt, Date.now())))
  };
}

export function normalizeItemList(items: unknown): IdleItemInstance[] {
  if (!Array.isArray(items)) return [];
  const normalized = items.map((entry) => normalizeItemInstance(entry));
  // Deduplicate: if two items share an ID (possible from pre-fix saves or
  // batch drops in the same millisecond), reassign a fresh unique ID to
  // every duplicate beyond the first occurrence.
  const seen = new Set<string>();
  return normalized.map((item) => {
    if (!seen.has(item.id)) {
      seen.add(item.id);
      return item;
    }
    const freshId = generateItemId(item.type, item.rarity);
    seen.add(freshId);
    return { ...item, id: freshId };
  });
}

export function createItem(options: {
  type: IdleItemType;
  rarity: IdleItemRarity;
  zoneIndex: number;
  levelRequirement: number;
  droppedFrom?: string;
  nameSeed?: string;
  rareDropBoost?: number;
  setDropBonus?: number;
  forceUnique?: boolean;
  /** Optional seeded RNG for deterministic tests. Defaults to Math.random. */
  rng?: RngFn;
}): IdleItemInstance {
  const {
    rarity,
    zoneIndex,
    levelRequirement,
    droppedFrom,
    nameSeed,
    rareDropBoost = 0,
    setDropBonus = 0,
    forceUnique = false,
    rng = defaultRng
  } = options;

  const type = normalizeItemType(options.type);
  const level = toPositiveInt(levelRequirement, 1);
  const category = categoryForType(type);
  const variation = 0.84 + rng() * 0.34;
  const qualityRoll = Number(variation.toFixed(3));
  const element = ELEMENTS[Math.floor(rng() * ELEMENTS.length)] ?? "neutral";
  const uniqueChance = forceUnique
    ? 1
    : Math.max(
        0,
        (rarity === "legendary" ? 0.02 : rarity === "epic" ? 0.006 : 0.0015)
        + zoneIndex * 0.0012
        + rareDropBoost * 0.004
      );
  const isUnique = rng() < uniqueChance;
  const setId = rollItemSetId({
    rarity,
    zoneIndex,
    element,
    rareDropBoost,
    setDropBonus,
    forceUnique,
    rng
  });
  const baseStats = buildBaseStats(type, rarity, zoneIndex, level, variation);
  const affixes = rollAffixes(type, rarity, level, rng);
  let stats = applyAffixesToStats(baseStats, affixes);

  if (isUnique) {
    stats = normalizeItemStats({
      attack: Math.floor(stats.attack * 1.16),
      defense: Math.floor(stats.defense * 1.12),
      hp: Math.floor(stats.hp * 1.14),
      critChance: stats.critChance + 0.02,
      critDamage: stats.critDamage + 0.06,
      attackSpeed: stats.attackSpeed + 0.015,
      damageMultiplier: stats.damageMultiplier + 0.03,
      goldMultiplier: stats.goldMultiplier + 0.02,
      xpMultiplier: stats.xpMultiplier + 0.01
    });
  }

  const uniqueNames = UNIQUE_ITEM_NAMES[type] ?? [];
  const uniqueName = uniqueNames[Math.floor(rng() * uniqueNames.length)];
  const generatedName = buildItemName(type, rarity, affixes, nameSeed, isUnique, rng);
  const displayName = isUnique && uniqueName ? uniqueName : generatedName;
  const value = calculateItemValue(stats, rarity, level, zoneIndex, 0);

  return {
    id: generateItemId(type, rarity),
    name: displayName,
    type,
    category,
    rarity,
    level,
    levelRequirement,
    zoneIndex,
    baseStats,
    affixes,
    stats,
    value,
    element,
    prefix: affixes[0] ? AFFIX_TITLE_BY_KEY[affixes[0].key] : undefined,
    suffix: affixes[1] ? AFFIX_SUFFIX_BY_KEY[affixes[1].key] : undefined,
    isUnique,
    isRareDrop: rareDropBoost > 0,
    qualityRoll,
    setId,
    enhanceLevel: 0,
    rerollCount: 0,
    droppedFrom,
    createdAt: Date.now()
  };
}

export function getItemPower(item: IdleItemInstance): number {
  const normalized = normalizeItemInstance(item);
  const stats = normalized.stats;
  return (
    stats.attack * 4 +
    stats.defense * 1.6 +
    stats.hp * 0.18 +
    stats.critChance * 220 +
    stats.critDamage * 110 +
    stats.attackSpeed * 170 +
    stats.damageMultiplier * 240 +
    stats.goldMultiplier * 55 +
    stats.xpMultiplier * 70
  ) * (1 + normalized.enhanceLevel * 0.025);
}

function applyEnhanceToStats(baseStats: IdleItemStats, enhanceLevel: number): IdleItemStats {
  const clamped = Math.max(0, enhanceLevel);
  if (!clamped) return normalizeItemStats(baseStats);
  const mainMult = 1 + clamped * 0.032;
  return normalizeItemStats({
    attack: Math.floor(baseStats.attack * mainMult),
    defense: Math.floor(baseStats.defense * mainMult),
    hp: Math.floor(baseStats.hp * mainMult),
    critChance: baseStats.critChance * (1 + clamped * 0.011) + clamped * 0.0008,
    critDamage: baseStats.critDamage * (1 + clamped * 0.015) + clamped * 0.0045,
    attackSpeed: baseStats.attackSpeed * (1 + clamped * 0.009) + clamped * 0.0007,
    damageMultiplier: baseStats.damageMultiplier + clamped * 0.005,
    goldMultiplier: baseStats.goldMultiplier + clamped * 0.002,
    xpMultiplier: baseStats.xpMultiplier + clamped * 0.0015
  });
}

export function recalculateItemStats(item: IdleItemInstance): IdleItemInstance {
  const normalized = normalizeItemInstance(item);
  const affixedStats = applyAffixesToStats(normalized.baseStats, normalized.affixes);
  const enhancedStats = applyEnhanceToStats(affixedStats, normalized.enhanceLevel);
  return {
    ...normalized,
    stats: enhancedStats,
    prefix: normalized.affixes[0] ? AFFIX_TITLE_BY_KEY[normalized.affixes[0].key] : normalized.prefix,
    suffix: normalized.affixes[1] ? AFFIX_SUFFIX_BY_KEY[normalized.affixes[1].key] : normalized.suffix,
    value: calculateItemValue(enhancedStats, normalized.rarity, normalized.level, normalized.zoneIndex, normalized.enhanceLevel)
  };
}

export function canEnhanceItem(item: IdleItemInstance): boolean {
  return normalizeItemInstance(item).enhanceLevel < MAX_ITEM_ENHANCE_LEVEL;
}

export function getEnhanceFailureChance(item: IdleItemInstance): number {
  const normalized = normalizeItemInstance(item);
  const nextLevel = normalized.enhanceLevel + 1;
  if (nextLevel <= 4) return 0;
  const rarityTier = Math.max(0, RARITY_ORDER.indexOf(normalized.rarity));
  return Number(Math.min(0.2, (nextLevel - 4) * 0.025 + rarityTier * 0.009).toFixed(3));
}

export function getEnhanceCost(item: IdleItemInstance): {
  mesos: number;
  materials: CraftingMaterials;
  failureChance: number;
} {
  const normalized = normalizeItemInstance(item);
  const nextLevel = normalized.enhanceLevel + 1;
  const mesos = Math.floor(
    (190 + normalized.levelRequirement * 34 + normalized.zoneIndex * 56)
    * RARITY_ENHANCE_COST_MULT[normalized.rarity]
    * Math.pow(1.39, nextLevel)
  );
  const rarityTier = Math.max(1, RARITY_ORDER.indexOf(normalized.rarity) + 1);
  return {
    mesos,
    materials: normalizeCraftingMaterials({
      shard: Math.ceil((2 + rarityTier + normalized.zoneIndex * 0.42) * Math.pow(1.2, nextLevel)),
      essence: nextLevel >= 3
        ? Math.ceil((rarityTier - 1 + nextLevel * 0.4) * Math.pow(1.1, Math.max(0, nextLevel - 3)))
        : 0,
      crystal: nextLevel >= 7
        ? Math.ceil((rarityTier - 1) * 0.65 + (nextLevel - 6) * 0.55)
        : 0,
      bossCore: nextLevel >= 10
        ? Math.ceil((rarityTier >= 4 ? 1 : 0) + Math.max(0, nextLevel - 9) * 0.35)
        : 0
    }),
    failureChance: getEnhanceFailureChance(normalized)
  };
}

export function enhanceItem(item: IdleItemInstance): IdleItemInstance {
  const normalized = normalizeItemInstance(item);
  if (!canEnhanceItem(normalized)) return normalized;
  return recalculateItemStats({
    ...normalized,
    enhanceLevel: normalized.enhanceLevel + 1
  });
}

function rollSingleAffix(
  type: IdleItemType,
  rarity: IdleItemRarity,
  level: number,
  excluded: Set<IdleItemAffixKey>,
  rng: RngFn = defaultRng
): IdleItemAffix | null {
  const pool = pickAffixPool(categoryForType(type))
    .filter((definition) => !excluded.has(definition.key));
  if (!pool.length) return null;
  const picked = pool[Math.floor(rng() * pool.length)];
  if (!picked) return null;
  const value = rollAffixValue(picked, level, rarity);
  return {
    id: `${picked.key}-${Date.now()}-${randomToken(5, rng)}`,
    key: picked.key,
    label: picked.label,
    value,
    display: formatAffixDisplay(picked, value)
  };
}

function rerollAllAffixes(item: IdleItemInstance, rng: RngFn = defaultRng): IdleItemAffix[] {
  const config = RARITY_CONFIG[item.rarity];
  const existingCount = Math.max(config.minAffixes, Math.min(config.maxAffixes, item.affixes.length || config.minAffixes));
  const targetCount = Math.max(config.minAffixes, existingCount);
  const rolled: IdleItemAffix[] = [];
  const used = new Set<IdleItemAffixKey>();
  while (rolled.length < targetCount) {
    const next = rollSingleAffix(item.type, item.rarity, item.level, used, rng);
    if (!next) break;
    if (used.has(next.key)) continue;
    used.add(next.key);
    rolled.push(next);
  }
  return rolled;
}

export function canRerollItem(item: IdleItemInstance): boolean {
  return normalizeItemInstance(item).rerollCount < MAX_ITEM_REROLLS;
}

export function getRerollCost(item: IdleItemInstance, mode: RerollMode = "all"): {
  mesos: number;
  materials: CraftingMaterials;
} {
  const normalized = normalizeItemInstance(item);
  const rerollStep = normalized.rerollCount + 1;
  const modeMult = mode === "all" ? 1 : 0.67;
  const mesos = Math.floor(
    (130 + normalized.levelRequirement * 22 + normalized.zoneIndex * 31)
    * RARITY_REROLL_COST_MULT[normalized.rarity]
    * modeMult
    * Math.pow(1.22, rerollStep)
  );
  const rarityTier = Math.max(1, RARITY_ORDER.indexOf(normalized.rarity) + 1);
  return {
    mesos,
    materials: normalizeCraftingMaterials({
      shard: Math.ceil((3 + rarityTier + normalized.zoneIndex * 0.2) * modeMult * Math.pow(1.08, rerollStep)),
      essence: Math.ceil((rarityTier + (mode === "all" ? 1 : 0)) * Math.pow(1.12, rerollStep)),
      crystal: rerollStep >= 6 || normalized.rarity === "legendary"
        ? Math.ceil(Math.max(0, rerollStep - 4) * 0.24 + (rarityTier >= 4 ? 1 : 0) + (mode === "all" ? 0.6 : 0))
        : 0,
      bossCore: rerollStep >= 12 || normalized.rarity === "legendary"
        ? Math.ceil((normalized.rarity === "legendary" ? 1 : 0) + Math.max(0, rerollStep - 10) * 0.18 + (mode === "all" ? 0.5 : 0))
        : 0
    })
  };
}

export function rerollItemAffixes(item: IdleItemInstance, mode: RerollMode, rng: RngFn = defaultRng): IdleItemInstance {
  const normalized = normalizeItemInstance(item);
  if (!canRerollItem(normalized)) return normalized;

  let nextAffixes = [...normalized.affixes];
  if (mode === "all") {
    nextAffixes = rerollAllAffixes(normalized, rng);
  } else {
    const index = mode === "prefix" ? 0 : 1;
    if (!nextAffixes[index]) return normalized;
    const used = new Set<IdleItemAffixKey>(
      nextAffixes
        .filter((_, affixIndex) => affixIndex !== index)
        .map((affix) => affix.key)
    );
    const rolled = rollSingleAffix(normalized.type, normalized.rarity, normalized.level, used, rng);
    if (rolled) {
      nextAffixes[index] = rolled;
    }
  }

  return recalculateItemStats({
    ...normalized,
    affixes: nextAffixes,
    rerollCount: normalized.rerollCount + 1
  });
}

export function getSalvageYield(item: IdleItemInstance): CraftingMaterials {
  const normalized = normalizeItemInstance(item);
  const rarityTier = Math.max(1, RARITY_ORDER.indexOf(normalized.rarity) + 1);
  return normalizeCraftingMaterials({
    shard: [6, 10, 16, 26, 38][rarityTier - 1] + normalized.zoneIndex + Math.floor(normalized.levelRequirement / 5) + normalized.enhanceLevel * 2,
    essence: [0, 1, 3, 8, 14][rarityTier - 1] + Math.floor(normalized.enhanceLevel / 2) + (normalized.isUnique ? 4 : 0),
    crystal: [0, 0, 0, 1, 3][rarityTier - 1] + Math.floor(Math.max(0, normalized.enhanceLevel - 7) / 3) + (normalized.isUnique ? 1 : 0),
    bossCore:
      (normalized.rarity === "legendary" ? 1 : 0)
      + (normalized.enhanceLevel >= 9 ? 1 : 0)
      + (normalized.isUnique ? 1 : 0)
  });
}

export function getCraftRecipeDefinition(recipeId: CraftRecipeId): CraftRecipeDefinition {
  return CRAFT_RECIPES[recipeId];
}

export function getCraftRecipeDefinitions(): CraftRecipeDefinition[] {
  return Object.values(CRAFT_RECIPES);
}

export function craftItemFromRecipe(
  recipeId: CraftRecipeId,
  zoneIndex: number,
  levelRequirement: number,
  rng: RngFn = defaultRng
): IdleItemInstance {
  const recipe = getCraftRecipeDefinition(recipeId);
  const randomType = ITEM_TYPES[Math.floor(rng() * ITEM_TYPES.length)] ?? "weapon";
  return createItem({
    type: randomType,
    rarity: recipe.targetRarity,
    zoneIndex: Math.max(1, zoneIndex),
    levelRequirement: Math.max(1, levelRequirement),
    nameSeed: recipe.targetRarity === "epic" ? "Forged" : "Crafted",
    rareDropBoost: recipe.targetRarity === "epic" ? 1 : 0
  });
}

export function normalizeItemArray(items: unknown): IdleItemInstance[] {
  return normalizeItemList(items);
}


