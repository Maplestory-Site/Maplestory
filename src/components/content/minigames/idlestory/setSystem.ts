/**
 * IdleStory World - Item Set and Synergy System
 *
 * Defines set identities, piece-tier bonuses, and controlled synergy logic.
 * This module is pure and safe to use from loot, inventory, and progression.
 */

import type {
  IdleElement,
  IdleItemRarity,
  IdleItemStats,
  IdleItemType
} from "./itemSystem";
import type { BuildFocusId } from "./skillBuildSystem";
import type { TalentNodeId } from "./talentSystem";
import { type RngFn, defaultRng } from "./seededRng";

export type ItemSetTheme = "damage" | "crit" | "speed" | "gold";

export type ItemSetId =
  | "emberfang_legion"
  | "nightbloom_oath"
  | "stormchaser_veil"
  | "goldleaf_covenant";

export type ItemSetBonusTier = {
  pieces: number;
  label: string;
  stats: Partial<IdleItemStats>;
};

export type ItemSetDefinition = {
  id: ItemSetId;
  name: string;
  theme: ItemSetTheme;
  pieceTypes: IdleItemType[];
  bonuses: ItemSetBonusTier[];
};

export type SetSynergyContext = {
  buildFocus?: BuildFocusId | null;
  talentNodes?: Partial<Record<TalentNodeId, boolean>>;
};

const ALL_ITEM_TYPES: IdleItemType[] = ["weapon", "armor", "helmet", "ring", "amulet"];

const EMPTY_STATS: IdleItemStats = {
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

const LEGACY_SET_ID_MAP: Record<string, ItemSetId> = {
  "fire-maple": "emberfang_legion",
  "ice-maple": "stormchaser_veil",
  "lightning-maple": "stormchaser_veil",
  "shadow-maple": "nightbloom_oath",
  "holy-maple": "goldleaf_covenant",
  "neutral-maple": "emberfang_legion"
};

const BUILD_THEME_SYNERGY: Record<BuildFocusId, Partial<Record<ItemSetTheme, number>>> = {
  crit: { crit: 0.18, damage: 0.08 },
  speed: { speed: 0.2, crit: 0.05 },
  tank: { damage: 0.07, gold: 0.05 },
  skill: { damage: 0.12, speed: 0.08 }
};

const TALENT_THEME_SYNERGY: Partial<Record<TalentNodeId, Partial<Record<ItemSetTheme, number>>>> = {
  power_I: { damage: 0.02 },
  power_II: { damage: 0.03 },
  crit_focus: { crit: 0.05 },
  berserker: { damage: 0.05, crit: 0.02 },
  gold_I: { gold: 0.03 },
  gold_II: { gold: 0.04 },
  loot_finder: { gold: 0.04 },
  wealth_aura: { gold: 0.06 },
  xp_I: { speed: 0.02 },
  xp_II: { speed: 0.02 },
  ascension: { speed: 0.02, crit: 0.02 },
  mastery_I: { damage: 0.02, crit: 0.02, speed: 0.02, gold: 0.02 },
  mastery_II: { damage: 0.03, crit: 0.03, speed: 0.03, gold: 0.03 },
  eternal_power: { damage: 0.04, crit: 0.04, speed: 0.04, gold: 0.04 }
};

export const ITEM_SET_DEFINITIONS: Record<ItemSetId, ItemSetDefinition> = {
  emberfang_legion: {
    id: "emberfang_legion",
    name: "Emberfang Legion",
    theme: "damage",
    pieceTypes: ALL_ITEM_TYPES,
    bonuses: [
      {
        pieces: 2,
        label: "Legion's Pressure",
        stats: { attack: 18, damageMultiplier: 0.025 }
      },
      {
        pieces: 4,
        label: "Burning Formation",
        stats: { attack: 32, damageMultiplier: 0.055, critDamage: 0.06 }
      }
    ]
  },
  nightbloom_oath: {
    id: "nightbloom_oath",
    name: "Nightbloom Oath",
    theme: "crit",
    pieceTypes: ALL_ITEM_TYPES,
    bonuses: [
      {
        pieces: 2,
        label: "Oath of Precision",
        stats: { critChance: 0.022, critDamage: 0.07 }
      },
      {
        pieces: 4,
        label: "Moonlit Execution",
        stats: { critChance: 0.03, critDamage: 0.1, damageMultiplier: 0.03 }
      }
    ]
  },
  stormchaser_veil: {
    id: "stormchaser_veil",
    name: "Stormchaser Veil",
    theme: "speed",
    pieceTypes: ALL_ITEM_TYPES,
    bonuses: [
      {
        pieces: 2,
        label: "Veil Tempo",
        stats: { attackSpeed: 0.05, attack: 10 }
      },
      {
        pieces: 4,
        label: "Overclock Gale",
        stats: { attackSpeed: 0.085, critChance: 0.018, damageMultiplier: 0.02 }
      }
    ]
  },
  goldleaf_covenant: {
    id: "goldleaf_covenant",
    name: "Goldleaf Covenant",
    theme: "gold",
    pieceTypes: ALL_ITEM_TYPES,
    bonuses: [
      {
        pieces: 2,
        label: "Collector's Contract",
        stats: { goldMultiplier: 0.05, defense: 12, hp: 70 }
      },
      {
        pieces: 4,
        label: "Guild Dividend",
        stats: { goldMultiplier: 0.095, damageMultiplier: 0.018, hp: 130 }
      }
    ]
  }
};

function clampNumber(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function normalizeStats(partial?: Partial<IdleItemStats> | null): IdleItemStats {
  const source = partial ?? {};
  return {
    attack: Math.max(0, Math.floor(Number(source.attack) || 0)),
    defense: Math.max(0, Math.floor(Number(source.defense) || 0)),
    hp: Math.max(0, Math.floor(Number(source.hp) || 0)),
    critChance: Number(Math.max(0, Number(source.critChance) || 0).toFixed(4)),
    critDamage: Number(Math.max(0, Number(source.critDamage) || 0).toFixed(4)),
    attackSpeed: Number(Math.max(0, Number(source.attackSpeed) || 0).toFixed(4)),
    damageMultiplier: Number(Math.max(0, Number(source.damageMultiplier) || 0).toFixed(4)),
    goldMultiplier: Number(Math.max(0, Number(source.goldMultiplier) || 0).toFixed(4)),
    xpMultiplier: Number(Math.max(0, Number(source.xpMultiplier) || 0).toFixed(4))
  };
}

function sumStats(a: IdleItemStats, b: IdleItemStats): IdleItemStats {
  return normalizeStats({
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

function randomWeighted<T extends string>(weighted: Array<{ id: T; weight: number }>, rng: RngFn = defaultRng): T {
  const total = weighted.reduce((sum, entry) => sum + Math.max(0, entry.weight), 0);
  let roll = rng() * Math.max(1, total);
  for (const entry of weighted) {
    roll -= Math.max(0, entry.weight);
    if (roll <= 0) return entry.id;
  }
  return weighted[0].id;
}

function getPreferredSetByElement(element: IdleElement): ItemSetId | null {
  if (element === "fire") return "emberfang_legion";
  if (element === "shadow") return "nightbloom_oath";
  if (element === "ice" || element === "lightning") return "stormchaser_veil";
  if (element === "holy") return "goldleaf_covenant";
  return null;
}

function getBuildThemeBonus(theme: ItemSetTheme, buildFocus?: BuildFocusId | null): number {
  if (!buildFocus) return 0;
  return BUILD_THEME_SYNERGY[buildFocus]?.[theme] ?? 0;
}

function getTalentThemeBonus(theme: ItemSetTheme, talentNodes?: Partial<Record<TalentNodeId, boolean>>): number {
  if (!talentNodes) return 0;
  let bonus = 0;
  for (const [nodeId, unlocked] of Object.entries(talentNodes) as Array<[TalentNodeId, boolean | undefined]>) {
    if (!unlocked) continue;
    bonus += TALENT_THEME_SYNERGY[nodeId]?.[theme] ?? 0;
  }
  return bonus;
}

export function getItemSetDefinitions(): ItemSetDefinition[] {
  return Object.values(ITEM_SET_DEFINITIONS);
}

export function normalizeItemSetId(setId?: string | null): ItemSetId | undefined {
  if (!setId) return undefined;
  const direct = setId as ItemSetId;
  if (ITEM_SET_DEFINITIONS[direct]) return direct;
  return LEGACY_SET_ID_MAP[setId];
}

export function getItemSetDefinition(setId?: string | null): ItemSetDefinition | null {
  const normalized = normalizeItemSetId(setId);
  return normalized ? ITEM_SET_DEFINITIONS[normalized] : null;
}

export function getSetDropChance(options: {
  rarity: IdleItemRarity;
  zoneIndex: number;
  rareDropBoost?: number;
  setDropBonus?: number;
  forceUnique?: boolean;
}): number {
  const baseByRarity: Record<IdleItemRarity, number> = {
    common: 0,
    uncommon: 0.025,
    rare: 0.07,
    epic: 0.14,
    legendary: 0.22
  };
  const base = baseByRarity[options.rarity];
  const zoneBonus = Math.min(0.12, Math.max(1, options.zoneIndex) * 0.0032);
  const rareDropBonus = (options.rareDropBoost ?? 0) * 0.05;
  const explicitBonus = options.setDropBonus ?? 0;
  const uniqueBonus = options.forceUnique ? 0.04 : 0;
  return Number(clampNumber(base + zoneBonus + rareDropBonus + explicitBonus + uniqueBonus, 0, 0.55).toFixed(4));
}

export function rollItemSetId(options: {
  rarity: IdleItemRarity;
  zoneIndex: number;
  element: IdleElement;
  rareDropBoost?: number;
  setDropBonus?: number;
  forceUnique?: boolean;
  /** Optional seeded RNG for deterministic tests. */
  rng?: RngFn;
}): ItemSetId | undefined {
  const rng = options.rng ?? defaultRng;
  const chance = getSetDropChance(options);
  if (rng() > chance) return undefined;

  const preferred = getPreferredSetByElement(options.element);
  if (!preferred) {
    return randomWeighted<ItemSetId>([
      { id: "emberfang_legion", weight: 1 },
      { id: "nightbloom_oath", weight: 1 },
      { id: "stormchaser_veil", weight: 1 },
      { id: "goldleaf_covenant", weight: 1 }
    ], rng);
  }

  return randomWeighted<ItemSetId>([
    { id: preferred, weight: 62 },
    { id: "emberfang_legion", weight: preferred === "emberfang_legion" ? 0 : 13 },
    { id: "nightbloom_oath", weight: preferred === "nightbloom_oath" ? 0 : 13 },
    { id: "stormchaser_veil", weight: preferred === "stormchaser_veil" ? 0 : 13 },
    { id: "goldleaf_covenant", weight: preferred === "goldleaf_covenant" ? 0 : 13 }
  ], rng);
}

export function getSetSynergyMultiplier(
  setId: ItemSetId,
  context?: SetSynergyContext
): number {
  const definition = ITEM_SET_DEFINITIONS[setId];
  const buildBonus = getBuildThemeBonus(definition.theme, context?.buildFocus);
  const talentBonus = getTalentThemeBonus(definition.theme, context?.talentNodes);
  return Number((1 + clampNumber(buildBonus + talentBonus, 0, 0.38)).toFixed(4));
}

export function getSetProgressionScalar(avgLevelRequirement: number, avgEnhanceLevel: number): number {
  const levelFactor = clampNumber(Math.max(0, avgLevelRequirement) / 220, 0, 0.25);
  const enhanceFactor = clampNumber(Math.max(0, avgEnhanceLevel) * 0.015, 0, 0.14);
  return Number((1 + levelFactor + enhanceFactor).toFixed(4));
}

export function scaleSetBonusStats(
  baseStats: Partial<IdleItemStats>,
  progressionScalar: number,
  synergyMultiplier: number
): IdleItemStats {
  const base = normalizeStats(baseStats);
  const effectiveScale = clampNumber(
    1
      + (Math.max(1, progressionScalar) - 1) * 0.55
      + (Math.max(1, synergyMultiplier) - 1) * 0.85,
    1,
    1.55
  );

  return normalizeStats({
    attack: base.attack * effectiveScale,
    defense: base.defense * effectiveScale,
    hp: base.hp * effectiveScale,
    critChance: base.critChance * effectiveScale,
    critDamage: base.critDamage * effectiveScale,
    attackSpeed: base.attackSpeed * effectiveScale,
    damageMultiplier: base.damageMultiplier * effectiveScale,
    goldMultiplier: base.goldMultiplier * effectiveScale,
    xpMultiplier: base.xpMultiplier * effectiveScale
  });
}

export function sumSetStats(statsList: IdleItemStats[]): IdleItemStats {
  return statsList.reduce((acc, stats) => sumStats(acc, stats), { ...EMPTY_STATS });
}
