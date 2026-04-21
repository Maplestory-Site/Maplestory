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

function getCombatEnemyMaxHp(stage: number, zone: WorldZone, playerPower: number, prestigeCount: number): number {
  if (!isBossStage(stage)) return getEnemyMaxHp(stage, zone);

  const boss = getBossDefinition(zone.id);
  if (!boss) return getEnemyMaxHp(stage, zone);

  return Math.max(
    getEnemyMaxHp(stage, zone),
    scaleBossStats(boss, zone.requirement, playerPower, prestigeCount).hp
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
  dpsMultiplier = 1.0
): CombatTickResult {
  const dps = calculateDPS(state) * Math.max(0, dpsMultiplier);
  const playerPower = Math.max(1, calculateDPS(state));
  let damage = dps * deltaSeconds;
  let stage = state.stage;
  let enemyHp = state.enemyHp > 0 ? state.enemyHp : getCombatEnemyMaxHp(stage, zone, playerPower, state.prestigeCount);
  let enemyMaxHp = state.enemyMaxHp > 0 ? state.enemyMaxHp : enemyHp;
  let kills = 0;
  let bossesKilled = 0;
  let eliteKills = 0;

  // Offline ticks can represent hours, so the cap scales with elapsed time.
  const MAX_KILLS_PER_TICK = Math.min(5000, Math.max(50, Math.ceil(deltaSeconds * 25)));
  while (damage > 0 && kills < MAX_KILLS_PER_TICK) {
    if (damage >= enemyHp) {
      // Enemy dies — carry over remaining damage
      damage -= enemyHp;
      if (isBossStage(stage))  bossesKilled += 1;
      if (isEliteStage(stage)) eliteKills   += 1;
      kills += 1;
      stage += 1;
      enemyMaxHp = getCombatEnemyMaxHp(stage, zone, playerPower, state.prestigeCount);
      enemyHp = enemyMaxHp;
    } else {
      enemyHp -= damage;
      damage = 0;
    }
  }

  return {
    newState: { ...state, stage, enemyHp: Math.round(enemyHp), enemyMaxHp },
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
