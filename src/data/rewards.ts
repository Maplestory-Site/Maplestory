export type RewardBadge = {
  id: string;
  title: string;
  note: string;
  icon: string;
  unlocked: boolean;
};

export type DailyReward = {
  day: number;
  label: string;
  reward: string;
  claimed: boolean;
  today: boolean;
};

export const rewardStreak = {
  current: 4,
  target: 7,
  note: "Come back tomorrow to unlock the next drop."
};

export const dailyRewards: DailyReward[] = [
  { day: 1, label: "Day 1", reward: "Clip unlock", claimed: true, today: false },
  { day: 2, label: "Day 2", reward: "Live alert boost", claimed: true, today: false },
  { day: 3, label: "Day 3", reward: "Saved slot", claimed: true, today: false },
  { day: 4, label: "Day 4", reward: "Daily reward", claimed: false, today: true },
  { day: 5, label: "Day 5", reward: "Hot drop", claimed: false, today: false },
  { day: 6, label: "Day 6", reward: "Priority ping", claimed: false, today: false },
  { day: 7, label: "Day 7", reward: "Weekly badge", claimed: false, today: false }
];

export const rewardBadges: RewardBadge[] = [
  {
    id: "badge-1",
    title: "Daily Watcher",
    note: "Returned 4 days in a row.",
    icon: "D",
    unlocked: true
  },
  {
    id: "badge-2",
    title: "Clip Hunter",
    note: "Opened today's top clip.",
    icon: "C",
    unlocked: true
  },
  {
    id: "badge-3",
    title: "Live First",
    note: "Joined before the next stream starts.",
    icon: "L",
    unlocked: false
  }
];

export const rewardSummary = {
  title: "Daily rewards",
  description: "Show up, claim the drop, and keep the streak alive.",
  popupTitle: "Reward claimed",
  popupNote: "You locked today's reward and pushed your streak forward."
};
