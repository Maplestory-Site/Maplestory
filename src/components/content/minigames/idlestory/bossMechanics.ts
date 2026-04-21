/**
 * bossMechanics.ts — Boss fight state machine and mechanic computations.
 *
 * Tracks the live boss fight: phase, active ability, enrage countdown, voice lines.
 * All functions are pure — no React, no side effects.
 *
 * Integration point:
 *   • `computeBossDpsMultiplier` → passed to `gameTick` via `GameContext.bossDpsMultiplier`
 *   • `tickBossFight` → called every second in the React fight loop
 */

import {
  type BossDefinition,
  type BossAbility,
  type BossPhaseConfig,
  getBossPhaseConfig,
  getPhaseAbilities
} from "./bossSystem";

// ─── Fight state ──────────────────────────────────────────────────────────────

export type BossFightState = {
  bossId: string;
  /** Total seconds elapsed since fight began. */
  elapsedSeconds: number;
  /** Seconds remaining before permanent enrage (counts down). 0 = no timer or expired. */
  enrageSecondsLeft: number;
  /** ID of the currently active mechanic ability (or null). */
  activeMechanicId: string | null;
  /** Absolute timestamp (Date.now()) when the active mechanic expires. */
  mechanicEndMs: number;
  /** Per-ability: absolute timestamp when it can next fire. */
  abilityCooldowns: Record<string, number>;
  /** Seconds elapsed when each ability last triggered. */
  abilityLastTrigger: Record<string, number>;
  currentPhase: 1 | 2 | 3;
  /** Most recent voice line to display. */
  currentVoiceLine: string | null;
  /** Timestamp when current voice line was set. */
  voiceLineSetAt: number;
  isEnraged: boolean;
};

export function createBossFightState(bossId: string, enrageTimer: number): BossFightState {
  return {
    bossId,
    elapsedSeconds: 0,
    enrageSecondsLeft: enrageTimer,
    activeMechanicId: null,
    mechanicEndMs: 0,
    abilityCooldowns: {},
    abilityLastTrigger: {},
    currentPhase: 1,
    currentVoiceLine: null,
    voiceLineSetAt: 0,
    isEnraged: false
  };
}

// ─── Tick ─────────────────────────────────────────────────────────────────────

export type BossFightTickResult = {
  fight: BossFightState;
  /** Newly triggered ability this tick (null if none). */
  triggered: BossAbility | null;
  /** Newly entered phase (null if no phase change). */
  phaseTransition: BossPhaseConfig | null;
};

/**
 * Advances the boss fight by one second.
 *
 * @param fight   Current fight state
 * @param boss    Boss definition
 * @param hpPct   Current boss HP as 0–100 percentage
 * @param nowMs   Current timestamp (Date.now())
 */
export function tickBossFight(
  fight: BossFightState,
  boss: BossDefinition,
  hpPct: number,
  nowMs: number
): BossFightTickResult {
  const newElapsed = fight.elapsedSeconds + 1;

  // ── Phase ─────────────────────────────────────────────────────────────────
  const newPhase: 1 | 2 | 3 = hpPct > 70 ? 1 : hpPct > 30 ? 2 : 3;
  const phaseChanged = newPhase !== fight.currentPhase;
  let phaseTransition: BossPhaseConfig | null = null;
  let newVoiceLine = fight.currentVoiceLine;
  let newVoiceLineAt = fight.voiceLineSetAt ?? 0;

  if (phaseChanged) {
    phaseTransition = getBossPhaseConfig(boss, hpPct);
    newVoiceLine = phaseTransition.transitionLine;
    newVoiceLineAt = nowMs;
  }

  // ── Enrage countdown ──────────────────────────────────────────────────────
  const newEnrageLeft = fight.enrageSecondsLeft > 0
    ? Math.max(0, fight.enrageSecondsLeft - 1)
    : 0;
  const newlyEnraged = !fight.isEnraged && fight.enrageSecondsLeft > 0 && newEnrageLeft === 0;
  const isEnraged = fight.isEnraged || newlyEnraged;

  if (newlyEnraged) {
    newVoiceLine = boss.voiceLines.enrage;
    newVoiceLineAt = nowMs;
  }

  // ── Active mechanic check ─────────────────────────────────────────────────
  const mechanicStillActive = fight.activeMechanicId !== null && nowMs < fight.mechanicEndMs;
  let newActiveMechanicId = mechanicStillActive ? fight.activeMechanicId : null;
  let newMechanicEndMs = mechanicStillActive ? fight.mechanicEndMs : 0;

  // ── Ability trigger ───────────────────────────────────────────────────────
  let triggered: BossAbility | null = null;

  if (!mechanicStillActive) {
    // Collect candidates for this phase (or all phases if enraged)
    const candidates = isEnraged
      ? boss.abilities
      : getPhaseAbilities(boss, newPhase);

    // Seeded round-robin using elapsed time to avoid all abilities firing together
    const seed = Math.floor(newElapsed / 2) % Math.max(candidates.length, 1);
    const orderedCandidates = [
      ...candidates.slice(seed),
      ...candidates.slice(0, seed)
    ];

    for (const ability of orderedCandidates) {
      const cooldownEnd = fight.abilityCooldowns[ability.id] ?? 0;
      if (nowMs < cooldownEnd) continue;

      const lastTrigger = fight.abilityLastTrigger[ability.id] ?? -Infinity;
      if (newElapsed - lastTrigger < ability.triggerEvery) continue;

      triggered = ability;
      break;
    }
  }

  // ── Update cooldowns ──────────────────────────────────────────────────────
  const newCooldowns = { ...fight.abilityCooldowns };
  const newLastTriggers = { ...fight.abilityLastTrigger };

  if (triggered) {
    newCooldowns[triggered.id] = nowMs + (triggered.duration + triggered.cooldown) * 1000;
    newLastTriggers[triggered.id] = newElapsed;
    newActiveMechanicId = triggered.duration > 0 ? triggered.id : null;
    newMechanicEndMs = triggered.duration > 0 ? nowMs + triggered.duration * 1000 : 0;
  }

  const nextFight: BossFightState = {
    bossId: fight.bossId,
    elapsedSeconds: newElapsed,
    enrageSecondsLeft: newEnrageLeft,
    activeMechanicId: newActiveMechanicId,
    mechanicEndMs: newMechanicEndMs,
    abilityCooldowns: newCooldowns,
    abilityLastTrigger: newLastTriggers,
    currentPhase: newPhase,
    currentVoiceLine: newVoiceLine,
    voiceLineSetAt: newVoiceLineAt,
    isEnraged
  };

  return { fight: nextFight, triggered, phaseTransition };
}

// ─── DPS multiplier ───────────────────────────────────────────────────────────

/**
 * Returns a 0–1+ multiplier that modifies player DPS during a boss fight.
 * 1.0 = normal, 0 = fully blocked (freeze/seal), 0.5 = half damage.
 */
export function computeBossDpsMultiplier(
  boss: BossDefinition,
  activeMechanicId: string | null,
  isEnraged: boolean
): number {
  if (!activeMechanicId) {
    return isEnraged ? 0.75 : 1.0;
  }
  const ability = boss.abilities.find(ab => ab.id === activeMechanicId);
  if (!ability) return 1.0;

  switch (ability.effect) {
    case "shield":  return Math.max(0, 1.0 - ability.effectStrength);
    case "seal":    return Math.max(0, 1.0 - ability.effectStrength);
    case "freeze":  return 0.0;
    case "reflect": return 0.5;
    case "summon":  return 0.75;
    case "poison":  return Math.max(0.5, 1.0 - ability.effectStrength * 0.5);
    case "regen":
    case "lifesteal":
    case "aoe":
    case "rage":
    case "enrage":
    default:        return 1.0;
  }
}

export function computeBossAttackMultiplier(
  boss: BossDefinition,
  hpPct: number,
  activeMechanicId: string | null,
  isEnraged: boolean,
  elapsedSeconds: number
): number {
  const phase = getBossPhaseConfig(boss, hpPct);
  const ability = activeMechanicId
    ? boss.abilities.find(ab => ab.id === activeMechanicId)
    : null;
  const rageRamp = Math.min(2.25, 1 + Math.max(0, elapsedSeconds) * 0.006);
  const enrageMult = isEnraged ? 1.8 : 1;
  const abilityMult = ability?.effect === "rage" || ability?.effect === "enrage"
    ? Math.max(1, ability.effectStrength)
    : 1;

  return phase.damageMultiplier * rageRamp * enrageMult * abilityMult;
}

export function getBossMechanicPressure(
  boss: BossDefinition,
  activeMechanicId: string | null
): "none" | "low" | "medium" | "high" | "lethal" {
  if (!activeMechanicId) return "none";
  const ability = boss.abilities.find(ab => ab.id === activeMechanicId);
  if (!ability) return "none";
  if (ability.effect === "freeze" || ability.effect === "enrage") return "lethal";
  if (ability.effect === "shield" || ability.effect === "summon" || ability.effect === "seal") return "high";
  if (ability.effect === "aoe" || ability.effect === "poison" || ability.effect === "regen") return "medium";
  return "low";
}

// ─── Reward multiplier ────────────────────────────────────────────────────────

/**
 * Speed bonus: kill before enrage for double rewards.
 */
export function getBossKillSpeedBonus(
  enrageTimer: number,
  elapsedSeconds: number
): number {
  if (enrageTimer <= 0) return 1.0;
  return elapsedSeconds < enrageTimer ? 2.0 : 1.0;
}

// ─── Phase defence multiplier ─────────────────────────────────────────────────

/**
 * Returns the boss defence multiplier from its active phase config.
 * Values < 1.0 mean the boss is shielded (takes less damage).
 */
export function getBossDefenceMultiplier(boss: BossDefinition, hpPct: number): number {
  const phase = getBossPhaseConfig(boss, hpPct);
  return phase.defenseMultiplier;
}

// ─── Mechanic time remaining ──────────────────────────────────────────────────

export function getMechanicTimeLeft(fight: BossFightState, nowMs: number): number {
  if (!fight.activeMechanicId || fight.mechanicEndMs <= 0) return 0;
  return Math.max(0, (fight.mechanicEndMs - nowMs) / 1000);
}
