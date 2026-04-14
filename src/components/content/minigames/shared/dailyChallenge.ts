import type { GameId } from "./gameMeta";

export type DailyChallenge = {
  id: string;
  gameId: GameId;
  title: string;
  description: string;
  targetLabel: string;
  check: (payload: { score: number; duration?: number }) => boolean;
};

type DailyStatus = {
  date: string;
  challengeId: string;
  completed: boolean;
  completedAt?: string;
};

const STORAGE_KEY = "snailslayer-daily-challenge";

const CHALLENGES: DailyChallenge[] = [
  {
    id: "rt-precision",
    gameId: "reaction-test",
    title: "Precision Push",
    description: "Hit a clean reaction score in one run.",
    targetLabel: "Score 260+",
    check: ({ score }) => score >= 260
  },
  {
    id: "bd-survive",
    gameId: "boss-dodge",
    title: "Survival Run",
    description: "Hold the lane and survive the pressure.",
    targetLabel: "Survive 18s+",
    check: ({ duration = 0 }) => duration >= 18
  },
  {
    id: "mt-growth",
    gameId: "maple-training",
    title: "Training Surge",
    description: "Build a strong training session score.",
    targetLabel: "Score 420+",
    check: ({ score }) => score >= 420
  },
  {
    id: "td-dodge",
    gameId: "tap-dodge",
    title: "Tap Dodge Sprint",
    description: "Hold combo and beat the dodge pressure.",
    targetLabel: "Score 320+",
    check: ({ score }) => score >= 320
  },
  {
    id: "rtp-reaction",
    gameId: "reaction-timer-pro",
    title: "Reaction Sprint",
    description: "Land a fast reaction time.",
    targetLabel: "Score 340+",
    check: ({ score }) => score >= 340
  },
  {
    id: "sb-stack",
    gameId: "stack-builder",
    title: "Stack Builder",
    description: "Build a clean stack with high precision.",
    targetLabel: "Score 420+",
    check: ({ score }) => score >= 420
  },
  {
    id: "at-accuracy",
    gameId: "aim-trainer",
    title: "Aim Accuracy",
    description: "Land a strong aim score in one run.",
    targetLabel: "Score 360+",
    check: ({ score }) => score >= 360
  },
  {
    id: "ns-grow",
    gameId: "neo-snake",
    title: "Snake Streak",
    description: "Grow the snake with clean control.",
    targetLabel: "Score 280+",
    check: ({ score }) => score >= 280
  },
  {
    id: "bd-defuse",
    gameId: "bomb-defuse",
    title: "Bomb Defuse",
    description: "Beat the timer under pressure.",
    targetLabel: "Score 300+",
    check: ({ score }) => score >= 300
  },
  {
    id: "mf-memory",
    gameId: "memory-flash",
    title: "Memory Flash",
    description: "Repeat a longer flash sequence.",
    targetLabel: "Score 280+",
    check: ({ score }) => score >= 280
  },
  {
    id: "lr-runner",
    gameId: "lane-switch-runner",
    title: "Runner Sprint",
    description: "Survive the lane rush.",
    targetLabel: "Score 300+",
    check: ({ score }) => score >= 300
  },
  {
    id: "ip-slide",
    gameId: "ice-slide-puzzle",
    title: "Ice Slide Puzzle",
    description: "Clear multiple levels in one run.",
    targetLabel: "Score 220+",
    check: ({ score }) => score >= 220
  },
  {
    id: "bc-boss",
    gameId: "boss-clicker",
    title: "Boss Clicker",
    description: "Push through a full boss HP bar.",
    targetLabel: "Score 340+",
    check: ({ score }) => score >= 340
  }
];

function getDateKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function getStoredStatus(): DailyStatus | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as DailyStatus;
  } catch {
    return null;
  }
}

function storeStatus(status: DailyStatus) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(status));
}

export function getDailyChallenge() {
  const today = getDateKey();
  const index = Math.abs(hashString(today)) % CHALLENGES.length;
  const challenge = CHALLENGES[index];
  const stored = getStoredStatus();

  if (stored && stored.date === today && stored.challengeId === challenge.id) {
    return { challenge, completed: stored.completed, completedAt: stored.completedAt };
  }

  const freshStatus: DailyStatus = {
    date: today,
    challengeId: challenge.id,
    completed: false
  };
  storeStatus(freshStatus);
  return { challenge, completed: false, completedAt: undefined };
}

export function markDailyChallengeComplete() {
  const { challenge } = getDailyChallenge();
  const status: DailyStatus = {
    date: getDateKey(),
    challengeId: challenge.id,
    completed: true,
    completedAt: new Date().toISOString()
  };
  storeStatus(status);
  return status;
}

export function isDailyChallengeComplete() {
  const { completed } = getDailyChallenge();
  return completed;
}

export function checkDailyChallenge(payload: { gameId: GameId; score: number; duration?: number }) {
  const { challenge, completed } = getDailyChallenge();
  if (completed || payload.gameId !== challenge.gameId) return false;
  return challenge.check({ score: payload.score, duration: payload.duration });
}

function hashString(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}
