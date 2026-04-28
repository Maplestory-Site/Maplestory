/**
 * IdleStory World — Skill System
 *
 * Active skill tree for all three classes, cooldown tracking, buff management,
 * resource (mana/rage) consumption, and skill activation logic.
 *
 * Design rules:
 *  - All functions are pure — no side effects, no I/O.
 *  - Imports only types from gameEngine to avoid circular runtime deps.
 *  - `ActiveBuff` is defined here and re-exported; gameEngine.ts re-exports it
 *    so the component only needs one import point.
 */

import type { ClassId, ClassSkillId, IdleGameState } from "./gameEngine";
import { getSkillBuildBonuses } from "./skillBuildSystem";

// ─── Buff / effect types ──────────────────────────────────────────────────────

export type SkillEffectType =
  | "burst_dps"    // Immediate damage spike (value × current DPS, applied once)
  | "buff_dps"     // Temporary DPS multiplier (value, for `duration` seconds)
  | "buff_regen"   // Temporary resource regen multiplier (value, for `duration` seconds)
  | "instant_kill" // Kill enemy instantly if HP% ≤ value
  | "buff_crit";   // Guaranteed crit for next `charges` attacks

export type ActiveBuff = {
  skillId: ClassSkillId;
  effectType: SkillEffectType;
  /** Multiplier (buff_dps, buff_crit) or regen scalar (buff_regen). */
  value: number;
  remainingSeconds: number;
  /** Remaining auto-crit charges (buff_crit only). */
  charges?: number;
};

// ─── Skill definition ─────────────────────────────────────────────────────────

export type SkillDefinition = {
  id: ClassSkillId;
  classId: ClassId;
  name: string;
  description: string;
  icon: string;
  /** Mana or rage cost (0 = no cost). */
  resourceCost: number;
  /** Cooldown in seconds after activation. */
  cooldown: number;
  /** Player level required to unlock this skill. */
  unlockLevel: number;
  effect: {
    type: SkillEffectType;
    /** Effect magnitude — multiplier, regen scale, or HP threshold (0–1). */
    value: number;
    /** Seconds the buff lasts (omit for instant effects). */
    duration?: number;
    /** Auto-crit charges granted (buff_crit only). */
    charges?: number;
  };
};

// ─── Skill data ───────────────────────────────────────────────────────────────

export const SKILLS_BY_CLASS: Record<ClassId, ClassSkillId[]> = {
  warrior: ["battle_cry", "shield_wall", "execute"],
  mage:    ["fireball", "arcane_nova", "mana_surge"],
  archer:  ["rapid_fire", "snipe", "shadow_step"]
};

export const SKILL_DEFINITIONS: Record<ClassSkillId, SkillDefinition> = {

  // ── Warrior ──────────────────────────────────────────────────────────────

  battle_cry: {
    id: "battle_cry",
    classId: "warrior",
    name: "Battle Cry",
    description: "Roar that doubles DPS for 8 seconds.",
    icon: "📣",
    resourceCost: 20,
    cooldown: 24,
    unlockLevel: 1,
    effect: { type: "buff_dps", value: 2.0, duration: 8 }
  },

  shield_wall: {
    id: "shield_wall",
    classId: "warrior",
    name: "Shield Wall",
    description: "Defensive stance: rage regenerates at ×3.5 speed for 10 s.",
    icon: "🛡",
    resourceCost: 0,
    cooldown: 18,
    unlockLevel: 5,
    effect: { type: "buff_regen", value: 3.5, duration: 10 }
  },

  execute: {
    id: "execute",
    classId: "warrior",
    name: "Execute",
    description: "Instantly destroy an enemy with ≤ 25 % HP remaining.",
    icon: "💥",
    resourceCost: 30,
    cooldown: 30,
    unlockLevel: 10,
    effect: { type: "instant_kill", value: 0.25 }
  },

  // ── Mage ─────────────────────────────────────────────────────────────────

  fireball: {
    id: "fireball",
    classId: "mage",
    name: "Fireball",
    description: "A burst of flame dealing ×3 your DPS as instant damage.",
    icon: "🔥",
    resourceCost: 25,
    cooldown: 10,
    unlockLevel: 1,
    effect: { type: "burst_dps", value: 3.0 }
  },

  arcane_nova: {
    id: "arcane_nova",
    classId: "mage",
    name: "Arcane Nova",
    description: "Shockwave dealing ×6 your DPS as instant damage.",
    icon: "✨",
    resourceCost: 45,
    cooldown: 22,
    unlockLevel: 5,
    effect: { type: "burst_dps", value: 6.0 }
  },

  mana_surge: {
    id: "mana_surge",
    classId: "mage",
    name: "Mana Surge",
    description: "Accelerate mana regen at ×4 speed for 10 s.",
    icon: "💧",
    resourceCost: 15,
    cooldown: 20,
    unlockLevel: 10,
    effect: { type: "buff_regen", value: 4.0, duration: 10 }
  },

  // ── Archer ────────────────────────────────────────────────────────────────

  rapid_fire: {
    id: "rapid_fire",
    classId: "archer",
    name: "Rapid Fire",
    description: "Unleash a salvo — boosts DPS by ×2.5 for 5 s.",
    icon: "🏹",
    resourceCost: 20,
    cooldown: 16,
    unlockLevel: 1,
    effect: { type: "buff_dps", value: 2.5, duration: 5 }
  },

  snipe: {
    id: "snipe",
    classId: "archer",
    name: "Snipe",
    description: "Precise shot dealing ×8 your DPS as instant damage.",
    icon: "🎯",
    resourceCost: 35,
    cooldown: 26,
    unlockLevel: 5,
    effect: { type: "burst_dps", value: 8.0 }
  },

  shadow_step: {
    id: "shadow_step",
    classId: "archer",
    name: "Shadow Step",
    description: "Phase into shadows — next 4 attacks automatically crit.",
    icon: "👤",
    resourceCost: 25,
    cooldown: 20,
    unlockLevel: 10,
    effect: { type: "buff_crit", value: 2.0, duration: 60, charges: 4 }
  }
};

// ─── Cooldown & buff tick ─────────────────────────────────────────────────────

export type TickedCooldownsAndBuffs = {
  skillCooldowns: Record<string, number>;
  activeBuffs: ActiveBuff[];
};

/**
 * Decrements all active skill cooldowns and buff durations by `deltaSeconds`.
 * Expired cooldowns and zero-duration buffs are removed.
 * Charge-based buffs (buff_crit) are kept until charges are exhausted.
 */
export function tickCooldownsAndBuffs(
  skillCooldowns: Record<string, number>,
  activeBuffs: ActiveBuff[],
  deltaSeconds: number
): TickedCooldownsAndBuffs {
  const nextCooldowns: Record<string, number> = {};
  for (const [key, remaining] of Object.entries(skillCooldowns)) {
    const next = remaining - deltaSeconds;
    if (next > 0) nextCooldowns[key] = next;
  }

  const nextBuffs = activeBuffs
    .map((buff) => ({ ...buff, remainingSeconds: buff.remainingSeconds - deltaSeconds }))
    .filter(
      (buff) =>
        buff.remainingSeconds > 0 ||
        (buff.charges != null && buff.charges > 0)
    );

  return { skillCooldowns: nextCooldowns, activeBuffs: nextBuffs };
}

// ─── Buff multiplier queries ──────────────────────────────────────────────────

/** Combined DPS multiplier from all active `buff_dps` buffs. */
export function getActiveBuffDpsMult(activeBuffs: ActiveBuff[]): number {
  return activeBuffs
    .filter((b) => b.effectType === "buff_dps")
    .reduce((acc, b) => acc * b.value, 1.0);
}

/**
 * Combined resource regen multiplier from all active `buff_regen` buffs.
 * Stacks multiplicatively.
 */
export function getActiveRegenMult(activeBuffs: ActiveBuff[]): number {
  return activeBuffs
    .filter((b) => b.effectType === "buff_regen")
    .reduce((acc, b) => acc * b.value, 1.0);
}

/** Whether a buff_crit buff is active with remaining charges. */
export function hasCritBuff(activeBuffs: ActiveBuff[]): boolean {
  return activeBuffs.some((b) => b.effectType === "buff_crit" && (b.charges ?? 0) > 0);
}

/** Consume one crit charge from the first active buff_crit buff. */
export function consumeCritCharge(activeBuffs: ActiveBuff[]): ActiveBuff[] {
  let consumed = false;
  return activeBuffs.map((buff) => {
    if (!consumed && buff.effectType === "buff_crit" && (buff.charges ?? 0) > 0) {
      consumed = true;
      return { ...buff, charges: (buff.charges ?? 1) - 1 };
    }
    return buff;
  }).filter((b) => b.effectType !== "buff_crit" || (b.charges ?? 0) > 0);
}

// ─── Skill activation ─────────────────────────────────────────────────────────

export type SkillActivationResult = {
  state: IdleGameState;
  /** Instant damage dealt (> 0 only for burst_dps and instant_kill). */
  instantDamage: number;
  message: string;
  success: boolean;
};

/**
 * Attempt to activate `skillId` on the current state.
 *
 * Validates:
 *  1. Player has a class selected.
 *  2. Skill belongs to the player's class.
 *  3. Player level meets `unlockLevel`.
 *  4. Skill is not on cooldown.
 *  5. Player has enough resource.
 *
 * On success, returns a new state with resource spent, cooldown started,
 * buff/damage applied, and `instantDamage` set for the engine to consume.
 */
export function activateSkill(
  state: IdleGameState,
  skillId: ClassSkillId,
  currentDps: number
): SkillActivationResult {
  const def = SKILL_DEFINITIONS[skillId];
  const buildBonuses = getSkillBuildBonuses(state);
  const resourceCost = Math.max(0, Math.floor(def.resourceCost * buildBonuses.resourceCostMult));
  const cooldown = Math.max(4, Math.round(def.cooldown / buildBonuses.cooldownRecoveryMult));

  if (!state.classId) {
    return { state, instantDamage: 0, message: "Select a class first.", success: false };
  }
  if (def.classId !== state.classId) {
    return { state, instantDamage: 0, message: `${def.name} belongs to the ${def.classId} class.`, success: false };
  }
  if (state.level < def.unlockLevel) {
    return {
      state, instantDamage: 0,
      message: `Reach level ${def.unlockLevel} to unlock ${def.name}.`,
      success: false
    };
  }

  const cooldownRemaining = state.skillCooldowns[skillId] ?? 0;
  if (cooldownRemaining > 0) {
    return {
      state, instantDamage: 0,
      message: `${def.name} on cooldown — ${Math.ceil(cooldownRemaining)}s remaining.`,
      success: false
    };
  }

  if (state.resource < resourceCost) {
    const resName = state.classId === "mage" ? "mana" : "rage";
    return {
      state, instantDamage: 0,
      message: `Need ${resourceCost} ${resName} for ${def.name} (have ${Math.floor(state.resource)}).`,
      success: false
    };
  }

  // ── Apply effect ─────────────────────────────────────────────────────────
  let instantDamage = 0;
  let nextEnemyHp = state.enemyHp;
  let nextBuffs: ActiveBuff[] = [...state.activeBuffs];

  switch (def.effect.type) {
    case "burst_dps": {
      instantDamage = currentDps * def.effect.value * buildBonuses.skillDamageMult;
      nextEnemyHp = Math.max(0, state.enemyHp - instantDamage);
      break;
    }

    case "buff_dps": {
      const buffDuration = Math.max(3, Math.round((def.effect.duration ?? 8) * buildBonuses.buffDurationMult));
      nextBuffs = nextBuffs.filter((b) => b.skillId !== skillId);
      nextBuffs.push({
        skillId,
        effectType: "buff_dps",
        value: def.effect.value * Math.max(1, buildBonuses.skillDamageMult * 0.92),
        remainingSeconds: buffDuration
      });
      break;
    }

    case "buff_regen": {
      const buffDuration = Math.max(4, Math.round((def.effect.duration ?? 10) * buildBonuses.buffDurationMult));
      nextBuffs = nextBuffs.filter((b) => b.skillId !== skillId);
      nextBuffs.push({
        skillId,
        effectType: "buff_regen",
        value: def.effect.value * buildBonuses.resourceRegenMult,
        remainingSeconds: buffDuration
      });
      break;
    }

    case "instant_kill": {
      const threshold = def.effect.value; // e.g. 0.25 → 25 % HP
      const executeThreshold = Math.min(0.5, threshold + buildBonuses.executeThresholdBonus);
      const hpPct = state.enemyMaxHp > 0 ? state.enemyHp / state.enemyMaxHp : 1;
      if (hpPct <= executeThreshold) {
        instantDamage = state.enemyHp;
        nextEnemyHp = 0;
      } else {
        return {
          state, instantDamage: 0,
          message: `Execute requires the enemy to be below ${Math.round(executeThreshold * 100)} % HP (currently ${Math.round(hpPct * 100)} %).`,
          success: false
        };
      }
      break;
    }

    case "buff_crit": {
      const buffDuration = Math.max(10, Math.round((def.effect.duration ?? 60) * buildBonuses.buffDurationMult));
      nextBuffs = nextBuffs.filter((b) => b.skillId !== skillId);
      nextBuffs.push({
        skillId,
        effectType: "buff_crit",
        value: def.effect.value,
        remainingSeconds: buffDuration,
        charges: (def.effect.charges ?? 4) + buildBonuses.critChargeBonus
      });
      break;
    }
  }

  const nextState: IdleGameState = {
    ...state,
    resource: state.resource - resourceCost,
    skillCooldowns: { ...state.skillCooldowns, [skillId]: cooldown },
    activeBuffs: nextBuffs,
    enemyHp: nextEnemyHp
  };

  const dmgNote = instantDamage > 0 ? ` Dealt ${fmt(instantDamage)} damage.` : "";
  return {
    state: nextState,
    instantDamage,
    message: `${def.icon} ${def.name} activated!${dmgNote}`,
    success: true
  };
}

// ─── Unlock helpers ───────────────────────────────────────────────────────────

/** Returns the subset of skills the player has unlocked for their current class. */
export function getUnlockedSkills(classId: ClassId, playerLevel: number): SkillDefinition[] {
  return SKILLS_BY_CLASS[classId]
    .map((id) => SKILL_DEFINITIONS[id])
    .filter((def) => playerLevel >= def.unlockLevel);
}

/** Returns all three skill definitions for a class (locked or not). */
export function getAllClassSkills(classId: ClassId): SkillDefinition[] {
  return SKILLS_BY_CLASS[classId].map((id) => SKILL_DEFINITIONS[id]);
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function fmt(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}m`;
  if (value >= 1_000) return `${(value / 1000).toFixed(1)}k`;
  return Math.floor(value).toLocaleString();
}
