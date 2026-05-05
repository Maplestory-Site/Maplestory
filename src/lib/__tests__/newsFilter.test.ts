/**
 * newsFilter.test.ts — regression tests for the NewsPage filter helpers.
 *
 * Covers the changes added in the production-readiness pass:
 *  - region "all" returns items from every region
 *  - getNewsCategoryCounts treats "all" as no region filter
 *  - search now matches summary, category, region, sourceName, and KMS / GMS
 *    breakdown text in addition to title
 *  - the empty-string query path still short-circuits the matcher
 */
import { describe, expect, it } from "vitest";
import type { NewsItem } from "../../data/newsHub";
import { filterNewsItems, getNewsCategoryCounts } from "../newsHub";

const baseItem = (over: Partial<NewsItem> = {}): NewsItem => ({
  id: over.id ?? "x",
  title: "Default Title",
  category: "updates",
  region: "gms",
  publishedAt: "2026-04-30T00:00:00.000Z",
  summary: "Default summary",
  sourceName: "Official",
  sourceUrl: "https://example.com",
  copyrightLabel: "(c)",
  fetchedAt: "2026-04-30T00:00:00.000Z",
  ...over
});

const items: NewsItem[] = [
  baseItem({ id: "gms-1", title: "Patch v260 notes",      category: "patch-notes", region: "gms", summary: "balance changes" }),
  baseItem({ id: "gms-2", title: "Cash Shop Spring Sale", category: "cash-shop",   region: "gms", summary: "discounts" }),
  baseItem({ id: "kms-1", title: "Adele Buff Preview",    category: "updates",     region: "kms", summary: "kmst preview" }),
  baseItem({ id: "kms-2", title: "Hexa Stat Tweaks",      category: "patch-notes", region: "kms", summary: "stat rework" })
];

describe("filterNewsItems — region 'all'", () => {
  it("returns items from every region", () => {
    const result = filterNewsItems(items, "all", "", "all");
    expect(result.map((entry) => entry.id).sort()).toEqual(["gms-1", "gms-2", "kms-1", "kms-2"]);
  });

  it("still respects the category filter", () => {
    const result = filterNewsItems(items, "patch-notes", "", "all");
    expect(result.map((entry) => entry.id).sort()).toEqual(["gms-1", "kms-2"]);
  });
});

describe("filterNewsItems — gms / kms still strict", () => {
  it("region 'gms' returns only GMS items", () => {
    expect(filterNewsItems(items, "all", "", "gms").every((entry) => entry.region === "gms")).toBe(true);
  });
  it("region 'kms' returns only KMS items", () => {
    expect(filterNewsItems(items, "all", "", "kms").every((entry) => entry.region === "kms")).toBe(true);
  });
});

describe("filterNewsItems — search expansion", () => {
  it("matches summary text", () => {
    const result = filterNewsItems(items, "all", "discounts", "all");
    expect(result.map((entry) => entry.id)).toEqual(["gms-2"]);
  });

  it("matches category id", () => {
    const result = filterNewsItems(items, "all", "patch-notes", "all");
    expect(result.map((entry) => entry.id).sort()).toEqual(["gms-1", "kms-2"]);
  });

  it("matches region key", () => {
    const result = filterNewsItems(items, "all", "kms", "all");
    expect(result.map((entry) => entry.id).sort()).toEqual(["kms-1", "kms-2"]);
  });

  it("matches sourceName", () => {
    const result = filterNewsItems(items, "all", "official", "all");
    expect(result.length).toBe(items.length);
  });

  it("matches KMS breakdown tags / highlights / keyChanges", () => {
    const enriched: NewsItem[] = [
      ...items,
      baseItem({
        id: "kms-3",
        region: "kms",
        title: "Pathfinder Boost",
        kmsBreakdown: {
          sourceName: "kmst",
          sourceUrl: "https://example.com/k3",
          date: "2026-04-30",
          summary: "boost",
          tags: ["explorer-buff"],
          highlights: ["increased crit"],
          keyChanges: ["ignore-defense scaling"],
          audience: "Pathfinder mains",
          sections: []
        }
      })
    ];
    const tagHit = filterNewsItems(enriched, "all", "explorer-buff", "all");
    const highlightHit = filterNewsItems(enriched, "all", "increased crit", "all");
    const changeHit = filterNewsItems(enriched, "all", "ignore-defense", "all");
    expect(tagHit.some((entry) => entry.id === "kms-3")).toBe(true);
    expect(highlightHit.some((entry) => entry.id === "kms-3")).toBe(true);
    expect(changeHit.some((entry) => entry.id === "kms-3")).toBe(true);
  });

  it("empty / whitespace query short-circuits to all matches", () => {
    expect(filterNewsItems(items, "all", "", "all").length).toBe(items.length);
    expect(filterNewsItems(items, "all", "   ", "all").length).toBe(items.length);
  });

  it("returns [] when nothing matches", () => {
    expect(filterNewsItems(items, "all", "qqq-nope-zzz", "all")).toEqual([]);
  });
});

describe("getNewsCategoryCounts", () => {
  it("region 'all' counts items from every region", () => {
    const counts = getNewsCategoryCounts(items, "all");
    expect(counts.all).toBe(items.length);
    expect(counts["patch-notes"]).toBe(2);
    expect(counts["cash-shop"]).toBe(1);
    expect(counts.updates).toBe(1);
  });

  it("region 'gms' counts only GMS items", () => {
    const counts = getNewsCategoryCounts(items, "gms");
    expect(counts.all).toBe(2);
    expect(counts["patch-notes"]).toBe(1);
    expect(counts["cash-shop"]).toBe(1);
    expect(counts.updates).toBe(0);
  });

  it("region 'kms' counts only KMS items", () => {
    const counts = getNewsCategoryCounts(items, "kms");
    expect(counts.all).toBe(2);
    expect(counts["patch-notes"]).toBe(1);
    expect(counts.updates).toBe(1);
  });
});
