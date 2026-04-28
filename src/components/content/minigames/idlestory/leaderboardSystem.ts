export type LeaderboardCategory =
  | "level"
  | "power"
  | "stage"
  | "bossKills"
  | "goldEarned";

export const LEADERBOARD_CATEGORIES: LeaderboardCategory[] = [
  "level",
  "power",
  "stage",
  "bossKills",
  "goldEarned"
];

export type SocialProfileSnapshot = {
  userId: string;
  username: string;
  guildId?: string | null;
  guildName?: string | null;
  level: number;
  power: number;
  stage: number;
  bossKills: number;
  goldEarned: number;
  weeklyStage: number;
  weeklyBossClears: number;
  updatedAt: string;
};

export type LeaderboardEntry = {
  rank: number;
  userId: string;
  username: string;
  guildName?: string | null;
  value: number;
  updatedAt: string;
  isCurrentPlayer?: boolean;
};

export type WeeklyReward = {
  mesos: number;
  crystals: number;
  fame: number;
  rarity: "rare" | "epic" | "legendary";
};

export type WeeklyRankingEntry = {
  rank: number;
  userId: string;
  username: string;
  guildName?: string | null;
  stageProgress: number;
  bossClears: number;
  score: number;
  reward: WeeklyReward;
  updatedAt: string;
  isCurrentPlayer?: boolean;
};

export type WeeklyRankingState = {
  weekKey: string;
  stageProgress: number;
  bossClears: number;
  claimedWeeks: string[];
  lastResolvedRank: number | null;
  lastRewardAt: number;
};

export type LeaderboardState = {
  selectedCategory: LeaderboardCategory;
  currentRanks: Partial<Record<LeaderboardCategory, number>>;
  bestLevel: number;
  bestPower: number;
  bestStage: number;
  bestBossKills: number;
  bestGoldEarned: number;
  lastSyncAt: number;
};

export const DEFAULT_LEADERBOARD_STATE: LeaderboardState = {
  selectedCategory: "power",
  currentRanks: {},
  bestLevel: 1,
  bestPower: 0,
  bestStage: 1,
  bestBossKills: 0,
  bestGoldEarned: 0,
  lastSyncAt: 0
};

export function createDefaultWeeklyRankingState(now = Date.now()): WeeklyRankingState {
  return {
    weekKey: getCurrentWeekKey(now),
    stageProgress: 1,
    bossClears: 0,
    claimedWeeks: [],
    lastResolvedRank: null,
    lastRewardAt: 0
  };
}

export function getLeaderboardValue(profile: SocialProfileSnapshot, category: LeaderboardCategory): number {
  switch (category) {
    case "level":
      return profile.level;
    case "power":
      return profile.power;
    case "stage":
      return profile.stage;
    case "bossKills":
      return profile.bossKills;
    case "goldEarned":
      return profile.goldEarned;
  }
}

export function syncLeaderboardState(
  state: LeaderboardState,
  snapshot: Pick<SocialProfileSnapshot, "level" | "power" | "stage" | "bossKills" | "goldEarned">,
  now = Date.now()
): LeaderboardState {
  return {
    ...state,
    bestLevel: Math.max(state.bestLevel, snapshot.level),
    bestPower: Math.max(state.bestPower, snapshot.power),
    bestStage: Math.max(state.bestStage, snapshot.stage),
    bestBossKills: Math.max(state.bestBossKills, snapshot.bossKills),
    bestGoldEarned: Math.max(state.bestGoldEarned, snapshot.goldEarned),
    lastSyncAt: now
  };
}

export function updateLeaderboardRanks(
  state: LeaderboardState,
  ranks: Partial<Record<LeaderboardCategory, number>>,
  now = Date.now()
): LeaderboardState {
  return {
    ...state,
    currentRanks: {
      ...state.currentRanks,
      ...ranks
    },
    lastSyncAt: now
  };
}

export function syncWeeklyRankingState(
  state: WeeklyRankingState,
  payload: { stageProgress: number; bossKillsGained: number },
  now = Date.now()
): WeeklyRankingState {
  const weekKey = getCurrentWeekKey(now);
  const base = state.weekKey === weekKey ? state : createDefaultWeeklyRankingState(now);

  return {
    ...base,
    stageProgress: Math.max(base.stageProgress, payload.stageProgress),
    bossClears: base.bossClears + Math.max(0, payload.bossKillsGained)
  };
}

export function setWeeklyResolvedRank(
  state: WeeklyRankingState,
  rank: number | null
): WeeklyRankingState {
  return {
    ...state,
    lastResolvedRank: rank
  };
}

export function claimWeeklyRewardState(
  state: WeeklyRankingState,
  now = Date.now()
): WeeklyRankingState {
  const weekKey = getCurrentWeekKey(now);
  if (state.claimedWeeks.includes(weekKey)) return state;
  return {
    ...state,
    claimedWeeks: [...state.claimedWeeks, weekKey],
    lastRewardAt: now
  };
}

export function canClaimWeeklyReward(state: WeeklyRankingState, now = Date.now()): boolean {
  const weekKey = getCurrentWeekKey(now);
  return !state.claimedWeeks.includes(weekKey) && state.lastResolvedRank !== null;
}

export function getWeeklyScore(stageProgress: number, bossClears: number): number {
  return stageProgress * 100 + bossClears * 750;
}

export function getWeeklyRewardForRank(rank: number): WeeklyReward {
  if (rank <= 1) {
    return { mesos: 180000, crystals: 18, fame: 80, rarity: "legendary" };
  }
  if (rank <= 3) {
    return { mesos: 120000, crystals: 12, fame: 54, rarity: "epic" };
  }
  if (rank <= 10) {
    return { mesos: 80000, crystals: 8, fame: 32, rarity: "epic" };
  }
  if (rank <= 25) {
    return { mesos: 45000, crystals: 4, fame: 18, rarity: "rare" };
  }
  return { mesos: 18000, crystals: 2, fame: 8, rarity: "rare" };
}

export function buildLeaderboardEntries(
  profiles: SocialProfileSnapshot[],
  category: LeaderboardCategory,
  currentUserId?: string
): LeaderboardEntry[] {
  return profiles
    .slice()
    .sort((left, right) => {
      const diff = getLeaderboardValue(right, category) - getLeaderboardValue(left, category);
      if (diff !== 0) return diff;
      return Date.parse(right.updatedAt) - Date.parse(left.updatedAt);
    })
    .map((profile, index) => ({
      rank: index + 1,
      userId: profile.userId,
      username: profile.username,
      guildName: profile.guildName,
      value: getLeaderboardValue(profile, category),
      updatedAt: profile.updatedAt,
      isCurrentPlayer: profile.userId === currentUserId
    }));
}

export function buildWeeklyEntries(
  profiles: SocialProfileSnapshot[],
  currentUserId?: string
): WeeklyRankingEntry[] {
  return profiles
    .slice()
    .sort((left, right) => {
      const diff = getWeeklyScore(right.weeklyStage, right.weeklyBossClears) - getWeeklyScore(left.weeklyStage, left.weeklyBossClears);
      if (diff !== 0) return diff;
      return Date.parse(right.updatedAt) - Date.parse(left.updatedAt);
    })
    .map((profile, index) => ({
      rank: index + 1,
      userId: profile.userId,
      username: profile.username,
      guildName: profile.guildName,
      stageProgress: profile.weeklyStage,
      bossClears: profile.weeklyBossClears,
      score: getWeeklyScore(profile.weeklyStage, profile.weeklyBossClears),
      reward: getWeeklyRewardForRank(index + 1),
      updatedAt: profile.updatedAt,
      isCurrentPlayer: profile.userId === currentUserId
    }));
}

export function getCurrentWeekKey(now = Date.now()): string {
  const date = new Date(now);
  const utcDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const weekday = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - weekday);
  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((utcDate.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${utcDate.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}
