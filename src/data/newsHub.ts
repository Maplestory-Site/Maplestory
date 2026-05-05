import newsFeedJson from "./newsFeed.json";

export type NewsCategory = "all" | "patch-notes" | "events" | "cash-shop" | "notices" | "updates";
export type NewsRegion = "gms" | "kms";
/**
 * Region selector used by NewsPage region tabs. Adds an "all" option that
 * the underlying NewsItem.region field cannot have — kept as a separate type.
 */
export type NewsRegionFilter = NewsRegion | "all";
export type NewsCategoryKey = Exclude<NewsCategory, "all">;

export type NewsListItem =
  | string
  | {
      text?: string;
      children?: string[];
    };

export type NewsDetail =
  | string
  | { type: "text"; value: string }
  | { type: "image"; src: string; alt?: string; caption?: string }
  | { type: "list"; items: NewsListItem[] }
  | { type: "subheading"; value: string }
  | { type: "link"; href: string; label: string }
  | { type: "table"; headers?: string[]; rows: string[][]; caption?: string };

export type NewsBreakdownSection = {
  title: string;
  summary: string;
  details: NewsDetail[];
  impact?: string;
  topic: {
    key: string;
    label: string;
  };
};

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
    heroImage?: string;
    tags: string[];
    highlights: string[];
    keyChanges: string[];
    audience: string;
    sections: Array<NewsBreakdownSection & { impact: string }>;
    categories?: Array<{ key: string; label: string; sections: unknown[] }>;
  };
  gmsBreakdown?: {
    sourceName: string;
    sourceUrl: string;
    date?: string;
    summary: string;
    keyPoints: string[];
    heroImage?: string;
    sections: NewsBreakdownSection[];
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
  gmsCount?: number;
  kmsCount?: number;
  kmsLimit?: number;
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

export const newsRegions: Array<{ key: NewsRegionFilter; label: string }> = [
  { key: "all", label: "All Regions" },
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
