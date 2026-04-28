import { describe, expect, it } from "vitest";
import type { NewsFeed, NewsItem } from "../../data/newsHub";
import { filterNewsItems, getFeaturedNews, getNewsCategoryCounts, normalizeNewsFeed } from "../newsHub";

function makeItem(id: string, overrides: Partial<NewsItem> = {}): NewsItem {
  return {
    id,
    title: `Article ${id}`,
    category: "updates",
    region: "gms",
    publishedAt: "2026-04-20T10:00:00.000Z",
    summary: "Maple update summary",
    sourceName: "Nexon",
    sourceUrl: `https://example.com/${id}`,
    copyrightLabel: "Official",
    fetchedAt: "2026-04-20T10:00:00.000Z",
    ...overrides
  };
}

describe("newsHub helpers", () => {
  it("normalizes feed ordering and defaults region", () => {
    const feed = normalizeNewsFeed({
      items: [
        makeItem("old", { publishedAt: "2026-04-01T10:00:00.000Z" }),
        { ...makeItem("new", { publishedAt: "2026-04-22T10:00:00.000Z" }), region: undefined as never }
      ],
      meta: {
        lastUpdated: "",
        lastSuccessfulSync: "",
        cacheTtlMinutes: 5,
        sourceStatus: "fresh",
        itemCount: 2,
        canAutoSync: true
      }
    } satisfies NewsFeed);

    expect(feed.items.map((item) => item.id)).toEqual(["new", "old"]);
    expect(feed.items[0]?.region).toBe("gms");
  });

  it("filters by region, category, and search query", () => {
    const items = [
      makeItem("gms-event", { category: "events", summary: "Burning event reward" }),
      makeItem("kms-event", { category: "events", region: "kms", summary: "KMS preview" }),
      makeItem("cash", { category: "cash-shop", summary: "Sale bundle" })
    ];

    const results = filterNewsItems(items, "events", "burning", "gms");

    expect(results).toHaveLength(1);
    expect(results[0]?.id).toBe("gms-event");
  });

  it("calculates category counts and featured item", () => {
    const items = [
      makeItem("normal"),
      makeItem("featured", { featured: true, category: "patch-notes" }),
      makeItem("kms", { region: "kms", category: "events" })
    ];

    expect(getFeaturedNews(items)?.id).toBe("featured");
    expect(getNewsCategoryCounts(items, "gms")).toMatchObject({
      all: 2,
      "patch-notes": 1,
      updates: 1
    });
  });
});
