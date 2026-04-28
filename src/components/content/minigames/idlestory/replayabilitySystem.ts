import type { IdleGameState } from "./gameEngine";

export type ReplayFeatureId =
  | "challenge_tiers"
  | "prestige_forge"
  | "void_rifts";

export type ReplayabilityState = {
  prestigeShards: number;
  challengeTier: number;
  highestChallengeTier: number;
  unlocked: Record<ReplayFeatureId, boolean>;
};

export type ReplayabilityBonuses = {
  dpsMult: number;
  goldMult: number;
  xpMult: number;
  crystalMult: number;
  difficultyMult: number;
  extraStartHeroLevels: number;
  extraStartGold: number;
};

export const DEFAULT_REPLAYABILITY_STATE: ReplayabilityState = {
  prestigeShards: 0,
  challengeTier: 0,
  highestChallengeTier: 0,
  unlocked: {
    challenge_tiers: false,
    prestige_forge: false,
    void_rifts: false
  }
};

export function syncReplayabilityState(
  replayability?: Partial<ReplayabilityState>
): ReplayabilityState {
  return {
    ...DEFAULT_REPLAYABILITY_STATE,
    ...(replayability ?? {}),
    unlocked: {
      ...DEFAULT_REPLAYABILITY_STATE.unlocked,
      ...((replayability ?? {}).unlocked ?? {})
    }
  };
}

export function calculatePrestigeShardsEarned(state: Pick<IdleGameState, "stage" | "crystals" | "prestigeCount" | "rebirthCount">): number {
  const stageFactor = Math.floor(Math.max(1, state.stage) / 12);
  const crystalFactor = Math.floor(Math.max(0, state.crystals) / 10);
  const rebirthFactor = state.rebirthCount * 2;
  return Math.max(1, 1 + stageFactor + crystalFactor + rebirthFactor);
}

export function getReplayFeatureUnlocks(prestigeCount: number, rebirthCount: number): Record<ReplayFeatureId, boolean> {
  return {
    challenge_tiers: prestigeCount >= 1,
    prestige_forge: prestigeCount >= 3,
    void_rifts: rebirthCount >= 1
  };
}

export function getChallengeTierCap(
  prestigeCount: number,
  rebirthCount: number,
  unlocked: Record<ReplayFeatureId, boolean>
): number {
  if (!unlocked.challenge_tiers) return 0;
  const prestigeCap = Math.min(4, 1 + Math.floor(prestigeCount / 2));
  const rebirthCap = unlocked.void_rifts ? 2 + rebirthCount : 0;
  return Math.min(8, prestigeCap + rebirthCap);
}

export function getReplayabilityBonuses(
  replayability: ReplayabilityState,
  prestigeCount: number,
  rebirthCount: number
): ReplayabilityBonuses {
  const shardPower = Math.sqrt(Math.max(0, replayability.prestigeShards));
  const forgeBonus = replayability.unlocked.prestige_forge ? 1 : 0;
  const difficultyMult =
    1
    + replayability.challengeTier * 0.18
    + Math.max(0, prestigeCount - 2) * 0.015
    + rebirthCount * 0.06;

  return {
    dpsMult: 1 + shardPower * 0.035 + forgeBonus * 0.08,
    goldMult: 1 + shardPower * 0.03 + replayability.challengeTier * 0.05,
    xpMult: 1 + shardPower * 0.025 + replayability.challengeTier * 0.04,
    crystalMult: 1 + replayability.challengeTier * 0.03 + rebirthCount * 0.04,
    difficultyMult,
    extraStartHeroLevels: forgeBonus + Math.floor(shardPower / 3),
    extraStartGold: replayability.unlocked.void_rifts ? 250 * Math.max(1, replayability.challengeTier) : 0
  };
}

export function applyPrestigeReplayability(
  replayability: ReplayabilityState,
  nextPrestigeCount: number,
  rebirthCount: number,
  shardsEarned: number
): { replayability: ReplayabilityState; unlocks: ReplayFeatureId[] } {
  const unlocked = getReplayFeatureUnlocks(nextPrestigeCount, rebirthCount);
  const previous = replayability.unlocked;
  const unlocks = (Object.keys(unlocked) as ReplayFeatureId[]).filter((key) => unlocked[key] && !previous[key]);
  const cap = getChallengeTierCap(nextPrestigeCount, rebirthCount, unlocked);

  return {
    replayability: {
      prestigeShards: replayability.prestigeShards + shardsEarned,
      challengeTier: cap,
      highestChallengeTier: Math.max(replayability.highestChallengeTier, cap),
      unlocked
    },
    unlocks
  };
}

export function applyRebirthReplayability(
  replayability: ReplayabilityState,
  prestigeCount: number,
  nextRebirthCount: number
): { replayability: ReplayabilityState; unlocks: ReplayFeatureId[] } {
  const unlocked = getReplayFeatureUnlocks(prestigeCount, nextRebirthCount);
  const previous = replayability.unlocked;
  const unlocks = (Object.keys(unlocked) as ReplayFeatureId[]).filter((key) => unlocked[key] && !previous[key]);
  const cap = getChallengeTierCap(prestigeCount, nextRebirthCount, unlocked);

  return {
    replayability: {
      ...replayability,
      challengeTier: cap,
      highestChallengeTier: Math.max(replayability.highestChallengeTier, cap),
      unlocked
    },
    unlocks
  };
}

export function formatReplayUnlocks(unlocks: ReplayFeatureId[]): string {
  if (unlocks.length === 0) return "";

  const labels: Record<ReplayFeatureId, string> = {
    challenge_tiers: "Challenge Tiers",
    prestige_forge: "Prestige Forge",
    void_rifts: "Void Rifts"
  };

  return unlocks.map((id) => labels[id]).join(", ");
}
