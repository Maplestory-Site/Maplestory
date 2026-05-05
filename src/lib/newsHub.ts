import type { NewsCategory, NewsDetail, NewsFeed, NewsItem, NewsRegionFilter } from "../data/newsHub";

export type NewsFeedPayload = {
  items: NewsItem[];
  meta: NewsFeed["meta"];
};

export function normalizeNewsFeed(payload: NewsFeedPayload): NewsFeed {
  return {
    items: [...payload.items]
      .map((item) => ({
        ...item,
        region: item.region ?? "gms"
      }))
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()),
    meta: payload.meta
  };
}

function detailToSearchText(detail: NewsDetail): string {
  if (typeof detail === "string") return detail;
  if (detail.type === "text" || detail.type === "subheading") return detail.value;
  if (detail.type === "image") return `${detail.alt ?? ""} ${detail.caption ?? ""}`;
  if (detail.type === "link") return `${detail.label ?? ""} ${detail.href ?? ""}`;
  if (detail.type === "table") return [...(detail.headers ?? []), ...(detail.rows ?? []).flat()].join(" ");
  if (detail.type === "list") {
    return detail.items
      .map((item) => (typeof item === "string" ? item : `${item.text ?? ""} ${(item.children ?? []).join(" ")}`))
      .join(" ");
  }
  return "";
}

function breakdownSearchParts(breakdown: NewsItem["kmsBreakdown"] | NewsItem["gmsBreakdown"]): string[] {
  if (!breakdown) return [];
  return [
    breakdown.summary ?? "",
    ...(breakdown.sections ?? []).flatMap((section) => [
      section.title,
      section.summary,
      ...(section.details ?? []).map((detail) => detailToSearchText(detail))
    ])
  ];
}

export function buildSearchHaystack(item: NewsItem): string {
  const parts: string[] = [item.title, item.summary, item.category, item.region, item.sourceName ?? ""];
  if (item.kmsBreakdown) {
    parts.push(...(item.kmsBreakdown.tags ?? []));
    parts.push(...(item.kmsBreakdown.highlights ?? []));
    parts.push(...(item.kmsBreakdown.keyChanges ?? []));
    parts.push(...breakdownSearchParts(item.kmsBreakdown));
  }
  if (item.gmsBreakdown) {
    parts.push(...(item.gmsBreakdown.keyPoints ?? []));
    parts.push(...breakdownSearchParts(item.gmsBreakdown));
  }
  return parts.filter(Boolean).join(" ").toLowerCase();
}

export function filterNewsItems(items: NewsItem[], category: NewsCategory, query: string, region: NewsRegionFilter) {
  const lowered = query.trim().toLowerCase();

  return items.filter((item) => {
    const matchesCategory = category === "all" ? true : item.category === category;
    const matchesRegion = region === "all" ? true : item.region === region;
    const matchesQuery = lowered ? buildSearchHaystack(item).includes(lowered) : true;

    return matchesCategory && matchesRegion && matchesQuery;
  });
}

export function getFeaturedNews(items: NewsItem[]) {
  return items.find((item) => item.featured) ?? items[0] ?? null;
}

export function getNewsCategoryCounts(items: NewsItem[], region: NewsRegionFilter) {
  return items.reduce<Record<NewsCategory, number>>(
    (counts, item) => {
      if (region !== "all" && item.region !== region) {
        return counts;
      }
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
