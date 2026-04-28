import type { IdleGameState } from "./gameEngine";

export type AchievementId =
  | "first_steps"
  | "slime_slayer"
  | "mob_grinder"
  | "boss_breaker"
  | "level_10"
  | "level_25"
  | "reborn";

export type MissionId = "kill_25" | "kill_100" | "reach_10" | "reach_25";

export type NotificationKind =
  | "daily"
  | "streak"
  | "achievement"
  | "mission"
  | "system"
  | "challenge"
  | "weekly"
  | "comeback";

export type GameNotification = {
  id: string;
  kind: NotificationKind;
  dedupeKey?: string;
  title: string;
  message: string;
  createdAt: number;
  read: boolean;
};

export type RewardBundle = {
  mesos: number;
  fame: number;
  crystals: number;
};

export type DailyRewardState = {
  lastClaimDay: string | null;
  streak: number;
  bestStreak: number;
  totalClaims: number;
  cycleDay: number;
};

export type AchievementState = Record<AchievementId, { unlocked: boolean; unlockedAt: number | null }>;
export type MissionProgress = Record<MissionId, { progress: number; completed: boolean; claimed: boolean }>;

export type MissionDefinition = {
  label: string;
  kind: "kills" | "level";
  target: number;
  reward: RewardBundle;
};

export type AchievementDefinition = {
  label: string;
  isUnlocked: (state: IdleGameState) => boolean;
};

export type DailyChallengeMetric = "kills" | "damage" | "boss_kills" | "gold" | "crits";

export type DailyChallengeDefinitionId =
  | "slayer_contract"
  | "damage_test"
  | "boss_hunt"
  | "gold_run"
  | "crit_combo"
  | "battle_surge";

export type DailyChallengeDefinition = {
  id: DailyChallengeDefinitionId;
  label: string;
  metric: DailyChallengeMetric;
  createTarget: (state: IdleGameState) => number;
  createReward: (state: IdleGameState) => RewardBundle;
};

export type DailyChallengeProgress = {
  slot: number;
  challengeId: DailyChallengeDefinitionId;
  label: string;
  metric: DailyChallengeMetric;
  target: number;
  progress: number;
  completed: boolean;
  claimed: boolean;
  reward: RewardBundle;
};

export type DailyChallengeState = {
  dayKey: string;
  challenges: DailyChallengeProgress[];
  completedToday: number;
  totalCompleted: number;
  lastResetAt: number;
};

export type WeeklyGoalMetric = "boss_kills" | "gold" | "levels" | "stage_clears";

export type WeeklyGoalDefinitionId =
  | "boss_legion"
  | "treasure_week"
  | "level_climb"
  | "stage_marathon";

export type WeeklyGoalDefinition = {
  id: WeeklyGoalDefinitionId;
  label: string;
  metric: WeeklyGoalMetric;
  createTarget: (state: IdleGameState) => number;
  createReward: (state: IdleGameState) => RewardBundle;
};

export type WeeklyGoalState = {
  weekKey: string;
  goalId: WeeklyGoalDefinitionId;
  label: string;
  metric: WeeklyGoalMetric;
  target: number;
  progress: number;
  reward: RewardBundle;
  milestoneClaims: number[];
  completed: boolean;
  completedWeeks: number;
  lastResetAt: number;
};

export type ComebackRewardState = {
  available: boolean;
  awaySeconds: number;
  reward: RewardBundle | null;
  lastEligibleAt: number | null;
  generatedAt: number | null;
  claimedAt: number | null;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const NOTIFICATION_LIMIT = 24;
const DAILY_CHALLENGE_SLOTS = 3;
const COMEBACK_MIN_AWAY_HOURS = 18;
const COMEBACK_MAX_EFFECTIVE_DAYS = 5;

const WEEKLY_MILESTONE_BREAKPOINTS = [0.33, 0.67, 1] as const;
const WEEKLY_MILESTONE_REWARD_WEIGHTS = [0.25, 0.35, 0.4] as const;

export const DAILY_REWARD_CYCLE: RewardBundle[] = [
  { mesos: 600, fame: 3, crystals: 0 },
  { mesos: 850, fame: 4, crystals: 0 },
  { mesos: 1200, fame: 5, crystals: 0 },
  { mesos: 1650, fame: 6, crystals: 0 },
  { mesos: 2200, fame: 8, crystals: 1 },
  { mesos: 2900, fame: 10, crystals: 1 },
  { mesos: 3800, fame: 13, crystals: 1 }
];

export const MISSION_DEFINITIONS: Record<MissionId, MissionDefinition> = {
  kill_25: { label: "Kill 70 enemies", kind: "kills", target: 70, reward: { mesos: 550, fame: 2, crystals: 0 } },
  kill_100: { label: "Kill 260 enemies", kind: "kills", target: 260, reward: { mesos: 2400, fame: 7, crystals: 1 } },
  reach_10: { label: "Reach level 15", kind: "level", target: 15, reward: { mesos: 1300, fame: 4, crystals: 0 } },
  reach_25: { label: "Reach level 35", kind: "level", target: 35, reward: { mesos: 5400, fame: 14, crystals: 1 } }
};

export const ACHIEVEMENT_DEFINITIONS: Record<AchievementId, AchievementDefinition> = {
  first_steps: { label: "First Steps", isUnlocked: (state) => state.level >= 2 },
  slime_slayer: { label: "Slime Slayer", isUnlocked: (state) => state.lifetimeKills >= 25 },
  mob_grinder: { label: "Mob Grinder", isUnlocked: (state) => state.lifetimeKills >= 100 },
  boss_breaker: { label: "Boss Breaker", isUnlocked: (state) => state.lifetimeBossKills >= 1 },
  level_10: { label: "Level 10", isUnlocked: (state) => state.level >= 10 },
  level_25: { label: "Level 25", isUnlocked: (state) => state.level >= 25 },
  reborn: { label: "Reborn", isUnlocked: (state) => state.rebirthCount >= 1 }
};

export const DAILY_CHALLENGE_DEFINITIONS: Record<DailyChallengeDefinitionId, DailyChallengeDefinition> = {
  slayer_contract: {
    id: "slayer_contract",
    label: "Defeat enemies",
    metric: "kills",
    createTarget: (state) => clampNumber(48 + state.level * 3, 48, 420),
    createReward: (state) => ({ mesos: 420 + state.level * 42, fame: 3 + Math.floor(state.level * 0.18), crystals: 0 })
  },
  damage_test: {
    id: "damage_test",
    label: "Deal damage",
    metric: "damage",
    createTarget: (state) => clampNumber(2200 + state.level * 420, 2200, 120000),
    createReward: (state) => ({ mesos: 500 + state.level * 46, fame: 3 + Math.floor(state.level * 0.19), crystals: 0 })
  },
  boss_hunt: {
    id: "boss_hunt",
    label: "Defeat bosses",
    metric: "boss_kills",
    createTarget: (state) => clampNumber(2 + Math.floor(state.level / 32), 2, 5),
    createReward: (state) => ({ mesos: 900 + state.level * 62, fame: 6 + Math.floor(state.level * 0.24), crystals: state.level >= 60 ? 1 : 0 })
  },
  gold_run: {
    id: "gold_run",
    label: "Earn mesos",
    metric: "gold",
    createTarget: (state) => clampNumber(5200 + state.level * 700, 5200, 120000),
    createReward: (state) => ({ mesos: 620 + state.level * 50, fame: 3 + Math.floor(state.level * 0.18), crystals: state.level >= 72 ? 1 : 0 })
  },
  crit_combo: {
    id: "crit_combo",
    label: "Land critical hits",
    metric: "crits",
    createTarget: (state) => clampNumber(24 + Math.floor(state.level * 1.2), 24, 180),
    createReward: (state) => ({ mesos: 650 + state.level * 52, fame: 4 + Math.floor(state.level * 0.2), crystals: state.level >= 80 ? 1 : 0 })
  },
  battle_surge: {
    id: "battle_surge",
    label: "Win combat rounds",
    metric: "kills",
    createTarget: (state) => clampNumber(70 + state.level * 3, 70, 460),
    createReward: (state) => ({ mesos: 760 + state.level * 58, fame: 4 + Math.floor(state.level * 0.22), crystals: state.level >= 85 ? 1 : 0 })
  }
};

export const WEEKLY_GOAL_DEFINITIONS: Record<WeeklyGoalDefinitionId, WeeklyGoalDefinition> = {
  boss_legion: {
    id: "boss_legion",
    label: "Defeat weekly bosses",
    metric: "boss_kills",
    createTarget: (state) => clampNumber(5 + Math.floor(state.level / 20) * 2, 5, 18),
    createReward: (state) => ({ mesos: 9000 + state.level * 520, fame: 35 + Math.floor(state.level * 1.1), crystals: 3 })
  },
  treasure_week: {
    id: "treasure_week",
    label: "Earn weekly mesos",
    metric: "gold",
    createTarget: (state) => clampNumber(46000 + state.level * 2600, 46000, 340000),
    createReward: (state) => ({ mesos: 11000 + state.level * 620, fame: 30 + Math.floor(state.level * 0.95), crystals: 2 })
  },
  level_climb: {
    id: "level_climb",
    label: "Gain weekly levels",
    metric: "levels",
    createTarget: (state) => clampNumber(4 + Math.floor(state.level / 25), 4, 10),
    createReward: (state) => ({ mesos: 9800 + state.level * 560, fame: 38 + Math.floor(state.level * 1.2), crystals: 3 })
  },
  stage_marathon: {
    id: "stage_marathon",
    label: "Clear weekly stages",
    metric: "stage_clears",
    createTarget: (state) => clampNumber(95 + state.level * 4, 95, 320),
    createReward: (state) => ({ mesos: 8500 + state.level * 500, fame: 32 + Math.floor(state.level * 1.05), crystals: 2 })
  }
};

export const DEFAULT_DAILY_REWARD: DailyRewardState = {
  lastClaimDay: null,
  streak: 0,
  bestStreak: 0,
  totalClaims: 0,
  cycleDay: 1
};

export const DEFAULT_ACHIEVEMENTS: AchievementState = {
  first_steps: { unlocked: false, unlockedAt: null },
  slime_slayer: { unlocked: false, unlockedAt: null },
  mob_grinder: { unlocked: false, unlockedAt: null },
  boss_breaker: { unlocked: false, unlockedAt: null },
  level_10: { unlocked: false, unlockedAt: null },
  level_25: { unlocked: false, unlockedAt: null },
  reborn: { unlocked: false, unlockedAt: null }
};

export const DEFAULT_MISSIONS: MissionProgress = {
  kill_25: { progress: 0, completed: false, claimed: false },
  kill_100: { progress: 0, completed: false, claimed: false },
  reach_10: { progress: 1, completed: false, claimed: false },
  reach_25: { progress: 1, completed: false, claimed: false }
};

export const DEFAULT_DAILY_CHALLENGES: DailyChallengeState = {
  dayKey: "",
  challenges: [],
  completedToday: 0,
  totalCompleted: 0,
  lastResetAt: 0
};

export const DEFAULT_WEEKLY_GOAL: WeeklyGoalState = {
  weekKey: "",
  goalId: "stage_marathon",
  label: "Clear weekly stages",
  metric: "stage_clears",
  target: 100,
  progress: 0,
  reward: { mesos: 9000, fame: 32, crystals: 2 },
  milestoneClaims: [],
  completed: false,
  completedWeeks: 0,
  lastResetAt: 0
};

export const DEFAULT_COMEBACK_REWARD: ComebackRewardState = {
  available: false,
  awaySeconds: 0,
  reward: null,
  lastEligibleAt: null,
  generatedAt: null,
  claimedAt: null
};

type RetentionDelta = {
  kills?: number;
  bossKills?: number;
  mesosGained?: number;
  damageDealt?: number;
  critHits?: number;
  stageClears?: number;
  levelGains?: number;
  now?: number;
};

type DailyChallengeTickResult = {
  state: DailyChallengeState;
  reward: RewardBundle;
  completed: DailyChallengeProgress[];
};

type WeeklyGoalTickResult = {
  state: WeeklyGoalState;
  reward: RewardBundle;
  claimedMilestones: number[];
};

function clampNumber(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function sanitizeTimestamp(value: unknown, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  const min = Date.UTC(2020, 0, 1);
  const max = Date.now() + 5 * 365 * DAY_MS;
  return clampNumber(parsed, min, max);
}

function toWhole(value: unknown, minimum = 0): number {
  const parsed = Math.floor(Number(value));
  if (!Number.isFinite(parsed)) return minimum;
  return Math.max(minimum, parsed);
}

function createZeroReward(): RewardBundle {
  return { mesos: 0, fame: 0, crystals: 0 };
}

function mergeRewards(left: RewardBundle, right: RewardBundle): RewardBundle {
  return {
    mesos: left.mesos + right.mesos,
    fame: left.fame + right.fame,
    crystals: left.crystals + right.crystals
  };
}

function scaleReward(bundle: RewardBundle, scalar: number): RewardBundle {
  return {
    mesos: Math.floor(bundle.mesos * scalar),
    fame: Math.max(1, Math.floor(bundle.fame * scalar)),
    crystals: Math.floor(bundle.crystals * scalar)
  };
}

function applyRewardBundle(state: IdleGameState, reward: RewardBundle): IdleGameState {
  if (reward.mesos <= 0 && reward.fame <= 0 && reward.crystals <= 0) return state;
  return {
    ...state,
    mesos: state.mesos + reward.mesos,
    fame: state.fame + reward.fame,
    crystals: Math.min(500, state.crystals + reward.crystals)
  };
}

function formatReward(bundle: RewardBundle): string {
  const parts: string[] = [];
  if (bundle.mesos > 0) parts.push(`+${Math.floor(bundle.mesos).toLocaleString()} mesos`);
  if (bundle.fame > 0) parts.push(`+${Math.floor(bundle.fame).toLocaleString()} fame`);
  if (bundle.crystals > 0) parts.push(`+${Math.floor(bundle.crystals).toLocaleString()} crystals`);
  return parts.join(", ");
}

function getMetricDelta(metric: DailyChallengeMetric, progress: RetentionDelta): number {
  switch (metric) {
    case "kills":
      return toWhole(progress.kills, 0);
    case "damage":
      return toWhole(progress.damageDealt, 0);
    case "boss_kills":
      return toWhole(progress.bossKills, 0);
    case "gold":
      return toWhole(progress.mesosGained, 0);
    case "crits":
      return toWhole(progress.critHits, 0);
    default:
      return 0;
  }
}

function getWeeklyMetricDelta(metric: WeeklyGoalMetric, progress: RetentionDelta): number {
  switch (metric) {
    case "boss_kills":
      return toWhole(progress.bossKills, 0);
    case "gold":
      return toWhole(progress.mesosGained, 0);
    case "levels":
      return toWhole(progress.levelGains, 0);
    case "stage_clears":
      return toWhole(progress.stageClears, 0);
    default:
      return 0;
  }
}

function hashString(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function pickSeededUnique<T>(pool: T[], count: number, seed: number): T[] {
  const source = [...pool];
  const picked: T[] = [];
  let cursor = seed || 1;

  while (source.length > 0 && picked.length < count) {
    cursor = Math.imul(cursor ^ 0x9e3779b9, 1664525) + 1013904223;
    const idx = Math.abs(cursor) % source.length;
    const next = source.splice(idx, 1)[0];
    if (next !== undefined) picked.push(next);
  }

  return picked;
}

export function getLocalDayKey(now = Date.now()): string {
  const date = new Date(now);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getLocalWeekKey(now = Date.now()): string {
  const date = new Date(now);
  date.setHours(0, 0, 0, 0);
  const dayOffset = (date.getDay() + 6) % 7; // Monday-based week start
  date.setDate(date.getDate() - dayOffset);
  return getLocalDayKey(date.getTime());
}

function getSecondsUntilNextDailyReset(now = Date.now()): number {
  const next = new Date(now);
  next.setHours(24, 0, 0, 0);
  return Math.max(1, Math.floor((next.getTime() - now) / 1000));
}

function getSecondsUntilNextWeeklyReset(now = Date.now()): number {
  const next = new Date(now);
  next.setHours(0, 0, 0, 0);
  const dayOffset = (next.getDay() + 6) % 7;
  next.setDate(next.getDate() - dayOffset + 7);
  return Math.max(1, Math.floor((next.getTime() - now) / 1000));
}

function isPreviousDay(dayKey: string | null, now: number): boolean {
  if (!dayKey) return false;
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  return dayKey === getLocalDayKey(yesterday.getTime());
}

function createDailyChallengeState(state: IdleGameState, dayKey: string, now: number): DailyChallengeState {
  const definitions = Object.values(DAILY_CHALLENGE_DEFINITIONS);
  const seed = hashString(`${dayKey}:${state.level}:${state.prestigeCount}:${state.rebirthCount}`);
  const picked = pickSeededUnique(definitions, DAILY_CHALLENGE_SLOTS, seed);

  return {
    dayKey,
    challenges: picked.map((definition, slot) => ({
      slot,
      challengeId: definition.id,
      label: definition.label,
      metric: definition.metric,
      target: Math.max(1, Math.floor(definition.createTarget(state))),
      progress: 0,
      completed: false,
      claimed: false,
      reward: definition.createReward(state)
    })),
    completedToday: 0,
    totalCompleted: state.dailyChallenges?.totalCompleted ?? 0,
    lastResetAt: now
  };
}

function createWeeklyGoalState(state: IdleGameState, weekKey: string, now: number): WeeklyGoalState {
  const definitions = Object.values(WEEKLY_GOAL_DEFINITIONS);
  const seed = hashString(`${weekKey}:${state.level}:${state.prestigeCount}:${state.rebirthCount}`);
  const picked = pickSeededUnique(definitions, 1, seed)[0] ?? definitions[0];

  return {
    weekKey,
    goalId: picked.id,
    label: picked.label,
    metric: picked.metric,
    target: Math.max(1, Math.floor(picked.createTarget(state))),
    progress: 0,
    reward: picked.createReward(state),
    milestoneClaims: [],
    completed: false,
    completedWeeks: state.weeklyGoal?.completedWeeks ?? 0,
    lastResetAt: now
  };
}

function syncRecurringRetention(state: IdleGameState, now: number): IdleGameState {
  let next = {
    ...state,
    dailyReward: {
      ...DEFAULT_DAILY_REWARD,
      ...(state.dailyReward ?? {})
    },
    dailyChallenges: {
      ...DEFAULT_DAILY_CHALLENGES,
      ...(state.dailyChallenges ?? {}),
      challenges: Array.isArray(state.dailyChallenges?.challenges)
        ? state.dailyChallenges.challenges
        : []
    },
    weeklyGoal: {
      ...DEFAULT_WEEKLY_GOAL,
      ...(state.weeklyGoal ?? {}),
      milestoneClaims: Array.isArray(state.weeklyGoal?.milestoneClaims)
        ? state.weeklyGoal?.milestoneClaims.filter((value) => Number.isFinite(value)).map((value) => Math.max(0, Math.floor(value)))
        : []
    },
    comebackReward: {
      ...DEFAULT_COMEBACK_REWARD,
      ...(state.comebackReward ?? {}),
      reward: state.comebackReward?.reward
        ? {
            mesos: toWhole(state.comebackReward.reward.mesos, 0),
            fame: toWhole(state.comebackReward.reward.fame, 0),
            crystals: toWhole(state.comebackReward.reward.crystals, 0)
          }
        : null
    }
  };

  const dayKey = getLocalDayKey(now);
  if (next.dailyChallenges.dayKey !== dayKey || next.dailyChallenges.challenges.length === 0) {
    const previousDayKey = next.dailyChallenges.dayKey;
    const previousTotalCompleted = next.dailyChallenges.totalCompleted;
    const refreshed = createDailyChallengeState(next, dayKey, now);
    next = {
      ...next,
      dailyChallenges: {
        ...refreshed,
        totalCompleted: previousTotalCompleted
      }
    };
    if (previousDayKey && previousDayKey !== dayKey) {
      next = pushNotification(
        next,
        "challenge",
        "Daily challenges reset",
        "Three fresh daily goals are ready.",
        now,
        `daily-challenge-reset-${dayKey}`
      );
    }
  }

  const weekKey = getLocalWeekKey(now);
  if (next.weeklyGoal.weekKey !== weekKey || !next.weeklyGoal.goalId) {
    const previousWeekKey = next.weeklyGoal.weekKey;
    const previousCompletedWeeks = next.weeklyGoal.completedWeeks;
    const refreshed = createWeeklyGoalState(next, weekKey, now);
    next = {
      ...next,
      weeklyGoal: {
        ...refreshed,
        completedWeeks: previousCompletedWeeks
      }
    };

    if (previousWeekKey && previousWeekKey !== weekKey) {
      next = pushNotification(
        next,
        "weekly",
        "Weekly milestone refreshed",
        `${next.weeklyGoal.label} is now active.`,
        now,
        `weekly-goal-reset-${weekKey}`
      );
    }
  }

  return next;
}

function applyDailyChallengeProgress(
  dailyState: DailyChallengeState,
  progress: RetentionDelta
): DailyChallengeTickResult {
  let reward = createZeroReward();
  const completedNow: DailyChallengeProgress[] = [];

  const challenges = dailyState.challenges.map((challenge) => {
    if (challenge.claimed) return challenge;

    const delta = getMetricDelta(challenge.metric, progress);
    if (delta <= 0) return challenge;

    const nextProgress = Math.min(challenge.target, challenge.progress + delta);
    const justCompleted = nextProgress >= challenge.target;

    if (!justCompleted) {
      return {
        ...challenge,
        progress: nextProgress
      };
    }

    const completedChallenge: DailyChallengeProgress = {
      ...challenge,
      progress: challenge.target,
      completed: true,
      claimed: true
    };

    reward = mergeRewards(reward, completedChallenge.reward);
    completedNow.push(completedChallenge);
    return completedChallenge;
  });

  return {
    state: {
      ...dailyState,
      challenges,
      completedToday: dailyState.completedToday + completedNow.length,
      totalCompleted: dailyState.totalCompleted + completedNow.length
    },
    reward,
    completed: completedNow
  };
}

function applyWeeklyGoalProgress(
  weeklyGoal: WeeklyGoalState,
  progress: RetentionDelta
): WeeklyGoalTickResult {
  const delta = getWeeklyMetricDelta(weeklyGoal.metric, progress);
  if (delta <= 0 || weeklyGoal.completed) {
    return {
      state: weeklyGoal,
      reward: createZeroReward(),
      claimedMilestones: []
    };
  }

  const nextProgress = Math.min(weeklyGoal.target, weeklyGoal.progress + delta);
  const claimedMilestones = [...weeklyGoal.milestoneClaims];
  const justClaimed: number[] = [];
  let reward = createZeroReward();

  WEEKLY_MILESTONE_BREAKPOINTS.forEach((breakpoint, index) => {
    const threshold = Math.max(1, Math.ceil(weeklyGoal.target * breakpoint));
    if (nextProgress < threshold) return;
    if (claimedMilestones.includes(index)) return;

    claimedMilestones.push(index);
    justClaimed.push(index);
    reward = mergeRewards(
      reward,
      scaleReward(weeklyGoal.reward, WEEKLY_MILESTONE_REWARD_WEIGHTS[index] ?? 0)
    );
  });

  const completed = nextProgress >= weeklyGoal.target;

  return {
    state: {
      ...weeklyGoal,
      progress: nextProgress,
      milestoneClaims: claimedMilestones,
      completed,
      completedWeeks: weeklyGoal.completedWeeks + (completed && !weeklyGoal.completed ? 1 : 0)
    },
    reward,
    claimedMilestones: justClaimed
  };
}

function buildComebackReward(state: IdleGameState, awayHours: number): RewardBundle {
  const effectiveDays = clampNumber(Math.floor(awayHours / 24), 1, COMEBACK_MAX_EFFECTIVE_DAYS);
  const levelScale = 1 + Math.min(0.65, (state.level - 1) * 0.015);
  const prestigeScale = 1 + Math.min(0.4, state.prestigeCount * 0.05 + state.rebirthCount * 0.04);
  const baseMesos = 1800 + state.level * 120;
  const mesos = Math.floor(baseMesos * levelScale * prestigeScale * (0.75 + effectiveDays * 0.45));
  const fame = Math.max(6, Math.floor((5 + state.level * 0.35) * (0.8 + effectiveDays * 0.32)));
  const crystals = effectiveDays >= 2 ? Math.min(3, 1 + Math.floor((effectiveDays - 2) / 2)) : 0;

  return { mesos, fame, crystals };
}

export function pushNotification(
  state: IdleGameState,
  kind: NotificationKind,
  title: string,
  message: string,
  now = Date.now(),
  dedupeKey?: string
): IdleGameState {
  if (dedupeKey && state.notifications.some((notification) => notification.dedupeKey === dedupeKey)) {
    return state;
  }

  const notification: GameNotification = {
    id: `${kind}-${now}-${state.notifications.length}`,
    kind,
    dedupeKey,
    title,
    message,
    createdAt: now,
    read: false
  };

  return {
    ...state,
    notifications: [notification, ...state.notifications].slice(0, NOTIFICATION_LIMIT)
  };
}

export function getClaimableMissionIds(state: IdleGameState): MissionId[] {
  return (Object.keys(MISSION_DEFINITIONS) as MissionId[]).filter((id) => {
    const mission = state.missions[id];
    return mission.completed && !mission.claimed;
  });
}

export function getUnreadNotificationCount(state: IdleGameState): number {
  return state.notifications.filter((notification) => !notification.read).length;
}

export function getCompletedAchievementCount(state: IdleGameState): number {
  return Object.values(state.achievements).filter((achievement) => achievement.unlocked).length;
}

export function isDailyRewardAvailable(state: IdleGameState, now = Date.now()): boolean {
  return state.dailyReward.lastClaimDay !== getLocalDayKey(now);
}

export function getRetentionSummary(state: IdleGameState, now = Date.now()) {
  const safeNow = sanitizeTimestamp(now, Date.now());
  const claimableMissionIds = getClaimableMissionIds(state);
  const unreadNotifications = getUnreadNotificationCount(state);
  const completedAchievements = getCompletedAchievementCount(state);
  const dailyChallengeList = state.dailyChallenges?.challenges ?? [];
  const completedChallenges = dailyChallengeList.filter((challenge) => challenge.completed).length;
  const weeklyGoal = state.weeklyGoal ?? DEFAULT_WEEKLY_GOAL;
  const weeklyPct = Math.max(0, Math.min(100, (weeklyGoal.progress / Math.max(1, weeklyGoal.target)) * 100));

  return {
    dailyAvailable: isDailyRewardAvailable(state, safeNow),
    claimableMissionIds,
    unreadNotifications,
    completedAchievements,
    totalAchievements: Object.keys(ACHIEVEMENT_DEFINITIONS).length,
    dailyCycleDay: state.dailyReward.cycleDay,
    dailyChallenges: dailyChallengeList,
    dailyChallengesCompleted: completedChallenges,
    dailyChallengesTotal: dailyChallengeList.length,
    dailyChallengeResetSeconds: getSecondsUntilNextDailyReset(safeNow),
    weeklyGoal,
    weeklyGoalProgressPct: weeklyPct,
    weeklyGoalResetSeconds: getSecondsUntilNextWeeklyReset(safeNow),
    comebackRewardAvailable: Boolean(state.comebackReward?.available && state.comebackReward?.reward),
    comebackAwayHours: Math.floor((state.comebackReward?.awaySeconds ?? 0) / 3600),
    comebackReward: state.comebackReward?.reward ?? null,
    hasClaimableReward:
      isDailyRewardAvailable(state, safeNow)
      || Boolean(state.comebackReward?.available && state.comebackReward?.reward),
    hasAttention:
      unreadNotifications > 0
      || isDailyRewardAvailable(state, safeNow)
      || Boolean(state.comebackReward?.available && state.comebackReward?.reward)
  };
}

export function applyRetentionProgress(
  state: IdleGameState,
  progress: RetentionDelta = {}
): IdleGameState {
  const now = sanitizeTimestamp(progress.now, Date.now());
  const kills = toWhole(progress.kills, 0);
  const bossKills = toWhole(progress.bossKills, 0);
  const mesosGained = toWhole(progress.mesosGained, 0);
  const damageDealt = toWhole(progress.damageDealt, 0);
  const critHits = toWhole(progress.critHits, 0);
  const stageClears = toWhole(progress.stageClears, 0);
  const levelGains = toWhole(progress.levelGains, 0);

  let next = syncRecurringRetention(state, now);
  next = {
    ...next,
    lifetimeKills: next.lifetimeKills + kills,
    lifetimeBossKills: next.lifetimeBossKills + bossKills
  };

  const missions: MissionProgress = { ...next.missions };
  (Object.keys(MISSION_DEFINITIONS) as MissionId[]).forEach((id) => {
    const definition = MISSION_DEFINITIONS[id];
    const current = missions[id];
    const value = definition.kind === "kills" ? next.lifetimeKills : next.level;
    const updated = Math.min(definition.target, value);
    const justCompleted = !current.completed && updated >= definition.target;
    missions[id] = { ...current, progress: updated, completed: current.completed || justCompleted };
  });
  next = { ...next, missions };

  const achievements: AchievementState = { ...next.achievements };
  (Object.keys(ACHIEVEMENT_DEFINITIONS) as AchievementId[]).forEach((id) => {
    const definition = ACHIEVEMENT_DEFINITIONS[id];
    const current = achievements[id];
    if (!current.unlocked && definition.isUnlocked(next)) {
      achievements[id] = { unlocked: true, unlockedAt: now };
      next = pushNotification(next, "achievement", "Achievement unlocked", definition.label, now, `achievement-${id}`);
    }
  });
  next = { ...next, achievements };

  const dailyProgress = applyDailyChallengeProgress(next.dailyChallenges ?? DEFAULT_DAILY_CHALLENGES, {
    kills,
    bossKills,
    mesosGained,
    damageDealt,
    critHits
  });

  next = applyRewardBundle({
    ...next,
    dailyChallenges: dailyProgress.state
  }, dailyProgress.reward);

  dailyProgress.completed.forEach((challenge) => {
    next = pushNotification(
      next,
      "challenge",
      "Daily challenge complete",
      `${challenge.label}: ${formatReward(challenge.reward)}`,
      now,
      `daily-challenge-${dailyProgress.state.dayKey}-${challenge.challengeId}`
    );
  });

  const weeklyProgress = applyWeeklyGoalProgress(next.weeklyGoal ?? DEFAULT_WEEKLY_GOAL, {
    bossKills,
    mesosGained,
    levelGains,
    stageClears
  });

  next = applyRewardBundle({
    ...next,
    weeklyGoal: weeklyProgress.state
  }, weeklyProgress.reward);

  weeklyProgress.claimedMilestones.forEach((milestoneIndex) => {
    const isFinalMilestone = milestoneIndex === WEEKLY_MILESTONE_BREAKPOINTS.length - 1;
    const title = isFinalMilestone ? "Weekly goal completed" : "Weekly milestone reached";
    const message = `${weeklyProgress.state.label}: milestone ${milestoneIndex + 1}/${WEEKLY_MILESTONE_BREAKPOINTS.length}.`;
    next = pushNotification(
      next,
      "weekly",
      title,
      message,
      now,
      `weekly-goal-${weeklyProgress.state.weekKey}-${milestoneIndex}`
    );
  });

  return next;
}

export function claimDailyReward(state: IdleGameState, now = Date.now()) {
  const safeNow = sanitizeTimestamp(now, Date.now());
  let synced = syncRecurringRetention(state, safeNow);
  const today = getLocalDayKey(safeNow);

  if (synced.dailyReward.lastClaimDay === today) {
    return { state: synced, message: "Daily reward already claimed today.", success: false };
  }

  const continues = isPreviousDay(synced.dailyReward.lastClaimDay, safeNow);
  const streak = continues ? synced.dailyReward.streak + 1 : 1;
  const cycleDay = ((streak - 1) % DAILY_REWARD_CYCLE.length) + 1;
  const cycleReward = DAILY_REWARD_CYCLE[cycleDay - 1] ?? DAILY_REWARD_CYCLE[0];
  const scale = 1 + Math.min(0.45, (synced.level - 1) * 0.015) + Math.min(0.25, synced.prestigeCount * 0.03 + synced.rebirthCount * 0.02);
  const reward = scaleReward(cycleReward, scale);

  synced = applyRewardBundle(
    {
      ...synced,
      dailyReward: {
        ...synced.dailyReward,
        lastClaimDay: today,
        streak,
        cycleDay,
        bestStreak: Math.max(synced.dailyReward.bestStreak, streak),
        totalClaims: synced.dailyReward.totalClaims + 1
      }
    },
    reward
  );

  synced = pushNotification(
    synced,
    "daily",
    "Daily reward claimed",
    `Day ${cycleDay} reward: ${formatReward(reward)}`,
    safeNow,
    `daily-claim-${today}`
  );

  return {
    state: synced,
    message: `Daily reward claimed: ${formatReward(reward)}.`,
    success: true
  };
}

export function claimComebackReward(state: IdleGameState, now = Date.now()) {
  const safeNow = sanitizeTimestamp(now, Date.now());
  const synced = syncRecurringRetention(state, safeNow);
  const rewardState = synced.comebackReward ?? DEFAULT_COMEBACK_REWARD;

  if (!rewardState.available || !rewardState.reward) {
    return {
      state: synced,
      message: "No comeback reward available right now.",
      success: false
    };
  }

  let next = applyRewardBundle(
    {
      ...synced,
      comebackReward: {
        ...rewardState,
        available: false,
        claimedAt: safeNow,
        reward: null
      }
    },
    rewardState.reward
  );

  next = pushNotification(
    next,
    "comeback",
    "Comeback reward claimed",
    `Welcome back bonus: ${formatReward(rewardState.reward)}`,
    safeNow,
    `comeback-claim-${rewardState.lastEligibleAt ?? safeNow}`
  );

  return {
    state: next,
    message: `Comeback reward claimed: ${formatReward(rewardState.reward)}.`,
    success: true
  };
}

export function claimMissionReward(state: IdleGameState, missionId: MissionId) {
  const mission = state.missions[missionId];
  const definition = MISSION_DEFINITIONS[missionId];
  if (!mission.completed) return { state, message: "Mission is not complete yet.", success: false };
  if (mission.claimed) return { state, message: "Mission reward already claimed.", success: false };

  const next = applyRewardBundle({
    ...state,
    missions: {
      ...state.missions,
      [missionId]: { ...mission, claimed: true }
    }
  }, definition.reward);

  return {
    state: pushNotification(next, "mission", "Mission reward claimed", definition.label, Date.now(), `mission-claim-${missionId}`),
    message: `${definition.label}: reward claimed.`,
    success: true
  };
}

export function syncLoginRetention(state: IdleGameState, now = Date.now()): IdleGameState {
  const safeNow = sanitizeTimestamp(now, Date.now());
  let synced = applyRetentionProgress(state, { now: safeNow });

  if (isDailyRewardAvailable(synced, safeNow)) {
    const today = getLocalDayKey(safeNow);
    synced = pushNotification(
      synced,
      "daily",
      "Daily reward ready",
      `Login streak ${synced.dailyReward.streak}. Claim today's reward.`,
      safeNow,
      `daily-ready-${today}`
    );
  }

  const lastSeenAt = sanitizeTimestamp(synced.lastSavedAt, safeNow);
  const awayMs = Math.max(0, safeNow - lastSeenAt);
  const awayHours = awayMs / HOUR_MS;
  const existing = synced.comebackReward ?? DEFAULT_COMEBACK_REWARD;

  if (awayHours >= COMEBACK_MIN_AWAY_HOURS && existing.lastEligibleAt !== lastSeenAt) {
    const reward = buildComebackReward(synced, awayHours);
    synced = {
      ...synced,
      comebackReward: {
        available: true,
        awaySeconds: Math.floor(awayMs / 1000),
        reward,
        lastEligibleAt: lastSeenAt,
        generatedAt: safeNow,
        claimedAt: existing.claimedAt
      }
    };

    synced = pushNotification(
      synced,
      "comeback",
      "Welcome back",
      `You've been away ${Math.floor(awayHours)}h. Comeback reward ready: ${formatReward(reward)}.`,
      safeNow,
      `comeback-ready-${lastSeenAt}`
    );
  }

  return synced;
}

export function markNotificationsRead(state: IdleGameState) {
  return {
    state: {
      ...state,
      notifications: state.notifications.map((notification) => ({ ...notification, read: true }))
    },
    message: "Notifications marked read.",
    success: true
  };
}
