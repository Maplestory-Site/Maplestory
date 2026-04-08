export type MockProfileStat = {
  label: string;
  value: string;
};

export type MockSavedClip = {
  id: string;
  title: string;
  tag: string;
  duration: string;
  href: string;
  thumbnail?: string;
  note: string;
};

export type MockWatchHistoryItem = {
  id: string;
  title: string;
  type: "Live Replay" | "Video" | "Clip";
  watchedAt: string;
  progress: number;
  href: string;
};

export type MockFavoriteItem = {
  id: string;
  title: string;
  category: string;
  href: string;
  thumbnail?: string;
};

export type MockNotificationItem = {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
};

export const mockProfileStats: MockProfileStat[] = [
  { label: "Saved clips", value: "12" },
  { label: "Watch streak", value: "5 days" },
  { label: "Favorites", value: "8" },
  { label: "Hours watched", value: "34h" }
];

export const mockSavedClips: MockSavedClip[] = [
  {
    id: "saved-1",
    title: "Clip of the day: clean finish under pressure",
    tag: "Boss fight",
    duration: "00:48",
    href: "/videos",
    thumbnail: "/snailslayer-logo.jpeg",
    note: "Saved for replay before the next run."
  },
  {
    id: "saved-2",
    title: "Fast progression route worth copying",
    tag: "Progression",
    duration: "00:37",
    href: "/videos",
    thumbnail: "/avatar.jpg",
    note: "A quick pull for the next upgrade plan."
  },
  {
    id: "saved-3",
    title: "Community catch-up with the best laugh",
    tag: "Funny moment",
    duration: "00:29",
    href: "/videos",
    thumbnail: "/snailslayer-logo.jpeg",
    note: "Saved because this one always lands."
  }
];

export const mockWatchHistory: MockWatchHistoryItem[] = [
  {
    id: "history-1",
    title: "Nightly progression and bossing session",
    type: "Live Replay",
    watchedAt: "20 minutes ago",
    progress: 82,
    href: "/live"
  },
  {
    id: "history-2",
    title: "The cleanest prep for new boss progression",
    type: "Video",
    watchedAt: "Yesterday",
    progress: 64,
    href: "/videos"
  },
  {
    id: "history-3",
    title: "Patch notes reaction in one clean minute",
    type: "Clip",
    watchedAt: "2 days ago",
    progress: 100,
    href: "/videos"
  }
];

export const mockFavoriteContent: MockFavoriteItem[] = [
  {
    id: "favorite-1",
    title: "Bossing mistakes that cost more damage than you think",
    category: "Bossing",
    href: "https://www.youtube.com/@snailslayermain",
    thumbnail: "/avatar.jpg"
  },
  {
    id: "favorite-2",
    title: "Progression update: where the account goes next",
    category: "Progression",
    href: "https://www.youtube.com/@snailslayermain",
    thumbnail: "/snailslayer-logo.jpeg"
  }
];

export const mockNotificationItems: MockNotificationItem[] = [
  {
    id: "notify-live",
    label: "Live alerts",
    description: "Get the ping when the next stream starts.",
    enabled: true
  },
  {
    id: "notify-video",
    label: "New videos",
    description: "Keep the latest uploads at the top of your loop.",
    enabled: true
  },
  {
    id: "notify-clips",
    label: "Best clips",
    description: "See the fastest highlights first.",
    enabled: false
  }
];
