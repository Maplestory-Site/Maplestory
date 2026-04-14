import newsFeedJson from "./newsFeed.json";

export type NewsCategory = "all" | "patch-notes" | "events" | "cash-shop" | "notices" | "updates";
export type NewsRegion = "gms" | "kms";
export type NewsCategoryKey = Exclude<NewsCategory, "all">;

export type NewsItem = {
  id: string;
  title: string;
  category: NewsCategoryKey;
  region: NewsRegion;
  publishedAt: string;
  summary: string;
  image?: string;
  sourceName: string;
  sourceUrl: string;
  copyrightLabel: string;
  fetchedAt: string;
  featured?: boolean;
  isNew?: boolean;
  kmsBreakdown?: {
    sourceName: string;
    sourceUrl: string;
    date: string;
    summary: string;
    tags: string[];
    highlights: string[];
    keyChanges: string[];
    audience: string;
    sections: {
      title: string;
      summary: string;
      details: Array<
        | { type: "text"; value: string }
        | { type: "image"; src: string; alt?: string }
        | { type: "list"; items: string[] }
        | { type: "subheading"; value: string }
        | string
      >;
      impact: string;
      topic: {
        key: string;
        label: string;
      };
    }[];
    categories?: Array<{ key: string; label: string; sections: unknown[] }>;
  };
  gmsBreakdown?: {
    sourceName: string;
    sourceUrl: string;
    date?: string;
    summary: string;
    keyPoints: string[];
    heroImage?: string;
    sections: {
      title: string;
      summary: string;
      details: Array<
        | { type: "text"; value: string }
        | { type: "image"; src: string; alt?: string }
        | { type: "list"; items: string[] }
        | { type: "subheading"; value: string }
        | string
      >;
      topic: {
        key: string;
        label: string;
      };
    }[];
    categories?: Array<{ key: string; label: string; sections: unknown[] }>;
  };
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

export const newsRegions: Array<{ key: NewsRegion; label: string }> = [
  { key: "gms", label: "GMS" },
  { key: "kms", label: "KMS" }
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
