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
  for (let seconds = 1; seconds <= 900; seconds += 1) {
    state = gameTick(state, 1, TICK_CONTEXT, () => 0.99);
    if (state.stage > startStage) return seconds;
  }
  return Infinity;
}

function secondsUntilFirstUpgradeAffordable(): number {
  let state = freshState();
  for (let seconds = 0; seconds <= 900; seconds += 1) {
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

  it("first enemy time-to-kill is in the 20-35 second window", () => {
    const firstEnemyHp = getEnemyMaxHp(1, HENESYS);
    const dps = getHeroDps("snailguard", 1) * getNewPlayerDpsMult(0);
    const analyticTtk = firstEnemyHp / dps;
    const simulatedTtk = secondsUntilFirstKill();

    expect(analyticTtk).toBeGreaterThanOrEqual(20);
    expect(analyticTtk).toBeLessThanOrEqual(35);
    expect(simulatedTtk).toBeGreaterThanOrEqual(20);
    expect(simulatedTtk).toBeLessThanOrEqual(35);
  });

  it("first Snailguard upgrade takes 2-4 minutes (120-240 seconds)", () => {
    const seconds = secondsUntilFirstUpgradeAffordable();
    expect(seconds).toBeGreaterThanOrEqual(120);
    expect(seconds).toBeLessThanOrEqual(240);
  });

  it("new-player multipliers no longer speed up DPS or XP", () => {
    expect(getNewPlayerDpsMult(0)).toBe(1);
    expect(getNewPlayerXpMult(0)).toBe(1);
    expect(getNewPlayerMesosMult(0)).toBeCloseTo(0.38, 2);
    expect(getNewPlayerMesosMult(301)).toBe(1);
  });

  it("passive mesos is heavily throttled during the first minute", () => {
    const dps = getHeroDps("snailguard", 1);
    const mps = getMesosPerSecond(freshState(), HENESYS, null, dps) * getNewPlayerMesosMult(0);
    // Pass 3: target ~0.3-0.6 mps with tutorial mult; the formula is now
    // 0.5 + dps*0.07 base, then heavily reduced by the tutorial mult.
    expect(mps).toBeGreaterThan(0.15);
    expect(mps).toBeLessThan(0.55);
  });
});

describe("IdleStory early simulation windows", () => {
  it("after 60 seconds player is still level 1 and cannot spam upgrades", () => {
    const state60 = simulateSeconds(60);
    expect(state60.level).toBe(1);
    expect(state60.stage).toBeLessThanOrEqual(4);
    expect(state60.mesos).toBeLessThan(SNAILGUARD_LV2_COST);
  });

  it("after 5 minutes progression is modest and boss is still a milestone", () => {
    const state300 = simulateSeconds(300);
    const fiveUpgradeCombo = [1, 2, 3, 4, 5]
      .reduce((sum, level) => sum + getHeroCost("snailguard", level), 0);

    expect(state300.level).toBeLessThanOrEqual(2);
    expect(state300.stage).toBeGreaterThanOrEqual(7);
    expect(state300.stage).toBeLessThanOrEqual(10);
    expect(state300.mesos).toBeLessThan(fiveUpgradeCombo);
  });

  it("after 15 minutes progression grows but does not explode", () => {
    const state900 = simulateSeconds(900);
    expect(state900.level).toBeGreaterThanOrEqual(1);
    expect(state900.level).toBeLessThanOrEqual(3);
    expect(state900.stage).toBeGreaterThanOrEqual(14);
    expect(state900.stage).toBeLessThanOrEqual(24);
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
    expect(result.kills).toBeLessThanOrEqual(3000);
  });
});
