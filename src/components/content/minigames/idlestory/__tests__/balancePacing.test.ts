import { describe, expect, it } from "vitest";
import { computeCombatTick, getEnemyMaxHp } from "../combatSystem";
import {
  FALLBACK_ZONES,
  gameTick,
  type IdleGameState,
  type WorldZone
} from "../gameEngine";
import { getHeroCost, getHeroDps } from "../heroSystem";
import { getMesosPerSecond } from "../progressionSystem";
import { DEFAULT_STATE } from "../stateNormalization";
import {
  getNewPlayerDpsMult,
  getNewPlayerMesosMult,
  getNewPlayerXpMult
} from "../tutorialSystem";

const HENESYS: WorldZone = FALLBACK_ZONES[0]!;
const TICK_CONTEXT = { zone: HENESYS, monster: null, lootCount: 0 };
const SNAILGUARD_LV2_COST = getHeroCost("snailguard", DEFAULT_STATE.heroLevels.snailguard);

function freshState(overrides: Partial<IdleGameState> = {}): IdleGameState {
  return { ...structuredClone(DEFAULT_STATE), ...overrides };
}

function simulateSeconds(seconds: number, overrides: Partial<IdleGameState> = {}): IdleGameState {
  let state = freshState(overrides);
  for (let i = 0; i < seconds; i += 1) {
    state = gameTick(state, 1, TICK_CONTEXT, () => 0.99);
  }
  return state;
}

function secondsUntilFirstKill(): number {
  let state = freshState();
  const startStage = state.stage;
  for (let seconds = 1; seconds <= 7200; seconds += 1) {
    state = gameTick(state, 1, TICK_CONTEXT, () => 0.99);
    if (state.stage > startStage) return seconds;
  }
  return Infinity;
}

function secondsUntilFirstUpgradeAffordable(): number {
  let state = freshState();
  for (let seconds = 0; seconds <= 7200; seconds += 1) {
    const cost = getHeroCost("snailguard", state.heroLevels.snailguard);
    if (state.mesos >= cost) return seconds;
    state = gameTick(state, 1, TICK_CONTEXT, () => 0.99);
  }
  return Infinity;
}

describe("IdleStory early combat pacing", () => {
  it("Snailguard Lv1 DPS is tuned for a heavier first fight", () => {
    const dps = getHeroDps("snailguard", 1) * getNewPlayerDpsMult(0);
    expect(dps).toBeGreaterThanOrEqual(4.5);
    expect(dps).toBeLessThanOrEqual(5.5);
  });

  it("first enemy time-to-kill is in the 40-70 second window", () => {
    const firstEnemyHp = getEnemyMaxHp(1, HENESYS);
    const dps = getHeroDps("snailguard", 1) * getNewPlayerDpsMult(0);
    const analyticTtk = firstEnemyHp / dps;
    const simulatedTtk = secondsUntilFirstKill();

    expect(analyticTtk).toBeGreaterThanOrEqual(50);
    expect(analyticTtk).toBeLessThanOrEqual(70);
    expect(simulatedTtk).toBeGreaterThanOrEqual(40);
    expect(simulatedTtk).toBeLessThanOrEqual(70);
  });

  it("first Snailguard upgrade takes 40-60 minutes", () => {
    const seconds = secondsUntilFirstUpgradeAffordable();
    expect(seconds).toBeGreaterThanOrEqual(2400);
    expect(seconds).toBeLessThanOrEqual(3600);
  });

  it("new-player multipliers slow XP and mesos during the first hour", () => {
    expect(getNewPlayerDpsMult(0)).toBe(1);
    expect(getNewPlayerXpMult(0)).toBeCloseTo(0.45, 2);
    expect(getNewPlayerMesosMult(0)).toBeCloseTo(0.18, 2);
    expect(getNewPlayerMesosMult(3601)).toBe(1);
  });

  it("passive mesos is heavily throttled during the first minute", () => {
    const dps = getHeroDps("snailguard", 1);
    const mps = getMesosPerSecond(freshState(), HENESYS, null, dps) * getNewPlayerMesosMult(0);
    expect(mps).toBeGreaterThan(0.04);
    expect(mps).toBeLessThan(0.11);
  });
});

describe("IdleStory early simulation windows", () => {
  it("after 60 seconds player is still level 1 and cannot spam upgrades", () => {
    const state60 = simulateSeconds(60);
    expect(state60.level).toBe(1);
    expect(state60.stage).toBeLessThanOrEqual(2);
    expect(state60.mesos).toBeLessThan(SNAILGUARD_LV2_COST);
  });

  it("after 5 minutes progression is still early and boss is not rushed", () => {
    const state300 = simulateSeconds(300);

    expect(state300.level).toBe(1);
    expect(state300.stage).toBeGreaterThanOrEqual(4);
    expect(state300.stage).toBeLessThanOrEqual(6);
    expect(state300.mesos).toBeLessThan(180);
  });

  it("after 15 minutes the first boss remains a meaningful milestone", () => {
    const state900 = simulateSeconds(900);
    expect(state900.level).toBe(1);
    expect(state900.stage).toBeGreaterThanOrEqual(8);
    expect(state900.stage).toBeLessThanOrEqual(10);
    expect(state900.mesos).toBeLessThan(SNAILGUARD_LV2_COST);
  });
});

describe("IdleStory combat carryover limits", () => {
  it("online early-game tick cannot kill more than 1 enemy per second", () => {
    const highPowerEarlyState = freshState({
      totalPlayTime: 20,
      level: 1,
      stage: 1,
      enemyHp: 1,
      enemyMaxHp: 1,
      heroLevels: { ...DEFAULT_STATE.heroLevels, snailguard: 80 }
    });

    const result = computeCombatTick(highPowerEarlyState, HENESYS, 1, 1000, { mode: "online" });
    expect(result.kills).toBeLessThanOrEqual(1);
  });

  it("offline ticks can still progress, but remain hard-capped safely", () => {
    const highPowerOfflineState = freshState({
      totalPlayTime: 20,
      level: 1,
      stage: 1,
      enemyHp: 1,
      enemyMaxHp: 1,
      heroLevels: { ...DEFAULT_STATE.heroLevels, snailguard: 80 }
    });

    const result = computeCombatTick(highPowerOfflineState, HENESYS, 3600, 1000, { mode: "offline" });
    expect(result.kills).toBeGreaterThan(1);
    expect(result.kills).toBeLessThanOrEqual(240);
  });
});
