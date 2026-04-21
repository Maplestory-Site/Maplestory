/**
 * IdleStory World — Rebirth System
 *
 * Two-tier reset system with permanent progression:
 *
 *  ┌─ PRESTIGE (soft reset) ────────────────────────────────────────────────┐
 *  │  Requirement : ≥ 8 Crystals                                            │
 *  │  Resets      : Gold, hero/gear/skill levels, upgrades                  │
 *  │  Keeps       : Crystals (50 % carry), Fame, Class, Global Multipliers  │
 *  │  Awards      : +1 prestigeCount (small DPS/income compounding)         │
 *  └────────────────────────────────────────────────────────────────────────┘
 *
 *  ┌─ REBIRTH (hard reset) ─────────────────────────────────────────────────┐
 *  │  Requirement : Level ≥ 50 AND ≥ 100 Crystals                          │
 *  │  Resets      : EVERYTHING (including Crystals, Global Multipliers)     │
 *  │  Awards      : Relics (based on gold/level/stage formula)              │
 *  │  Permanent   : Relics buy upgrades that NEVER reset                    │
 *  └────────────────────────────────────────────────────────────────────────┘
 *
 * All functions are pure — no side effects, no I/O.
 */

import type { IdleGameState, RelicUpgradeId } from "./gameEngine";

// ─── Relic Upgrade definitions ────────────────────────────────────────────────

export type RelicUpgradeDef = {
  id: RelicUpgradeId;
  name: string;
  description: string;
  icon: string;
  /** Relic cost at level 0 */
  baseCost: number;
  /** Exponential cost scaling per level */
  costScaling: number;
  /** Fractional bonus per level */
  effectPerLevel: number;
  maxLevel: number;
  category: "gold" | "dps" | "crystals" | "rebirth";
};

export const RELIC_UPGRADES: Record<RelicUpgradeId, RelicUpgradeDef> = {
  gold_mastery: {
    id: "gold_mastery",
    name: "Gold Mastery",
    description: "+8% gold income permanently per level",
    icon: "🏅",
    baseCost: 3,
    costScaling: 3.0,
    effectPerLevel: 0.08,
    maxLevel: 10,
    category: "gold"
  },
  dps_mastery: {
    id: "dps_mastery",
    name: "DPS Mastery",
    description: "+5% total DPS permanently per level",
    icon: "⚔",
    baseCost: 4,
    costScaling: 3.2,
    effectPerLevel: 0.05,
    maxLevel: 10,
    category: "dps"
  },
  crystal_mastery: {
    id: "crystal_mastery",
    name: "Crystal Mastery",
    description: "+6% crystal gain permanently per level",
    icon: "💠",
    baseCost: 5,
    costScaling: 3.5,
    effectPerLevel: 0.06,
    maxLevel: 8,
    category: "crystals"
  },
  rebirth_momentum: {
    id: "rebirth_momentum",
    name: "Rebirth Momentum",
    description: "Start each rebirth with bonus starting gold × 500",
    icon: "🌀",
    baseCost: 8,
    costScaling: 4.0,
    effectPerLevel: 500,  // flat gold added
    maxLevel: 5,
    category: "rebirth"
  },
  relic_echo: {
    id: "relic_echo",
    name: "Relic Echo",
    description: "+4% relics earned from future rebirths per level",
    icon: "🔮",
    baseCost: 10,
    costScaling: 4.5,
    effectPerLevel: 0.04,
    maxLevel: 5,
    category: "rebirth"
  }
};

// ─── Cost functions ───────────────────────────────────────────────────────────

/** Relic cost to upgrade from `currentLevel` to +1. */
export function getRelicUpgradeCost(id: RelicUpgradeId, currentLevel: number): number {
  const def = RELIC_UPGRADES[id];
  return Math.round(def.baseCost * Math.pow(def.costScaling, currentLevel));
}

// ─── Permanent bonus getters ──────────────────────────────────────────────────
// Accept only the narrow `relicUpgrades` record to stay import-free of IdleGameState.

/** Permanent gold income multiplier from Gold Mastery. */
export function getRelicGoldBonus(relicUpgrades: Record<RelicUpgradeId, number>): number {
  return 1 + relicUpgrades.gold_mastery * RELIC_UPGRADES.gold_mastery.effectPerLevel;
}

/** Permanent DPS multiplier from DPS Mastery. */
export function getRelicDpsBonus(relicUpgrades: Record<RelicUpgradeId, number>): number {
  return 1 + relicUpgrades.dps_mastery * RELIC_UPGRADES.dps_mastery.effectPerLevel;
}

/** Permanent crystal gain multiplier from Crystal Mastery. */
export function getRelicCrystalBonus(relicUpgrades: Record<RelicUpgradeId, number>): number {
  return 1 + relicUpgrades.crystal_mastery * RELIC_UPGRADES.crystal_mastery.effectPerLevel;
}

/** Flat starting gold granted by Rebirth Momentum. */
export function getRebirthMomentumGold(relicUpgrades: Record<RelicUpgradeId, number>): number {
  return relicUpgrades.rebirth_momentum * RELIC_UPGRADES.rebirth_momentum.effectPerLevel;
}

/** Fractional bonus to relics earned (for the relic preview formula). */
export function getRelicEchoBonus(relicUpgrades: Record<RelicUpgradeId, number>): number {
  return relicUpgrades.relic_echo * RELIC_UPGRADES.relic_echo.effectPerLevel;
}

// ─── Requirement gates ────────────────────────────────────────────────────────

export const PRESTIGE_CRYSTAL_COST = 8;
export const REBIRTH_MIN_LEVEL     = 50;
export const REBIRTH_CRYSTAL_COST  = 100;

export function canPrestige(state: IdleGameState): boolean {
  return state.crystals >= PRESTIGE_CRYSTAL_COST;
}

export function canRebirth(state: IdleGameState): boolean {
  return state.level >= REBIRTH_MIN_LEVEL && state.crystals >= REBIRTH_CRYSTAL_COST;
}

// ─── Relic earning formula ────────────────────────────────────────────────────

/**
 * Relics earned on rebirth.
 *
 * Formula (each component is independent and additive):
 *   goldFactor   = floor( sqrt( totalGoldEarned / 1e7 ) )
 *   levelFactor  = floor( level / 8 )
 *   stageFactor  = floor( stage / 15 )
 *   crystalBonus = floor( crystals / 40 )
 *
 * Total = max(1, round( (sum) × (1 + relicEchoBonus) ))
 *
 * The √goldFactor grows slowly (anti-inflation), while level/stage reward
 * active play. Crystal bonus incentivises hitting the crystal cap before rebirth.
 */
export function calculateRelicsEarned(
  state: IdleGameState
): number {
  const echoBonus = getRelicEchoBonus(state.relicUpgrades);
  const goldFactor   = Math.floor(Math.sqrt(state.totalGoldEarned / 1e7));
  const levelFactor  = Math.floor(state.level / 8);
  const stageFactor  = Math.floor(state.stage / 15);
  const crystalBonus = Math.floor(state.crystals / 40);
  const base = goldFactor + levelFactor + stageFactor + crystalBonus;
  return Math.max(1, Math.round(base * (1 + echoBonus)));
}

// ─── Prestige carry calculation ───────────────────────────────────────────────

/**
 * Crystals carried into the next run after prestige.
 * 50 % carry, minimum 0.
 */
export function calculatePrestigeCrystalCarry(crystals: number): number {
  return Math.floor(crystals / 2);
}

/**
 * Starting hero bonus levels from prestige crystal carry.
 * e.g. 4 crystals carry → Snailguard starts at Lv.5
 */
export function calculatePrestigeHeroBonus(crystalCarry: number): number {
  return Math.min(crystalCarry, 10); // cap at 10 bonus levels
}

// ─── Relic upgrade buy helper ─────────────────────────────────────────────────

export function tryBuyRelicUpgrade(
  state: IdleGameState,
  upgradeId: RelicUpgradeId
): { success: boolean; message: string; cost: number; nextLevel: number } {
  const def = RELIC_UPGRADES[upgradeId];
  const currentLevel = state.relicUpgrades[upgradeId];

  if (currentLevel >= def.maxLevel) {
    return { success: false, message: `${def.name} is already maxed.`, cost: 0, nextLevel: currentLevel };
  }

  const cost = getRelicUpgradeCost(upgradeId, currentLevel);
  if (state.relics < cost) {
    return {
      success: false,
      message: `Need ${cost} relics for ${def.name} (have ${Math.floor(state.relics)}).`,
      cost,
      nextLevel: currentLevel
    };
  }

  return {
    success: true,
    message: `${def.icon} ${def.name} upgraded to Lv.${currentLevel + 1}. Effect is now permanent.`,
    cost,
    nextLevel: currentLevel + 1
  };
}

// ─── Rebirth preview summary ──────────────────────────────────────────────────

export type RebirthPreview = {
  canPrestige: boolean;
  prestigeReason: string;
  canRebirth: boolean;
  rebirthReason: string;
  relicsOnRebirth: number;
  crystalCarryOnPrestige: number;
  heroStartLevel: number;
};

export function getRebirthPreview(state: IdleGameState): RebirthPreview {
  const prestigeOk = canPrestige(state);
  const rebirthOk  = canRebirth(state);
  const relics     = calculateRelicsEarned(state);
  const carry      = calculatePrestigeCrystalCarry(state.crystals);
  const heroBonus  = calculatePrestigeHeroBonus(carry);

  return {
    canPrestige: prestigeOk,
    prestigeReason: prestigeOk
      ? `Carry ${carry} crystals + Snailguard Lv.${1 + heroBonus}`
      : `Need ${PRESTIGE_CRYSTAL_COST} crystals (have ${Math.floor(state.crystals)})`,
    canRebirth: rebirthOk,
    rebirthReason: rebirthOk
      ? `Earn ${relics} relic${relics !== 1 ? "s" : ""}`
      : (() => {
          const parts: string[] = [];
          if (state.level < REBIRTH_MIN_LEVEL)   parts.push(`level ${state.level}/${REBIRTH_MIN_LEVEL}`);
          if (state.crystals < REBIRTH_CRYSTAL_COST) parts.push(`${Math.floor(state.crystals)}/${REBIRTH_CRYSTAL_COST} crystals`);
          return `Need: ${parts.join(", ")}`;
        })(),
    relicsOnRebirth: relics,
    crystalCarryOnPrestige: carry,
    heroStartLevel: 1 + heroBonus
  };
}
