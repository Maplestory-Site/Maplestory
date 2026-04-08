import newsFeedJson from "./newsFeed.json";

export type NewsCategory = "all" | "patch-notes" | "events" | "cash-shop" | "notices" | "updates";
export type NewsCategoryKey = Exclude<NewsCategory, "all">;

export type NewsItem = {
  id: string;
  title: string;
  category: NewsCategoryKey;
  publishedAt: string;
  summary: string;
  image?: string;
  sourceName: string;
  sourceUrl: string;
  copyrightLabel: string;
  fetchedAt: string;
  featured?: boolean;
  isNew?: boolean;
};

export type NewsFeedMeta = {
  lastUpdated: string;
  lastSuccessfulSync: string;
  cacheTtlMinutes: number;
  sourceStatus: "mock" | "cached" | "fresh" | "stale" | "error";
  itemCount: number;
  freshItemCount?: number;
  canAutoSync: boolean;
  sourceName?: string;
  bundledFallback?: boolean;
};

export type NewsFeed = {
  items: NewsItem[];
  meta: NewsFeedMeta;
};

export const newsCategories: Array<{ key: NewsCategory; label: string }> = [
  { key: "all", label: "All" },
  { key: "patch-notes", label: "Patch Notes" },
  { key: "events", label: "Events" },
  { key: "cash-shop", label: "Cash Shop" },
  { key: "notices", label: "Notices" },
  { key: "updates", label: "Updates" }
];

export const fallbackNewsFeed: NewsFeed = {
  items: Array.isArray((newsFeedJson as Partial<NewsFeed>).items) ? (newsFeedJson as NewsFeed).items : [],
  meta: {
    lastUpdated: "",
    lastSuccessfulSync: "",
    cacheTtlMinutes: 180,
    sourceStatus: "cached",
    itemCount: 0,
    freshItemCount: 0,
    canAutoSync: true,
    sourceName: "Official MapleStory / Nexon",
    ...(newsFeedJson as Partial<NewsFeed>).meta
  }
};

export function isRecentlyUpdated(date: string) {
  const publishedAt = new Date(date).getTime();
  const now = Date.now();
  return now - publishedAt < 1000 * 60 * 60 * 48;
}
