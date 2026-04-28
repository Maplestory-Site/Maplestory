import { describe, expect, it } from "vitest";
import { DEFAULT_STATE, type WorldZone } from "../gameEngine";
import {
  getEnemyAttackIntervalMs,
  getEnemyAttackPerSecond,
  getEnemyProgress,
  initEnemyHp,
  isBossStage,
  isEliteStage
} from "../combatSystem";

const TEST_ZONE: WorldZone = {
  id: "test-zone",
  name: "Test Zone",
  region: "Maple World",
  requirement: 18,
  rewardBoost: 1.35,
  color: "#77aaff"
};

describe("timer-independent combat calculations", () => {
  it("detects elite and boss stage cadence correctly", () => {
    expect(isEliteStage(9)).toBe(true);
    expect(isEliteStage(10)).toBe(false);
    expect(isBossStage(10)).toBe(true);
    expect(isBossStage(11)).toBe(false);
  });

  it("clamps enemy HP initialization to valid saved range", () => {
    const fresh = initEnemyHp(4, TEST_ZONE);
    const fromValidSave = initEnemyHp(4, TEST_ZONE, Math.floor(fresh.enemyMaxHp / 2));
    const fromInvalidSave = initEnemyHp(4, TEST_ZONE, fresh.enemyMaxHp + 999);

    expect(fromValidSave.enemyHp).toBe(Math.floor(fresh.enemyMaxHp / 2));
    expect(fromInvalidSave.enemyHp).toBe(fresh.enemyMaxHp);
    expect(fromInvalidSave.enemyMaxHp).toBe(fresh.enemyMaxHp);
  });

  it("keeps attack pacing bounded and scales with encounter danger", () => {
    const normalDps = getEnemyAttackPerSecond(26, TEST_ZONE, "normal");
    const eliteDps = getEnemyAttackPerSecond(26, TEST_ZONE, "elite");
    const bossDps = getEnemyAttackPerSecond(26, TEST_ZONE, "boss");
    const normalInterval = getEnemyAttackIntervalMs(26, TEST_ZONE, "normal");
    const eliteInterval = getEnemyAttackIntervalMs(26, TEST_ZONE, "elite");
    const bossInterval = getEnemyAttackIntervalMs(26, TEST_ZONE, "boss");

    expect(eliteDps).toBeGreaterThan(normalDps);
    expect(bossDps).toBeGreaterThan(eliteDps);
    expect(normalInterval).toBeGreaterThan(eliteInterval);
    expect(eliteInterval).toBeGreaterThan(bossInterval);
    expect(bossInterval).toBeGreaterThanOrEqual(460);
  });

  it("reports enemy progress as a stable percentage", () => {
    const state = {
      ...DEFAULT_STATE,
      enemyMaxHp: 200,
      enemyHp: 50
    };

    expect(getEnemyProgress(state)).toBe(75);
  });
});
