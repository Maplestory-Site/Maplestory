export type BossClearItem = {
  name: string;
  difficulty: string;
  status: "cleared" | "pushing";
  detail: string;
  progress: number;
};

export type ProgressBarItem = {
  label: string;
  value: string;
  progress: number;
  tone?: "default" | "accent";
};

export type AchievementItem = {
  title: string;
  detail: string;
  stamp: string;
};

export const progressionSummary = {
  title: "Progression Tracker",
  description: "Boss clears, account push, and fresh milestones in one view.",
  stats: [
    { label: "Weekly clears", value: "07" },
    { label: "Goals moving", value: "04" },
    { label: "Fresh wins", value: "03" }
  ]
};

export const bossClears: BossClearItem[] = [
  {
    name: "Lucid",
    difficulty: "Hard",
    status: "cleared",
    detail: "Clear locked. Clean run this week.",
    progress: 100
  },
  {
    name: "Will",
    difficulty: "Hard",
    status: "pushing",
    detail: "Phase cleanup still getting sharper.",
    progress: 72
  },
  {
    name: "Verus Hilla",
    difficulty: "Normal",
    status: "cleared",
    detail: "Stable route with reliable calls.",
    progress: 100
  },
  {
    name: "Seren",
    difficulty: "Practice",
    status: "pushing",
    detail: "Damage window work in progress.",
    progress: 44
  }
];

export const accountProgressBars: ProgressBarItem[] = [
  {
    label: "Main gear setup",
    value: "85%",
    progress: 85,
    tone: "accent"
  },
  {
    label: "Legion growth",
    value: "8.6k",
    progress: 78
  },
  {
    label: "Arcane force route",
    value: "Done",
    progress: 100
  },
  {
    label: "Hexa progress",
    value: "62%",
    progress: 62
  }
];

export const recentAchievements: AchievementItem[] = [
  {
    title: "New Hard Lucid clear",
    detail: "Locked in with a cleaner final phase.",
    stamp: "Today"
  },
  {
    title: "Legion passed 8.6k",
    detail: "Account growth milestone hit this week.",
    stamp: "2d ago"
  },
  {
    title: "Hexa path updated",
    detail: "Better route after new testing and notes.",
    stamp: "This week"
  }
];
