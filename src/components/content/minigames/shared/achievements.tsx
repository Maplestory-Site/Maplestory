import type { GameMetaState, GameResult } from "./gameMeta";

export type AchievementDefinition = {
  id: string;
  title: string;
  description: string;
  target: number;
  rewardXp: number;
  rewardCoins: number;
  rewardBadge?: string;
  getProgress: (meta: GameMetaState) => number;
  isUnlocked: (meta: GameMetaState, result: GameResult) => boolean;
};

export const ACHIEVEMENTS: AchievementDefinition[] = [
  {
    id: "first-run",
    title: "First Run",
    description: "Play your first game.",
    target: 1,
    rewardXp: 40,
    rewardCoins: 30,
    rewardBadge: "First Run",
    getProgress: (meta) => meta.totalPlays,
    isUnlocked: (meta) => meta.totalPlays >= 1
  },
  {
    id: "regular",
    title: "Regular",
    description: "Play 10 games.",
    target: 10,
    rewardXp: 90,
    rewardCoins: 60,
    rewardBadge: "Regular",
    getProgress: (meta) => meta.totalPlays,
    isUnlocked: (meta) => meta.totalPlays >= 10
  },
  {
    id: "veteran",
    title: "Veteran",
    description: "Play 25 games.",
    target: 25,
    rewardXp: 140,
    rewardCoins: 90,
    rewardBadge: "Veteran",
    getProgress: (meta) => meta.totalPlays,
    isUnlocked: (meta) => meta.totalPlays >= 25
  },
  {
    id: "high-score",
    title: "High Score",
    description: "Reach a best score of 400.",
    target: 400,
    rewardXp: 120,
    rewardCoins: 120,
    rewardBadge: "High Score",
    getProgress: (meta) => meta.bestScore,
    isUnlocked: (meta) => meta.bestScore >= 400
  },
  {
    id: "elite-score",
    title: "Elite Score",
    description: "Reach a best score of 650.",
    target: 650,
    rewardXp: 180,
    rewardCoins: 180,
    rewardBadge: "Elite Score",
    getProgress: (meta) => meta.bestScore,
    isUnlocked: (meta) => meta.bestScore >= 650
  },
  {
    id: "thousand-club",
    title: "Thousand Club",
    description: "Hit a 1000+ best score.",
    target: 1000,
    rewardXp: 240,
    rewardCoins: 240,
    rewardBadge: "Thousand Club",
    getProgress: (meta) => meta.bestScore,
    isUnlocked: (meta) => meta.bestScore >= 1000
  },
  {
    id: "coin-saver",
    title: "Coin Saver",
    description: "Hold 500 coins at once.",
    target: 500,
    rewardXp: 110,
    rewardCoins: 80,
    rewardBadge: "Coin Saver",
    getProgress: (meta) => meta.coins,
    isUnlocked: (meta) => meta.coins >= 500
  },
  {
    id: "daily-clear",
    title: "Daily Clear",
    description: "Complete the daily challenge.",
    target: 1,
    rewardXp: 120,
    rewardCoins: 120,
    rewardBadge: "Daily Clear",
    getProgress: (meta) => (meta.achievements.includes("daily-clear") ? 1 : 0),
    isUnlocked: (meta) => meta.achievements.includes("daily-clear")
  }
];

export function getAchievementDefinition(id: string) {
  return ACHIEVEMENTS.find((achievement) => achievement.id === id);
}
