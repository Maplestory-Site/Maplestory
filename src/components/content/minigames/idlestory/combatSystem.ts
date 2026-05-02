/**
 * IdleStory World — Combat System
 *
 * DPS calculation, enemy HP scaling, boss detection, and per-tick combat resolution.
 * All functions are pure — no side effects, no I/O.
 *
 * Stage rules:
 *  - Every stage has one enemy.
 *  - Enemy HP scales exponentially with stage number and zone tier.
 *  - Stage N where (N % 10 === 0) is a boss stage — 8× base HP.
 *  - Auto-combat kills the enemy and advances to the next stage automatically.
 */

import type { IdleGameState, WorldZone } from "./gameEngine";
import {
  calculateDPS,
  getEncounterTypeForStage,
  getMonsterHpForStage
} from "./progressionSystem";
import { getBossDefinition, scaleBossStats } from "./bossSystem";
import { getStageMonsterByMap } from "./monsterSystem";
import { getReplayabilityBonuses } from "./replayabilitySystem";

// ─── Boss detection ───────────────────────────────────────────────────────────

export const BOSS_STAGE_INTERVAL = 10;
/** Legacy constant kept for compat — actual multiplier now comes from getZoneBossHpMultiplier(). */
export const BOSS_HP_MULTIPLIER = 8;

export function isBossStage(stage: number): boolean {
  return getEncounterTypeForStage(stage) === "boss";
}

export function isEliteStage(stage: number): boolean {
  return getEncounterTypeForStage(stage) === "elite";
}

// ─── Enemy HP scaling ─────────────────────────────────────────────────────────

/**
 * Base HP for stage 1 of a zone, derived from the zone's level requirement.
 * Higher-tier zones start with more durable enemies.
 */
export function getZoneBaseHp(zone: WorldZone): number {
  return getMonsterHpForStage(1, zone.requirement, getStageMonsterByMap(zone.id, 1) ?? undefined);
}

/**
 * Maximum HP of the enemy at `stage` in `zone`.
 *
 * Growth rate scales with zone tier (later zones are steeper).
 * Boss HP multiplier also scales with zone tier.
 * Elite stages (5, 15, 25…) have 3.5× HP for a mid-zone challenge spike.
 */
export function getEnemyMaxHp(stage: number, zone: WorldZone): number {
  return getMonsterHpForStage(stage, zone.requirement, getStageMonsterByMap(zone.id, stage) ?? undefined);
}

function getCombatEnemyMaxHp(
  stage: number,
  zone: WorldZone,
  playerPower: number,
  prestigeCount: number,
  state: Pick<IdleGameState, "replayability" | "prestigeCount" | "rebirthCount" | "level">
): number {
  const replayabilityDifficulty = getReplayabilityBonuses(
    state.replayability,
    state.prestigeCount,
    state.rebirthCount
  ).difficultyMult;
  const levelGap = state.level - zone.requirement;
  const progressScale =
    levelGap >= 0
      ? 1 - Math.min(0.38, levelGap * 0.015)
      : 1 + Math.min(0.55, Math.abs(levelGap) * 0.04);
  const tunedDifficulty = replayabilityDifficulty * progressScale;
  if (!isBossStage(stage)) {
    return Math.floor(getEnemyMaxHp(stage, zone) * tunedDifficulty);
  }

  const boss = getBossDefinition(zone.id);
  if (!boss) return Math.floor(getEnemyMaxHp(stage, zone) * tunedDifficulty);

  return Math.max(
    Math.floor(getEnemyMaxHp(stage, zone) * tunedDifficulty),
    Math.floor(scaleBossStats(boss, zone.requirement, playerPower, prestigeCount).hp * tunedDifficulty)
  );
}

/**
 * Initialise the enemy HP for a fresh stage (or when loading from save).
 * If `savedHp` is a valid positive number it is used directly; otherwise
 * the enemy starts at full HP.
 */
export function initEnemyHp(stage: number, zone: WorldZone, savedHp?: number): { enemyHp: number; enemyMaxHp: number } {
  const max = getEnemyMaxHp(stage, zone);
  const hp = savedHp != null && savedHp > 0 && savedHp <= max ? savedHp : max;
  return { enemyHp: hp, enemyMaxHp: max };
}

// ─── Combat tick ──────────────────────────────────────────────────────────────

export type CombatTickResult = {
  newState: IdleGameState;
  /** Total number of enemies killed during this tick (≥0). */
  kills: number;
  /** Total number of bosses killed during this tick. */
  bossesKilled: number;
  /** Total number of elite enemies killed during this tick. */
  eliteKills: number;
};

export type CombatTickMode = "online" | "offline";

export type CombatTickOptions = {
  mode?: CombatTickMode;
};

function getMaxKillsPerTick(deltaSeconds: number, state: IdleGameState, mode: CombatTickMode): number {
  if (mode === "offline") {
    const isEarlyOffline = state.totalPlayTime < 3600 || state.level < 8 || state.stage < 30;
    if (isEarlyOffline) {
      return Math.min(240, Math.max(1, Math.ceil(deltaSeconds * 0.08)));
    }
    return Math.min(3000, Math.max(3, Math.ceil(deltaSeconds * 2.5)));
  }

  const isEarlyOnline = state.totalPlayTime < 3600 || state.level < 8 || state.stage < 30;
  if (isEarlyOnline) return 1;

  if (state.level < 15 || state.stage < 60) {
    return Math.min(4, Math.max(2, Math.ceil(deltaSeconds * 2)));
  }

  return Math.min(3000, Math.max(3, Math.ceil(deltaSeconds * 4)));
}

/**
 * Resolves combat for `deltaSeconds` of real time.
 *
 * The tick loops to handle cases where DPS is high enough to kill multiple
 * enemies in one second. Each kill advances `stage` by 1 and spawns a fresh
 * enemy. Remaining damage spills over into the next enemy.
 *
 * Returns the updated state plus kill metadata for UI feedback.
 */
export function computeCombatTick(
  state: IdleGameState,
  zone: WorldZone,
  deltaSeconds: number,
  dpsMultiplier = 1.0,
  options: CombatTickOptions = {}
): CombatTickResult {
  const dps = calculateDPS(state) * Math.max(0, dpsMultiplier);
  const playerPower = Math.max(1, calculateDPS(state));
  let damage = dps * deltaSeconds;
  let stage = Math.max(1, Math.floor(state.stage));
  let enemyMaxHp = state.enemyMaxHp > 0
    ? Math.max(1, Math.floor(state.enemyMaxHp))
    : getCombatEnemyMaxHp(stage, zone, playerPower, state.prestigeCount, state);
  let enemyHp = state.enemyHp > 0
    ? Math.min(enemyMaxHp, Math.max(1, Math.floor(state.enemyHp)))
    : enemyMaxHp;
  if (!Number.isFinite(enemyHp) || enemyHp <= 0) enemyHp = enemyMaxHp;
  if (!Number.isFinite(enemyMaxHp) || enemyMaxHp <= 0) enemyMaxHp = Math.max(1, enemyHp);
  let kills = 0;
  let bossesKilled = 0;
  let eliteKills = 0;

  // Offline ticks can represent hours, so the cap scales with elapsed time.
  // Balance: minimum was 30 (allows 30 stage skips per 1s online tick).
  // Now 6 minimum — still generous for offline but prevents online stage-skip spam.
  const mode = options.mode ?? (deltaSeconds > 2 ? "offline" : "online");
  const MAX_KILLS_PER_TICK = getMaxKillsPerTick(deltaSeconds, state, mode);
  while (damage > 0 && kills < MAX_KILLS_PER_TICK) {
    if (damage >= enemyHp) {
      // Enemy dies — carry over remaining damage
      damage -= enemyHp;
      if (isBossStage(stage))  bossesKilled += 1;
      if (isEliteStage(stage)) eliteKills   += 1;
      kills += 1;
      stage += 1;
      enemyMaxHp = getCombatEnemyMaxHp(stage, zone, playerPower, state.prestigeCount, state);
      enemyHp = enemyMaxHp;
    } else {
      enemyHp -= damage;
      damage = 0;
    }
  }

  return {
    newState: { ...state, stage, enemyHp: Math.max(1, Math.round(enemyHp)), enemyMaxHp },
    kills,
    bossesKilled,
    eliteKills
  };
}

// ─── Convenience queries ──────────────────────────────────────────────────────

/**
 * How many seconds until the current enemy dies at current DPS.
 * Returns Infinity if DPS is 0 or enemy HP is 0.
 */
export function secondsToKill(state: IdleGameState): number {
  const dps = calculateDPS(state);
  if (!dps || !state.enemyHp) return Infinity;
  return state.enemyHp / dps;
}

/**
 * Progress percentage (0–100) of current enemy defeat.
 */
export function getEnemyProgress(state: IdleGameState): number {
  if (!state.enemyMaxHp) return 0;
  return Math.max(0, Math.min(100, ((state.enemyMaxHp - state.enemyHp) / state.enemyMaxHp) * 100));
}

/**
 * How much of the current enemy HP is remaining as a percentage (0–100).
 */
export function getEnemyHpPercent(state: IdleGameState): number {
  if (!state.enemyMaxHp) return 100;
  return Math.max(0, Math.min(100, (state.enemyHp / state.enemyMaxHp) * 100));
}

/**
 * Lightweight enemy outgoing damage model for UI feedback.
 * This does not affect core progression math or kill speed.
 */
export function getEnemyAttackPerSecond(
  stage: number,
  zone: WorldZone,
  encounterType: "normal" | "elite" | "boss" = isBossStage(stage)
    ? "boss"
    : isEliteStage(stage)
      ? "elite"
      : "normal"
): number {
  const safeStage = Math.max(1, stage);
  const zoneTier = Math.max(1, zone.requirement);
  const base = 7 + zoneTier * 2.1 + Math.pow(safeStage, 1.14) * 1.45;
  const typeMult =
    encounterType === "boss"
      ? 2.45
      : encounterType === "elite"
        ? 1.65
        : 1;
  return Math.max(1, Math.floor(base * typeMult));
}

/**
 * Enemy attack cadence in milliseconds, used by the combat UI timer.
 */
export function getEnemyAttackIntervalMs(
  stage: number,
  zone: WorldZone,
  encounterType: "normal" | "elite" | "boss" = isBossStage(stage)
    ? "boss"
    : isEliteStage(stage)
      ? "elite"
      : "normal"
): number {
  const safeStage = Math.max(1, stage);
  const zoneTier = Math.max(1, zone.requirement);
  const base = 1480 - safeStage * 8 - zoneTier * 22;
  const typeFactor =
    encounterType === "boss"
      ? 0.9
      : encounterType === "elite"
        ? 0.94
        : 1;
  return Math.max(460, Math.floor(base * typeFactor));
}
