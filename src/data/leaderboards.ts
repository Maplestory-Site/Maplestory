export type LeaderboardEntry = {
  id: string;
  name: string;
  value: string;
  badge?: string;
};

export type LeaderboardColumn = {
  id: string;
  title: string;
  subtitle: string;
  accent: "gold" | "orange" | "blue";
  entries: LeaderboardEntry[];
};

export const leaderboards: LeaderboardColumn[] = [
  {
    id: "top-viewers",
    title: "Top viewers",
    subtitle: "The names showing up the most.",
    accent: "gold",
    entries: [
      { id: "viewer-1", name: "MapleCrown", value: "42 streams", badge: "MVP" },
      { id: "viewer-2", name: "BossRush", value: "38 streams" },
      { id: "viewer-3", name: "LegionLord", value: "31 streams" }
    ]
  },
  {
    id: "most-active",
    title: "Most active",
    subtitle: "People keeping chat and Discord moving.",
    accent: "orange",
    entries: [
      { id: "active-1", name: "PatchPing", value: "89 messages", badge: "Hot" },
      { id: "active-2", name: "NodeMaster", value: "76 messages" },
      { id: "active-3", name: "ArcaneRoute", value: "63 messages" }
    ]
  },
  {
    id: "top-clips",
    title: "Top clips",
    subtitle: "The moments everyone replayed.",
    accent: "blue",
    entries: [
      { id: "clip-1", name: "Boss phase save", value: "1.9k plays", badge: "Top" },
      { id: "clip-2", name: "Wild Hunter update", value: "1.4k plays" },
      { id: "clip-3", name: "Funny run reset", value: "1.1k plays" }
    ]
  }
];
