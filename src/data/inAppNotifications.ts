export type InAppNotification = {
  id: string;
  title: string;
  detail: string;
  href: string;
  timestamp: string;
  kind: "live" | "clip" | "upload" | "community";
  unread?: boolean;
};

export const inAppNotifications: InAppNotification[] = [
  {
    id: "notice-live",
    title: "Stream started",
    detail: "SNAILSLAYER just went live with a new MapleStory push.",
    href: "/live",
    timestamp: "Just now",
    kind: "live",
    unread: true
  },
  {
    id: "notice-clip",
    title: "New clip uploaded",
    detail: "Clip of the day is ready to watch and share.",
    href: "/videos",
    timestamp: "12 min ago",
    kind: "clip",
    unread: true
  },
  {
    id: "notice-upload",
    title: "Fresh upload synced",
    detail: "A new video landed in the latest uploads lane.",
    href: "/videos",
    timestamp: "1 hr ago",
    kind: "upload"
  },
  {
    id: "notice-community",
    title: "Discord alert ready",
    detail: "Join the server to catch the next stream ping first.",
    href: "/community",
    timestamp: "Today",
    kind: "community"
  }
];
