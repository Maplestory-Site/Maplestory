import type { NewsCategory, NewsFeed, NewsItem } from "../data/newsHub";

export type NewsFeedPayload = {
  items: NewsItem[];
  meta: NewsFeed["meta"];
};

export function normalizeNewsFeed(payload: NewsFeedPayload): NewsFeed {
  return {
    items: [...payload.items].sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()),
    meta: payload.meta
  };
}

export function filterNewsItems(items: NewsItem[], category: NewsCategory, query: string) {
  const lowered = query.trim().toLowerCase();

  return items.filter((item) => {
    const matchesCategory = category === "all" ? true : item.category === category;
    const matchesQuery = lowered
      ? item.title.toLowerCase().includes(lowered) || item.summary.toLowerCase().includes(lowered)
      : true;

    return matchesCategory && matchesQuery;
  });
}

export function getFeaturedNews(items: NewsItem[]) {
  return items.find((item) => item.featured) ?? items[0] ?? null;
}

export function getNewsCategoryCounts(items: NewsItem[]) {
  return items.reduce<Record<NewsCategory, number>>(
    (counts, item) => {
      counts.all += 1;
      counts[item.category] += 1;
      return counts;
    },
    {
      all: 0,
      "patch-notes": 0,
      events: 0,
      "cash-shop": 0,
      notices: 0,
      updates: 0
    }
  );
}

export function formatNewsMetaDate(date: string) {
  if (!date) {
    return "Not synced yet";
  }

  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}
