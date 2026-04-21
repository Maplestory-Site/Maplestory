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

export type NotificationKind = "daily" | "streak" | "achievement" | "mission" | "system";

export type GameNotification = {
  id: string;
  kind: NotificationKind;
  dedupeKey?: string;
  title: string;
  message: string;
  createdAt: number;
  read: boolean;
};

export type DailyRewardState = {
  lastClaimDay: string | null;
  streak: number;
  bestStreak: number;
  totalClaims: number;
};

export type AchievementState = Record<AchievementId, { unlocked: boolean; unlockedAt: number | null }>;
export type MissionProgress = Record<MissionId, { progress: number; completed: boolean; claimed: boolean }>;

export type MissionDefinition = {
  label: string;
  kind: "kills" | "level";
  target: number;
  reward: { mesos: number; fame: number; crystals?: number };
};

export type AchievementDefinition = {
  label: string;
  isUnlocked: (state: IdleGameState) => boolean;
};

const NOTIFICATION_LIMIT = 20;
const DAILY_MESO_REWARDS = [700, 900, 1200, 1600, 2200, 3000, 4200];

export const MISSION_DEFINITIONS: Record<MissionId, MissionDefinition> = {
  kill_25: { label: "Kill 25 enemies", kind: "kills", target: 25, reward: { mesos: 900, fame: 4 } },
  kill_100: { label: "Kill 100 enemies", kind: "kills", target: 100, reward: { mesos: 4200, fame: 12, crystals: 1 } },
  reach_10: { label: "Reach level 10", kind: "level", target: 10, reward: { mesos: 2500, fame: 8 } },
  reach_25: { label: "Reach level 25", kind: "level", target: 25, reward: { mesos: 9500, fame: 24, crystals: 2 } }
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

export const DEFAULT_DAILY_REWARD: DailyRewardState = {
  lastClaimDay: null,
  streak: 0,
  bestStreak: 0,
  totalClaims: 0
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

export function getRetentionSummary(state: IdleGameState, now = Date.now()) {
  const claimableMissionIds = getClaimableMissionIds(state);
  const unreadNotifications = getUnreadNotificationCount(state);
  const completedAchievements = getCompletedAchievementCount(state);

  return {
    dailyAvailable: isDailyRewardAvailable(state, now),
    claimableMissionIds,
    unreadNotifications,
    completedAchievements,
    totalAchievements: Object.keys(ACHIEVEMENT_DEFINITIONS).length,
    hasClaimableReward: claimableMissionIds.length > 0 || isDailyRewardAvailable(state, now),
    hasAttention: claimableMissionIds.length > 0 || unreadNotifications > 0 || isDailyRewardAvailable(state, now)
  };
}

export function getLocalDayKey(now = Date.now()): string {
  const date = new Date(now);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function isDailyRewardAvailable(state: IdleGameState, now = Date.now()): boolean {
  return state.dailyReward.lastClaimDay !== getLocalDayKey(now);
}

function isPreviousDay(dayKey: string | null, now: number): boolean {
  if (!dayKey) return false;
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  return dayKey === getLocalDayKey(yesterday.getTime());
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

export function applyRetentionProgress(
  state: IdleGameState,
  progress: { kills?: number; bossKills?: number; now?: number } = {}
): IdleGameState {
  const now = progress.now ?? Date.now();
  const kills = Math.max(0, Math.floor(progress.kills ?? 0));
  const bossKills = Math.max(0, Math.floor(progress.bossKills ?? 0));
  let next: IdleGameState = {
    ...state,
    lifetimeKills: state.lifetimeKills + kills,
    lifetimeBossKills: state.lifetimeBossKills + bossKills
  };

  const missions: MissionProgress = { ...next.missions };
  (Object.keys(MISSION_DEFINITIONS) as MissionId[]).forEach((id) => {
    const definition = MISSION_DEFINITIONS[id];
    const current = missions[id];
    const value = definition.kind === "kills" ? next.lifetimeKills : next.level;
    const updated = Math.min(definition.target, value);
    const justCompleted = !current.completed && updated >= definition.target;
    missions[id] = { ...current, progress: updated, completed: current.completed || justCompleted };
    if (justCompleted) {
      next = pushNotification(next, "mission", "Mission complete", definition.label, now, `mission-complete-${id}`);
    }
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

  return { ...next, achievements };
}

export function claimDailyReward(state: IdleGameState, now = Date.now()) {
  const today = getLocalDayKey(now);
  if (state.dailyReward.lastClaimDay === today) {
    return { state, message: "Daily reward already claimed today.", success: false };
  }

  const streak = isPreviousDay(state.dailyReward.lastClaimDay, now)
    ? state.dailyReward.streak + 1
    : 1;
  const rewardIndex = Math.min(streak - 1, DAILY_MESO_REWARDS.length - 1);
  const mesosReward = DAILY_MESO_REWARDS[rewardIndex];
  const crystalReward = streak % 7 === 0 ? 3 : 0;

  let next: IdleGameState = {
    ...state,
    mesos: state.mesos + mesosReward,
    crystals: Math.min(500, state.crystals + crystalReward),
    dailyReward: {
      lastClaimDay: today,
      streak,
      bestStreak: Math.max(state.dailyReward.bestStreak, streak),
      totalClaims: state.dailyReward.totalClaims + 1
    }
  };
  next = pushNotification(next, "daily", "Daily reward claimed", `Day ${streak}: +${mesosReward} mesos.`, now, `daily-claim-${today}`);

  return {
    state: next,
    message: `Daily reward claimed: +${mesosReward} mesos${crystalReward ? `, +${crystalReward} crystals` : ""}.`,
    success: true
  };
}

export function claimMissionReward(state: IdleGameState, missionId: MissionId) {
  const mission = state.missions[missionId];
  const definition = MISSION_DEFINITIONS[missionId];
  if (!mission.completed) return { state, message: "Mission is not complete yet.", success: false };
  if (mission.claimed) return { state, message: "Mission reward already claimed.", success: false };

  const next: IdleGameState = {
    ...state,
    mesos: state.mesos + definition.reward.mesos,
    fame: state.fame + definition.reward.fame,
    crystals: Math.min(500, state.crystals + (definition.reward.crystals ?? 0)),
    missions: {
      ...state.missions,
      [missionId]: { ...mission, claimed: true }
    }
  };

  return {
    state: pushNotification(next, "mission", "Mission reward claimed", definition.label, Date.now(), `mission-claim-${missionId}`),
    message: `${definition.label}: reward claimed.`,
    success: true
  };
}

export function syncLoginRetention(state: IdleGameState, now = Date.now()): IdleGameState {
  const synced = applyRetentionProgress(state, { now });
  if (!isDailyRewardAvailable(synced, now)) return synced;

  const today = getLocalDayKey(now);
  return pushNotification(
    synced,
    "daily",
    "Daily reward ready",
    `Login streak ${synced.dailyReward.streak}. Claim today's reward.`,
    now,
    `daily-ready-${today}`
  );
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
