import { afterEach, describe, expect, it } from "vitest";
import {
  DEFAULT_STATE,
  FALLBACK_ZONES,
  loadGameState,
  prestigeWorld,
  raidBoss,
  rebirthWorld,
  saveGameState,
  type IdleGameState
} from "../gameEngine";
import { getEnemyMaxHp } from "../combatSystem";

const STORAGE_KEY = "snailslayer-idlestory-world";

class MemoryStorage {
  private map = new Map<string, string>();

  getItem(key: string): string | null {
    return this.map.has(key) ? this.map.get(key) ?? null : null;
  }

  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }

  removeItem(key: string): void {
    this.map.delete(key);
  }

  clear(): void {
    this.map.clear();
  }
}

function installWindowMock() {
  const localStorage = new MemoryStorage();
  const mockWindow = {
    localStorage,
    setTimeout: globalThis.setTimeout,
    clearTimeout: globalThis.clearTimeout
  };
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    writable: true,
    value: mockWindow
  });
  return localStorage;
}

function createState(overrides: Partial<IdleGameState> = {}): IdleGameState {
  return {
    ...structuredClone(DEFAULT_STATE),
    ...overrides
  };
}

afterEach(() => {
  Reflect.deleteProperty(globalThis, "window");
});

describe("gameEngine save/load normalization", () => {
  it("persists save state with an updated lastSavedAt timestamp", () => {
    const storage = installWindowMock();
    const state = createState({ lastSavedAt: 1 });
    saveGameState(state);

    const raw = storage.getItem(STORAGE_KEY);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw ?? "{}") as IdleGameState;
    expect(parsed.level).toBe(state.level);
    expect(parsed.lastSavedAt).toBeGreaterThan(1);
  });

  it("normalizes malformed save slices into safe defaults", () => {
    const storage = installWindowMock();
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        stage: "12",
        inventory: "bad-data",
        materials: { shard: -8, essence: 5.9, crystal: Number.NaN, bossCore: 2.7 },
        dailyChallenges: { challenges: "broken" },
        weeklyGoal: { milestoneClaims: [-3, 1.9, "bad", 5] },
        comebackReward: { reward: { mesos: -50, fame: 6.8, crystals: "invalid" } },
        pvpState: { lastResults: "invalid" },
        skillCooldowns: null,
        activeBuffs: null
      })
    );

    const loaded = loadGameState();
    expect(loaded.stage).toBe(12);
    expect(loaded.materials).toEqual({ shard: 0, essence: 5, crystal: 0, bossCore: 2 });
    expect(Array.isArray(loaded.inventory)).toBe(true);
    expect(Array.isArray(loaded.dailyChallenges.challenges)).toBe(true);
    expect(
      loaded.weeklyGoal.milestoneClaims.every((value) => Number.isInteger(value) && value >= 0)
    ).toBe(true);
    expect(loaded.comebackReward.reward?.mesos).toBe(0);
    expect(loaded.comebackReward.reward?.fame).toBe(6);
    expect(loaded.comebackReward.reward?.crystals).toBe(0);
    expect(Array.isArray(loaded.pvpState.lastResults)).toBe(true);
    expect(loaded.skillCooldowns).toEqual({});
    expect(loaded.activeBuffs).toEqual([]);
  });

  it("falls back to default state when persisted JSON is invalid", () => {
    const storage = installWindowMock();
    storage.setItem(STORAGE_KEY, "{");

    const loaded = loadGameState();
    expect(loaded.zone).toBe(DEFAULT_STATE.zone);
    expect(loaded.stage).toBe(DEFAULT_STATE.stage);
    expect(loaded.heroLevels).toEqual(DEFAULT_STATE.heroLevels);
  });
});

describe("gameEngine progression resets", () => {
  it("preserves long-term layers on prestige while resetting stage progression", () => {
    const state = createState({
      crystals: 36,
      level: 30,
      classId: "mage",
      stage: 34,
      zone: FALLBACK_ZONES[2]?.id ?? DEFAULT_STATE.zone,
      talentPoints: 4,
      materials: { shard: 12, essence: 4, crystal: 1, bossCore: 1 },
      globalMults: { gold_income: 2, dps_amp: 1, xp_boost: 1, crystal_luck: 0 }
    });

    const result = prestigeWorld(state, FALLBACK_ZONES);
    expect(result.success).toBe(true);
    expect(result.state.prestigeCount).toBe(state.prestigeCount + 1);
    expect(result.state.stage).toBe(1);
    expect(result.state.zone).toBe(FALLBACK_ZONES[0]?.id ?? state.zone);
    expect(result.state.classId).toBe("mage");
    expect(result.state.materials).toEqual(state.materials);
    expect(result.state.globalMults).toEqual(state.globalMults);
    expect(result.state.talentPoints).toBeGreaterThan(state.talentPoints ?? 0);
  });

  it("rebirth resets run layers while keeping relic and material investment", () => {
    const state = createState({
      level: 60,
      crystals: 140,
      relics: 15,
      classId: "warrior",
      prestigeCount: 3,
      talentPoints: 2,
      materials: { shard: 45, essence: 12, crystal: 3, bossCore: 2 }
    });

    const result = rebirthWorld(state, FALLBACK_ZONES);
    expect(result.success).toBe(true);
    expect(result.state.rebirthCount).toBe(state.rebirthCount + 1);
    expect(result.state.prestigeCount).toBe(DEFAULT_STATE.prestigeCount);
    expect(result.state.classId).toBe(DEFAULT_STATE.classId);
    expect(result.state.materials).toEqual(state.materials);
    expect(result.state.relics).toBeGreaterThan(state.relics);
    expect(result.state.talentPoints).toBeGreaterThan(state.talentPoints ?? 0);
  });
});

describe("gameEngine boss kill flow", () => {
  it("applies burst damage without stage advance when the enemy survives", () => {
    const state = createState({
      level: 1,
      stage: 9,
      enemyHp: 5000,
      enemyMaxHp: 5000
    });
    const result = raidBoss(state, FALLBACK_ZONES[0] ?? FALLBACK_ZONES[1], "Boss", () => 100);

    expect(result.success).toBe(true);
    expect(result.state.stage).toBe(9);
    expect(result.state.enemyHp).toBeGreaterThan(0);
    expect(result.state.enemyHp).toBeLessThan(5000);
  });

  it("awards rewards and advances stage on lethal boss burst", () => {
    const zone = FALLBACK_ZONES[0] ?? FALLBACK_ZONES[1];
    const state = createState({
      level: 8,
      stage: 10,
      enemyHp: 90,
      enemyMaxHp: 90,
      mesos: 1200,
      crystals: 2,
      lifetimeBossKills: 0
    });
    const result = raidBoss(state, zone, "Boss", () => 120);
    const expectedHp = getEnemyMaxHp(state.stage + 1, zone);

    expect(result.success).toBe(true);
    expect(result.state.stage).toBe(11);
    expect(result.state.enemyHp).toBe(expectedHp);
    expect(result.state.enemyMaxHp).toBe(expectedHp);
    expect(result.state.mesos).toBeGreaterThan(state.mesos);
    expect(result.state.crystals).toBeGreaterThan(state.crystals);
    expect(result.state.lifetimeBossKills).toBeGreaterThan(state.lifetimeBossKills);
  });
});
