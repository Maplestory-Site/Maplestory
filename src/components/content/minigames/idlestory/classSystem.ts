/**
 * IdleStory World — Class System
 *
 * Defines the three hero classes (Warrior, Mage, Archer), their base stats,
 * passive mechanics, resource types, and all scaling formulas.
 *
 * Design rules:
 *  - All functions are pure — no side effects, no I/O.
 *  - Imports only types from gameEngine to avoid circular runtime deps.
 *  - Passive bonuses are modelled as average-damage multipliers so they
 *    integrate cleanly with the DPS calculation in progressionSystem.
 */

import type { ClassId, IdleGameState } from "./gameEngine";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ResourceType = "mana" | "rage";

export type PassiveDefinition = {
  name: string;
  description: string;
  /**
   * How often the passive triggers (every N attacks or spells).
   * Used to compute the average-damage multiplier.
   */
  triggerEvery: number;
  /** Damage multiplier on the triggering hit. */
  damageMult: number;
};

export type ClassDefinition = {
  id: ClassId;
  name: string;
  description: string;
  icon: string;
  color: string;
  // Base stats at player level 1
  baseHp: number;
  /** Flat HP added per player level. */
  hpPerLevel: number;
  /**
   * Multiplier applied to total calculated DPS.
   * Warrior = 1.0, Mage = 0.75 (offset by high burst), Archer = 0.85 (offset by crit).
   */
  dpsMult: number;
  // Resource system
  resource: ResourceType;
  maxResource: number;
  /** Base resource regenerated per real-world second (before buff multipliers). */
  resourceRegenPerSec: number;
  // Passive talent
  passive: PassiveDefinition;
};

// ─── Class data ───────────────────────────────────────────────────────────────

export const CLASSES: Record<ClassId, ClassDefinition> = {
  warrior: {
    id: "warrior",
    name: "Warrior",
    description: "Frontline melee fighter. High HP, steady damage, and rage-powered burst.",
    icon: "⚔",
    color: "#e05555",
    baseHp: 500,
    hpPerLevel: 42,
    dpsMult: 1.0,
    resource: "rage",
    maxResource: 100,
    resourceRegenPerSec: 4,
    passive: {
      name: "Cleave",
      description: "Every 5th attack cleaves for ×3 damage.",
      triggerEvery: 5,
      damageMult: 3.0
    }
  },

  mage: {
    id: "mage",
    name: "Mage",
    description: "Mana-powered burst caster. Lower sustained DPS, but devastating spell output.",
    icon: "✦",
    color: "#7b68ee",
    baseHp: 280,
    hpPerLevel: 18,
    dpsMult: 0.75,
    resource: "mana",
    maxResource: 100,
    resourceRegenPerSec: 8,
    passive: {
      name: "Arcane Mastery",
      description: "Every 4th spell crits for ×2.5 damage.",
      triggerEvery: 4,
      damageMult: 2.5
    }
  },

  archer: {
    id: "archer",
    name: "Archer",
    description: "Swift ranged attacker. Built-in crit chance scales with player level.",
    icon: "🏹",
    color: "#4aab6d",
    baseHp: 350,
    hpPerLevel: 26,
    dpsMult: 0.85,
    resource: "rage", // Archers use Focus — same mechanic, different flavour
    maxResource: 80,
    resourceRegenPerSec: 6,
    passive: {
      name: "Keen Eye",
      description: "25 % crit chance; crits deal ×2 damage.",
      triggerEvery: 4, // 1-in-4 on average
      damageMult: 2.0
    }
  }
};

// ─── Scaling formulas ─────────────────────────────────────────────────────────

/** Maximum HP for `classId` at the given `level`. */
export function getClassMaxHp(classId: ClassId, level: number): number {
  const def = CLASSES[classId];
  return Math.round(def.baseHp + def.hpPerLevel * (level - 1));
}

/**
 * Base DPS multiplier from the active class.
 * Returns 1.0 when no class is selected.
 */
export function getClassDpsMult(state: IdleGameState): number {
  if (!state.classId) return 1.0;
  return CLASSES[state.classId].dpsMult;
}

/**
 * Passive average-damage multiplier, modelled as:
 *   avgMult = ((n − 1) × 1.0 + passiveMult) / n
 * where n = triggerEvery.
 *
 * This lets `calculateDPS` treat the passive as a constant scalar without
 * requiring per-hit state tracking.
 */
export function getPassiveAvgMult(classId: ClassId): number {
  const { triggerEvery, damageMult } = CLASSES[classId].passive;
  return ((triggerEvery - 1) * 1.0 + damageMult) / triggerEvery;
}

/**
 * Returns the passive average-damage multiplier for the active class.
 * Returns 1.0 when no class is selected.
 */
export function getPassiveDpsMult(state: IdleGameState): number {
  if (!state.classId) return 1.0;
  return getPassiveAvgMult(state.classId);
}

// ─── Archer level-scaling crit ────────────────────────────────────────────────

/**
 * Archer crit chance scales with player level:
 *   25 % at Lv.1 → 35 % at Lv.10 → 45 % at Lv.20+
 */
export function getArcherCritChance(level: number): number {
  if (level >= 20) return 0.45;
  if (level >= 10) return 0.35;
  return 0.25;
}

/**
 * Effective Archer passive multiplier accounting for level-based crit scaling.
 * Overrides the static `getPassiveAvgMult` for archers only.
 */
export function getArcherPassiveMult(level: number): number {
  const critChance = getArcherCritChance(level);
  const critMult = CLASSES.archer.passive.damageMult;
  // avg = (1 - critChance) × 1.0  + critChance × critMult
  return (1 - critChance) + critChance * critMult;
}

/**
 * Resolved passive DPS multiplier — uses level-scaled formula for archers.
 */
export function getResolvedPassiveDpsMult(state: IdleGameState): number {
  if (!state.classId) return 1.0;
  if (state.classId === "archer") return getArcherPassiveMult(state.level);
  return getPassiveAvgMult(state.classId);
}

// ─── Resource helpers ─────────────────────────────────────────────────────────

export function getMaxResource(classId: ClassId): number {
  return CLASSES[classId].maxResource;
}

export function getBaseRegenPerSec(classId: ClassId): number {
  return CLASSES[classId].resourceRegenPerSec;
}

/**
 * Advance resource by `deltaSeconds`, respecting `regenMult` (from buff_regen buffs).
 * Clamps to [0, maxResource].
 */
export function tickResource(
  current: number,
  classId: ClassId,
  deltaSeconds: number,
  regenMult: number
): number {
  const max = getMaxResource(classId);
  const regen = getBaseRegenPerSec(classId) * regenMult;
  return Math.min(max, Math.max(0, current + regen * deltaSeconds));
}
