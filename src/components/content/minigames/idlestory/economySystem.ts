/**
 * IdleStory World — Economy System
 *
 * Three-currency economy:
 *  - Gold (Mesos)  — Basic. Earned per second. Resets on prestige/rebirth.
 *  - Crystals      — Premium-grindable. From levels/bosses. Partial carry on
 *                    prestige; full reset on rebirth.
 *  - Relics        — Rare. Earned ONLY from rebirth. Never reset.
 *
 * Anti-inflation design:
 *  - Gold soft cap: income above threshold yields diminishing returns.
 *    Cap grows with prestige/rebirth so progression never stalls completely.
 *  - Crystal hard cap per run: 500. Forces cycling through rebirth.
 *  - Exponential upgrade cost curves prevent runaway snowballing.
 *
 * All functions are pure — no side effects, no I/O.
 */

import type { GlobalMultId, IdleGameState } from "./gameEngine";

// ─── Global Multiplier definitions ───────────────────────────────────────────

export type GlobalMultiplierDef = {
  id: GlobalMultId;
  name: string;
  description: string;
  icon: string;
  /** Crystal cost at level 0 */
  baseCost: number;
  /** Exponential cost scaling factor */
  costScaling: number;
  /** Fractional additive boost per level */
  effectPerLevel: number;
  maxLevel: number;
};

export const GLOBAL_MULTIPLIERS: Record<GlobalMultId, GlobalMultiplierDef> = {
  gold_income: {
    id: "gold_income",
    name: "Meso Flow",
    description: "+20% gold income per level",
    icon: "💰",
    baseCost: 5,
    costScaling: 2.2,
    effectPerLevel: 0.20,
    maxLevel: 10
  },
  dps_amp: {
    id: "dps_amp",
    name: "Power Core",
    description: "+15% total DPS per level",
    icon: "⚡",
    baseCost: 8,
    costScaling: 2.4,
    effectPerLevel: 0.15,
    maxLevel: 10
  },
  xp_boost: {
    id: "xp_boost",
    name: "Exp Aura",
    description: "+25% XP gain per level",
    icon: "✨",
    baseCost: 6,
    costScaling: 2.3,
    effectPerLevel: 0.25,
    maxLevel: 8
  },
  crystal_luck: {
    id: "crystal_luck",
    name: "Crystal Luck",
    description: "+10% crystal drop rate per level",
    icon: "💎",
    baseCost: 12,
    costScaling: 2.8,
    effectPerLevel: 0.10,
    maxLevel: 5
  }
};

// ─── Cost functions ───────────────────────────────────────────────────────────

/** Crystal cost to upgrade a global multiplier from `currentLevel` to +1. */
export function getGlobalMultCost(id: GlobalMultId, currentLevel: number): number {
  const def = GLOBAL_MULTIPLIERS[id];
  return Math.round(def.baseCost * Math.pow(def.costScaling, currentLevel));
}

// ─── Multiplier getters ───────────────────────────────────────────────────────
// Accept the narrow `globalMults` record so callers don't need to pass the whole state.

export function getGoldIncomeMult(globalMults: Record<GlobalMultId, number>): number {
  return 1 + globalMults.gold_income * GLOBAL_MULTIPLIERS.gold_income.effectPerLevel;
}

export function getDpsAmpMult(globalMults: Record<GlobalMultId, number>): number {
  return 1 + globalMults.dps_amp * GLOBAL_MULTIPLIERS.dps_amp.effectPerLevel;
}

export function getXpBoostMult(globalMults: Record<GlobalMultId, number>): number {
  return 1 + globalMults.xp_boost * GLOBAL_MULTIPLIERS.xp_boost.effectPerLevel;
}

export function getCrystalLuckMult(globalMults: Record<GlobalMultId, number>): number {
  return 1 + globalMults.crystal_luck * GLOBAL_MULTIPLIERS.crystal_luck.effectPerLevel;
}

// ─── Anti-inflation: Gold soft cap ────────────────────────────────────────────

/**
 * Gold soft cap. Scales with prestige and rebirth so each cycle remains
 * meaningful while still slowing late-game accumulation.
 *
 *   cap = 1 000 000 × 3^prestige × 10^rebirth
 */
export function getGoldSoftCap(prestigeCount: number, rebirthCount: number): number {
  return 1_000_000 * Math.pow(3, prestigeCount) * Math.pow(10, rebirthCount);
}

/**
 * Income reduction factor above the soft cap.
 * Returns 1.0 below cap; smoothly diminishes above it.
 *
 *   factor = 1 / (1 + excessRatio × 0.8)
 *
 * At 2× the cap the income rate is ~38 % of normal.
 * At 10× the cap the income rate is ~12 % of normal.
 * Players can still progress but slowly — strong incentive to prestige.
 */
export function applySoftCapFactor(currentGold: number, softCap: number): number {
  if (currentGold <= softCap) return 1.0;
  const excessRatio = (currentGold - softCap) / softCap;
  return 1.0 / (1.0 + excessRatio * 0.8);
}

// ─── Anti-inflation: Crystal hard cap ────────────────────────────────────────

/**
 * Maximum crystals a player can hold in a single run before the cap kicks in.
 * Earning crystals beyond this grants zero — forcing engagement with rebirth.
 */
export const CRYSTAL_CAP_PER_RUN = 500;

export function isCrystalCapped(crystals: number): boolean {
  return crystals >= CRYSTAL_CAP_PER_RUN;
}

// ─── Crystal earning ──────────────────────────────────────────────────────────

/**
 * Crystals awarded for a boss kill (stage where `stage % 10 === 0`).
 * Scales with stage tier and crystal luck multiplier.
 */
export function getCrystalsFromBossKill(
  stage: number,
  crystalLuckMult: number,
  currentCrystals: number
): number {
  if (currentCrystals >= CRYSTAL_CAP_PER_RUN) return 0;
  const tier = Math.max(1, Math.floor(stage / 30));
  return Math.round(tier * crystalLuckMult);
}

/**
 * Crystals awarded on a level-up milestone.
 * Returns 0 for non-milestone levels.
 */
export function getCrystalsFromLevelUp(
  level: number,
  crystalLuckMult: number,
  currentCrystals: number
): number {
  if (currentCrystals >= CRYSTAL_CAP_PER_RUN) return 0;
  let base = 0;
  if (level % 25 === 0) base = 5;       // Major milestone
  else if (level % 10 === 0) base = 3;  // Minor milestone
  else if (level % 5 === 0) base = 1;
  return Math.round(base * crystalLuckMult);
}

// ─── Relic preview ────────────────────────────────────────────────────────────

/**
 * Preview of how many relics would be earned if the player rebirths now.
 * Used for the UI "Rebirth (earn N relics)" display.
 *
 * Formula:
 *   relics = floor(sqrt(totalGoldEarned / 1e7))
 *          + floor(level / 8)
 *          + floor(stage / 15)
 *          + floor(crystals / 40)
 *
 * All multiplied by (1 + relicEchoBonus).
 * Minimum 1 relic per rebirth.
 */
export function calculateRelicsPreview(
  totalGoldEarned: number,
  level: number,
  stage: number,
  crystals: number,
  relicEchoBonus: number
): number {
  const goldFactor   = Math.floor(Math.sqrt(totalGoldEarned / 1e7));
  const levelFactor  = Math.floor(level / 8);
  const stageFactor  = Math.floor(stage / 15);
  const crystalBonus = Math.floor(crystals / 40);
  const base = goldFactor + levelFactor + stageFactor + crystalBonus;
  return Math.max(1, Math.round(base * (1 + relicEchoBonus)));
}

// ─── Buy global multiplier action helper ─────────────────────────────────────

/**
 * Validates and returns the result of purchasing one level of a global multiplier.
 * Caller (gameEngine.ts) handles state mutation and toast.
 */
export function tryBuyGlobalMult(
  state: IdleGameState,
  multId: GlobalMultId
): { success: boolean; message: string; cost: number; nextLevel: number } {
  const def = GLOBAL_MULTIPLIERS[multId];
  const currentLevel = state.globalMults[multId];

  if (currentLevel >= def.maxLevel) {
    return { success: false, message: `${def.name} is already at max level.`, cost: 0, nextLevel: currentLevel };
  }

  const cost = getGlobalMultCost(multId, currentLevel);
  if (state.crystals < cost) {
    return {
      success: false,
      message: `Need ${cost} crystals for ${def.name} (have ${Math.floor(state.crystals)}).`,
      cost,
      nextLevel: currentLevel
    };
  }

  return { success: true, message: `${def.name} upgraded to Lv.${currentLevel + 1}.`, cost, nextLevel: currentLevel + 1 };
}

// ─── Income rate summary (for UI display) ────────────────────────────────────

export type IncomeRates = {
  goldPerSec: number;
  /** Gold effectively capped — true if soft cap is reducing income */
  isCapped: boolean;
  softCap: number;
  crystalsPerBossKill: number;
};

export function getIncomeRates(
  state: IdleGameState,
  rawGoldPerSec: number
): IncomeRates {
  const softCap = getGoldSoftCap(state.prestigeCount, state.rebirthCount);
  const capFactor = applySoftCapFactor(state.mesos, softCap);
  const crystalLuck = getCrystalLuckMult(state.globalMults);

  return {
    goldPerSec: rawGoldPerSec * capFactor,
    isCapped: capFactor < 0.99,
    softCap,
    crystalsPerBossKill: getCrystalsFromBossKill(state.stage, crystalLuck, state.crystals)
  };
}
