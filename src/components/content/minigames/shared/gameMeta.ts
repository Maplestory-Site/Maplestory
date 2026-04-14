import { checkDailyChallenge, markDailyChallengeComplete } from "./dailyChallenge";
import { ACHIEVEMENTS, getAchievementDefinition } from "./achievements";

export type GameId =
  | "reaction-test"
  | "maple-training"
  | "maple-survival"
  | "boss-dodge"
  | "tap-dodge"
  | "reaction-timer-pro"
  | "stack-builder"
  | "aim-trainer"
  | "neo-snake"
  | "bomb-defuse"
  | "memory-flash"
  | "lane-switch-runner"
  | "ice-slide-puzzle"
  | "boss-clicker";

export type GameResult = {
  gameId: GameId;
  score: number;
  duration?: number;
  outcome?: "win" | "loss" | "session";
};

export type DailyMission = {
  id: string;
  type: "plays" | "score" | "specific";
  label: string;
  target: number;
  current: number;
  gameId?: GameId;
  completed: boolean;
  rewarded: boolean;
  xpReward: number;
};

export type DailyMissionsState = {
  date: string;
  missions: DailyMission[];
};

export type GameMetaState = {
  xp: number;
  level: number;
  xpToNext: number;
  coins: number;
  lastCoinGain: number;
  lastCoinAt: string | null;
  lastXpGain: number;
  lastXpAt: string | null;
  ownedItems: string[];
  lootBoxes: number;
  dailyMissions: DailyMissionsState;
  totalPlays: number;
  totalScore: number;
  bestScore: number;
  bestGameId: GameId | null;
  favoriteGameId: GameId | null;
  lastPlayedGameId: GameId | null;
  gameBest: Record<GameId, number>;
  gamePlays: Record<GameId, number>;
  recent: { gameId: GameId; score: number; at: string }[];
  runs: { gameId: GameId; score: number; duration: number | undefined; at: string }[];
  achievements: string[];
  rewardBadges: string[];
  rewardTitles: string[];
  rewardEffects: string[];
};

export type UserProgress = {
  xp: number;
  level: number;
  coins: number;
  ownedItems?: string[];
  lootBoxes?: number;
  highScores: Record<GameId, number>;
};

export type LootReward =
  | { type: "coins"; amount: number }
  | { type: "item"; itemId: string };

const STORAGE_KEY = "snailslayer-mini-meta";

const DEFAULT_STATE: GameMetaState = {
  xp: 0,
  level: 1,
  xpToNext: 120,
  coins: 0,
  lastCoinGain: 0,
  lastCoinAt: null,
  lastXpGain: 0,
  lastXpAt: null,
  ownedItems: [],
  lootBoxes: 0,
  dailyMissions: {
    date: "",
    missions: []
  },
  totalPlays: 0,
  totalScore: 0,
  bestScore: 0,
  bestGameId: null,
  favoriteGameId: null,
  lastPlayedGameId: null,
  gameBest: {
    "reaction-test": 0,
    "maple-training": 0,
    "maple-survival": 0,
    "boss-dodge": 0,
    "tap-dodge": 0,
    "reaction-timer-pro": 0,
    "stack-builder": 0,
    "aim-trainer": 0,
    "neo-snake": 0,
    "bomb-defuse": 0,
    "memory-flash": 0,
    "lane-switch-runner": 0,
    "ice-slide-puzzle": 0,
    "boss-clicker": 0
  },
  gamePlays: {
    "reaction-test": 0,
    "maple-training": 0,
    "maple-survival": 0,
    "boss-dodge": 0,
    "tap-dodge": 0,
    "reaction-timer-pro": 0,
    "stack-builder": 0,
    "aim-trainer": 0,
    "neo-snake": 0,
    "bomb-defuse": 0,
    "memory-flash": 0,
    "lane-switch-runner": 0,
    "ice-slide-puzzle": 0,
    "boss-clicker": 0
  },
  recent: [],
  runs: [],
  achievements: [],
  rewardBadges: [],
  rewardTitles: [],
  rewardEffects: []
};

const LEVEL_THRESHOLDS = [
  { level: 1, xp: 0 },
  { level: 2, xp: 120 },
  { level: 3, xp: 260 },
  { level: 4, xp: 440 },
  { level: 5, xp: 660 },
  { level: 6, xp: 930 },
  { level: 7, xp: 1260 },
  { level: 8, xp: 1650 },
  { level: 9, xp: 2100 },
  { level: 10, xp: 2600 },
  { level: 11, xp: 3200 }
];

function xpForLevel(level: number) {
  const direct = LEVEL_THRESHOLDS.find((entry) => entry.level === level);
  if (direct) return direct.xp;
  const last = LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
  const extra = level - last.level;
  return last.xp + extra * 650;
}

function getLevelForXp(xp: number) {
  let level = 1;
  while (xp >= xpForLevel(level + 1)) {
    level += 1;
  }
  return level;
}

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function seededRandom(seed: number) {
  let value = seed % 2147483647;
  if (value <= 0) value += 2147483646;
  return () => (value = (value * 16807) % 2147483647) / 2147483647;
}

function buildDailyMissions(dateKey: string): DailyMissionsState {
  const seed = Array.from(dateKey).reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const rand = seededRandom(seed);
  const playTarget = 3;
  const scoreTarget = 250 + Math.round(rand() * 300);
  const gamePool: GameId[] = [
    "reaction-test",
    "tap-dodge",
    "boss-dodge",
    "maple-survival",
    "stack-builder",
    "aim-trainer",
    "neo-snake",
    "lane-switch-runner",
    "memory-flash",
    "bomb-defuse"
  ];
  const gameId = gamePool[Math.floor(rand() * gamePool.length)];
  const missions: DailyMission[] = [
    {
      id: "plays",
      type: "plays",
      label: `Play ${playTarget} games`,
      target: playTarget,
      current: 0,
      completed: false,
      rewarded: false,
      xpReward: 60
    },
    {
      id: "score",
      type: "score",
      label: `Reach score ${scoreTarget}`,
      target: scoreTarget,
      current: 0,
      completed: false,
      rewarded: false,
      xpReward: 80
    },
    {
      id: "specific",
      type: "specific",
      label: `Play ${gameId.replace(/-/g, " ")} once`,
      target: 1,
      current: 0,
      completed: false,
      rewarded: false,
      xpReward: 70,
      gameId
    }
  ];

  return { date: dateKey, missions };
}

function ensureDailyMissions(state: GameMetaState) {
  const today = getTodayKey();
  if (state.dailyMissions.date !== today || !state.dailyMissions.missions.length) {
    return {
      ...state,
      dailyMissions: buildDailyMissions(today)
    };
  }
  return state;
}

function applyProgressSnapshot(state: GameMetaState) {
  const snapshot = getProgressSnapshot(state);
  return {
    ...state,
    level: snapshot.level,
    xpToNext: snapshot.xpForNext
  };
}

function applyDailyMissionProgress(state: GameMetaState, result: GameResult) {
  const daily = ensureDailyMissions(state).dailyMissions;
  let bonusXp = 0;
  let bonusCoins = 0;
  let bonusBoxes = 0;
  const missions = daily.missions.map((mission) => {
    let next = { ...mission };
    if (mission.type === "plays") {
      next.current = Math.min(mission.target, mission.current + 1);
    }
    if (mission.type === "score") {
      next.current = Math.max(mission.current, Math.round(result.score || 0));
    }
    if (mission.type === "specific" && mission.gameId === result.gameId) {
      next.current = Math.min(mission.target, mission.current + 1);
    }
    next.completed = next.current >= next.target;
    if (next.completed && !next.rewarded) {
      bonusXp += next.xpReward;
      bonusCoins += Math.round(next.xpReward * 0.5);
      bonusBoxes += 1;
      next.rewarded = true;
    }
    return next;
  });

  return {
    state: {
      ...state,
      dailyMissions: {
        date: daily.date,
        missions
      }
    },
    bonusXp,
    bonusCoins,
    bonusBoxes
  };
}

export function getProgressSnapshot(state: GameMetaState) {
  const level = Math.max(1, state.level || getLevelForXp(state.xp));
  const nextLevelXp = xpForLevel(level + 1);
  const currentLevelXp = xpForLevel(level);
  const progress = nextLevelXp > currentLevelXp ? ((state.xp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100 : 0;
  return {
    level,
    xp: state.xp,
    xpForNext: Math.max(0, nextLevelXp - state.xp),
    progress: Math.max(0, Math.min(100, progress))
  };
}

export function extractUserProgress(state: { xp?: number; level?: number; coins?: number; ownedItems?: string[]; lootBoxes?: number; highScores?: Record<GameId, number> } | GameMetaState): UserProgress {
  const meta = state as GameMetaState;
  const xp = Math.max(0, meta.xp ?? 0);
  const level = Math.max(1, meta.level ?? getLevelForXp(xp));
  const coins = Math.max(0, meta.coins ?? 0);
  const ownedItems = Array.isArray(meta.ownedItems) ? meta.ownedItems : [];
  const lootBoxes = Math.max(0, meta.lootBoxes ?? 0);
  const highScores = {
    ...DEFAULT_STATE.gameBest,
    ...(meta.gameBest ?? ("highScores" in state ? state.highScores ?? {} : {}))
  } as Record<GameId, number>;
  return { xp, level, coins, ownedItems, lootBoxes, highScores };
}

export function applyUserProgress(progress: UserProgress) {
  const current = loadGameMeta();
  const next: GameMetaState = {
    ...current,
    xp: Math.max(current.xp, progress.xp),
    level: Math.max(current.level, progress.level),
    coins: Math.max(current.coins, progress.coins ?? 0),
    ownedItems: Array.from(new Set([...(current.ownedItems ?? []), ...((progress.ownedItems ?? []) as string[])])),
    lootBoxes: Math.max(current.lootBoxes, progress.lootBoxes ?? 0),
    gameBest: {
      ...current.gameBest,
      ...progress.highScores
    }
  };
  const snapshot = getProgressSnapshot(next);
  next.level = snapshot.level;
  next.xpToNext = snapshot.xpForNext;
  saveGameMeta(next);
  return next;
}

export function loadGameMeta(): GameMetaState {
  if (typeof window === "undefined") return DEFAULT_STATE;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return DEFAULT_STATE;
    const parsed = JSON.parse(stored) as GameMetaState;
    const merged = {
      ...DEFAULT_STATE,
      ...parsed,
      ownedItems: Array.isArray(parsed.ownedItems) ? parsed.ownedItems : [],
      lootBoxes: Math.max(0, parsed.lootBoxes ?? 0),
      gameBest: {
        ...DEFAULT_STATE.gameBest,
        ...(parsed.gameBest ?? {})
      },
      gamePlays: {
        ...DEFAULT_STATE.gamePlays,
        ...(parsed.gamePlays ?? {})
      },
      recent: Array.isArray(parsed.recent) ? parsed.recent.slice(0, 6) : [],
      runs: Array.isArray(parsed.runs)
        ? (parsed.runs.slice(0, 80).map((run) => ({
            ...run,
            duration: run.duration ?? undefined
          })) as GameMetaState["runs"])
        : []
    };
    return applyProgressSnapshot(ensureDailyMissions(merged));
  } catch {
    return DEFAULT_STATE;
  }
}

export function purchaseShopItem(itemId: string, cost: number) {
  const current = loadGameMeta();
  if (current.ownedItems.includes(itemId)) {
    return { ok: false, reason: "owned" as const, state: current };
  }
  if (current.coins < cost) {
    return { ok: false, reason: "coins" as const, state: current };
  }
  const next: GameMetaState = {
    ...current,
    coins: Math.max(0, current.coins - cost),
    ownedItems: current.ownedItems.concat(itemId)
  };
  saveGameMeta(next);
  return { ok: true, reason: "purchased" as const, state: next };
}

export function saveGameMeta(state: GameMetaState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  window.dispatchEvent(new CustomEvent("mini-games-meta:update", { detail: state }));
}

export function updateGameMeta(result: GameResult): GameMetaState {
  const current = ensureDailyMissions(loadGameMeta());
  const score = Math.max(0, Math.round(result.score || 0));
  const duration = Math.max(0, Math.round(result.duration ?? 0));
  const xpGain = Math.max(8, Math.round(score * 0.35 + duration * 4 + 12));
  const coinGain = Math.max(5, Math.round(score * 0.25 + duration * 2 + 6));
  const previousLevel = current.level;
  const newXp = current.xp + xpGain;
  const now = new Date().toISOString();
  const latestRecent: GameMetaState["recent"][number] = { gameId: result.gameId, score, at: now };
  const latestRun: GameMetaState["runs"][number] = {
    gameId: result.gameId,
    score,
    duration: result.duration ?? undefined,
    at: now
  };
  const next: GameMetaState = {
    ...current,
    xp: newXp,
    lastXpGain: xpGain,
    lastXpAt: now,
    coins: current.coins + coinGain,
    lastCoinGain: coinGain,
    lastCoinAt: now,
    totalPlays: current.totalPlays + 1,
    totalScore: current.totalScore + score,
    lastPlayedGameId: result.gameId,
    gameBest: {
      ...current.gameBest,
      [result.gameId]: Math.max(current.gameBest[result.gameId] ?? 0, score)
    },
    gamePlays: {
      ...current.gamePlays,
      [result.gameId]: (current.gamePlays[result.gameId] ?? 0) + 1
    },
    recent: [latestRecent]
      .concat(current.recent)
      .slice(0, 6) as GameMetaState["recent"],
    runs: [latestRun]
      .concat(current.runs)
      .slice(0, 80) as GameMetaState["runs"],
    achievements: current.achievements.slice(),
    rewardBadges: current.rewardBadges.slice(),
    rewardTitles: current.rewardTitles.slice(),
    rewardEffects: current.rewardEffects.slice()
  };

  if (score > current.bestScore) {
    next.bestScore = score;
    next.bestGameId = result.gameId;
  }

  const favorite = Object.entries(next.gamePlays).sort((a, b) => b[1] - a[1])[0]?.[0] as GameId | undefined;
  next.favoriteGameId = favorite ?? null;

  if (checkDailyChallenge({ gameId: result.gameId, score: result.score, duration: result.duration })) {
    markDailyChallengeComplete();
    next.achievements = Array.from(new Set([...next.achievements, "daily-clear"]));
  }

  const computedAchievements = computeAchievements(next, result);
  const newlyUnlocked = computedAchievements.filter((id) => !current.achievements.includes(id));
  next.achievements = computedAchievements;
  const dailyUpdate = applyDailyMissionProgress(next, result);
  let adjusted = dailyUpdate.state;
  if (dailyUpdate.bonusXp || dailyUpdate.bonusCoins || dailyUpdate.bonusBoxes) {
    adjusted = {
      ...adjusted,
      xp: adjusted.xp + dailyUpdate.bonusXp,
      lastXpGain: adjusted.lastXpGain + dailyUpdate.bonusXp,
      lastXpAt: new Date().toISOString(),
      coins: adjusted.coins + dailyUpdate.bonusCoins,
      lastCoinGain: adjusted.lastCoinGain + dailyUpdate.bonusCoins,
      lastCoinAt: new Date().toISOString(),
      lootBoxes: adjusted.lootBoxes + dailyUpdate.bonusBoxes
    };
  }
  adjusted = applyProgressSnapshot(adjusted);
  if (adjusted.level > current.level) {
    const rewards = getRewardsForLevel(adjusted.level);
    adjusted.rewardBadges = Array.from(new Set([...adjusted.rewardBadges, ...rewards.badges]));
    adjusted.rewardTitles = Array.from(new Set([...adjusted.rewardTitles, ...rewards.titles]));
    adjusted.rewardEffects = Array.from(new Set([...adjusted.rewardEffects, ...rewards.effects]));
    adjusted.lootBoxes += adjusted.level - previousLevel;
  }
  if (newlyUnlocked.length) {
    let bonusXp = 0;
    let bonusCoins = 0;
    const badgeRewards: string[] = [];
    newlyUnlocked.forEach((id) => {
      const def = getAchievementDefinition(id);
      if (!def) return;
      bonusXp += def.rewardXp;
      bonusCoins += def.rewardCoins;
      if (def.rewardBadge) {
        badgeRewards.push(def.rewardBadge);
      }
    });
    adjusted = {
      ...adjusted,
      xp: adjusted.xp + bonusXp,
      lastXpGain: adjusted.lastXpGain + bonusXp,
      lastXpAt: new Date().toISOString(),
      coins: adjusted.coins + bonusCoins,
      lastCoinGain: adjusted.lastCoinGain + bonusCoins,
      lastCoinAt: new Date().toISOString(),
      lootBoxes: adjusted.lootBoxes + newlyUnlocked.length,
      rewardBadges: Array.from(new Set([...adjusted.rewardBadges, ...badgeRewards]))
    };
  }
  saveGameMeta(adjusted);
  if (typeof window !== "undefined") {
    const feedbackType = result.outcome === "loss" ? "fail" : result.outcome === "win" ? "success" : "score";
    window.dispatchEvent(
      new CustomEvent("mini-game:feedback", {
        detail: {
          type: feedbackType,
          score
        }
      })
    );
    window.dispatchEvent(
      new CustomEvent("mini-game:result", {
        detail: {
          gameId: result.gameId,
          score
        }
      })
    );
  }
  return adjusted;
}

export function openLootBox(): LootReward | null {
  const current = loadGameMeta();
  if (current.lootBoxes <= 0) return null;
  const rewardPool = [
    { type: "coins" as const, amount: 60 },
    { type: "coins" as const, amount: 90 },
    { type: "coins" as const, amount: 120 },
    { type: "coins" as const, amount: 160 },
    { type: "item" as const, itemId: "theme-ember" },
    { type: "item" as const, itemId: "ui-pulse" },
    { type: "item" as const, itemId: "avatar-slayer" },
    { type: "item" as const, itemId: "skin-neo" }
  ];
  const reward = rewardPool[Math.floor(Math.random() * rewardPool.length)] ?? { type: "coins" as const, amount: 80 };
  let next: GameMetaState = {
    ...current,
    lootBoxes: Math.max(0, current.lootBoxes - 1)
  };
  if (reward.type === "coins") {
    next = {
      ...next,
      coins: next.coins + reward.amount,
      lastCoinGain: next.lastCoinGain + reward.amount,
      lastCoinAt: new Date().toISOString()
    };
  } else {
    if (!next.ownedItems.includes(reward.itemId)) {
      next = { ...next, ownedItems: next.ownedItems.concat(reward.itemId) };
    }
  }
  saveGameMeta(next);
  return reward;
}

function computeAchievements(state: GameMetaState, result: GameResult) {
  const achievements = new Set(state.achievements);
  ACHIEVEMENTS.forEach((achievement) => {
    if (achievement.isUnlocked(state, result)) {
      achievements.add(achievement.id);
    }
  });
  return Array.from(achievements);
}

function getRewardsForLevel(level: number) {
  if (level >= 10) {
    return {
      badges: ["Arcade Legend"],
      titles: ["Arena MVP"],
      effects: ["Golden Aura"]
    };
  }
  if (level >= 7) {
    return {
      badges: ["Combo Captain"],
      titles: ["Streak Hunter"],
      effects: ["Pulse Trail"]
    };
  }
  if (level >= 4) {
    return {
      badges: ["Rookie Star"],
      titles: ["Rising Ace"],
      effects: ["Soft Glow"]
    };
  }
  if (level >= 2) {
    return {
      badges: ["First Boost"],
      titles: ["Fresh Challenger"],
      effects: ["Spark Pop"]
    };
  }
  return { badges: [], titles: [], effects: [] };
}

export function getAchievementLabel(id: string) {
  switch (id) {
    case "first-run":
      return "First Run";
    case "regular":
      return "Regular";
    case "veteran":
      return "Veteran";
    case "high-score":
      return "High Score";
    case "elite-score":
      return "Elite Score";
    case "precision":
      return "Precision";
    case "survivor":
      return "Survivor";
    case "trainer":
      return "Trainer";
    case "dodger":
      return "Dodger";
    case "sprinter":
      return "Sprinter";
    case "builder":
      return "Builder";
    case "marksman":
      return "Marksman";
    case "serpent":
      return "Serpent";
    case "defuser":
      return "Defuser";
    case "mnemonic":
      return "Mnemonic";
    case "runner":
      return "Runner";
    case "solver":
      return "Solver";
    case "slayer":
      return "Slayer";
    case "daily-clear":
      return "Daily Clear";
    default:
      return "Achievement";
  }
}
