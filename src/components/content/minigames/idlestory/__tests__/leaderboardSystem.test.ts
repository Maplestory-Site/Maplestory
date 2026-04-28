import { describe, expect, it } from "vitest";
import {
  DEFAULT_LEADERBOARD_STATE,
  buildLeaderboardEntries,
  buildWeeklyEntries,
  syncLeaderboardState,
  updateLeaderboardRanks,
  type SocialProfileSnapshot
} from "../leaderboardSystem";

const PROFILE_A: SocialProfileSnapshot = {
  userId: "a",
  username: "Alpha",
  level: 22,
  power: 1800,
  stage: 70,
  bossKills: 9,
  goldEarned: 45000,
  weeklyStage: 78,
  weeklyBossClears: 3,
  updatedAt: "2026-03-04T12:00:00.000Z"
};

const PROFILE_B: SocialProfileSnapshot = {
  userId: "b",
  username: "Bravo",
  level: 20,
  power: 1800,
  stage: 68,
  bossKills: 12,
  goldEarned: 52000,
  weeklyStage: 76,
  weeklyBossClears: 5,
  updatedAt: "2026-03-05T12:00:00.000Z"
};

const PROFILE_C: SocialProfileSnapshot = {
  userId: "c",
  username: "Charlie",
  level: 28,
  power: 2100,
  stage: 83,
  bossKills: 11,
  goldEarned: 48000,
  weeklyStage: 90,
  weeklyBossClears: 4,
  updatedAt: "2026-03-01T12:00:00.000Z"
};

describe("leaderboard rank helpers", () => {
  it("keeps best metrics monotonic and merges rank updates", () => {
    const base = {
      ...DEFAULT_LEADERBOARD_STATE,
      bestLevel: 25,
      bestPower: 1600,
      bestStage: 60,
      bestBossKills: 10,
      bestGoldEarned: 30000,
      currentRanks: { level: 8 }
    };

    const synced = syncLeaderboardState(
      base,
      { level: 23, power: 2000, stage: 72, bossKills: 9, goldEarned: 35000 },
      111
    );
    const ranked = updateLeaderboardRanks(synced, { power: 4, bossKills: 2 }, 222);

    expect(synced.bestLevel).toBe(25);
    expect(synced.bestPower).toBe(2000);
    expect(synced.bestStage).toBe(72);
    expect(synced.bestBossKills).toBe(10);
    expect(synced.bestGoldEarned).toBe(35000);
    expect(ranked.currentRanks.level).toBe(8);
    expect(ranked.currentRanks.power).toBe(4);
    expect(ranked.currentRanks.bossKills).toBe(2);
    expect(ranked.lastSyncAt).toBe(222);
  });

  it("sorts leaderboard entries by score then updatedAt tie-breaker", () => {
    const entries = buildLeaderboardEntries([PROFILE_A, PROFILE_B, PROFILE_C], "power", "b");

    expect(entries[0]?.userId).toBe("c");
    expect(entries[1]?.userId).toBe("b");
    expect(entries[2]?.userId).toBe("a");
    expect(entries[1]?.isCurrentPlayer).toBe(true);
    expect(entries[1]?.rank).toBe(2);
  });

  it("builds weekly entries with descending score and rank-linked rewards", () => {
    const entries = buildWeeklyEntries([PROFILE_A, PROFILE_B, PROFILE_C], "a");

    expect(entries[0]?.userId).toBe("c");
    expect(entries[1]?.userId).toBe("b");
    expect(entries[2]?.userId).toBe("a");
    expect(entries[0]?.reward.crystals).toBeGreaterThanOrEqual(entries[1]?.reward.crystals ?? 0);
    expect(entries[2]?.isCurrentPlayer).toBe(true);
  });
});
