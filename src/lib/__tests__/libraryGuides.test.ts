/**
 * libraryGuides.test.ts
 *
 * Tests the pure helpers that drive the LibraryPage UI: search, category
 * filter, difficulty filter, region/tag filter, guide-by-id lookup, and
 * empty-state detection. These cover every behavioural requirement in the
 * task spec without needing a DOM/React testing library.
 */

import { describe, expect, it } from "vitest";
import {
  libraryGuides,
  type LibraryGuide,
  type LibraryRegion
} from "../../data/libraryGuides";
import {
  EMPTY_LIBRARY_FILTER,
  filterGuides,
  getCategoryCounts,
  getFeaturedGuides,
  getGuideById,
  getRelatedGuides,
  getTagList,
  guideMatches,
  isLibraryEmpty,
  matchesQuery
} from "../libraryGuides";

const sample = (): LibraryGuide => libraryGuides[0]!;

describe("matchesQuery", () => {
  it("returns true for empty query", () => {
    expect(matchesQuery("anything", "")).toBe(true);
    expect(matchesQuery("", "")).toBe(true);
  });

  it("matches case-insensitively", () => {
    expect(matchesQuery("Progression Roadmap", "ROADMAP")).toBe(true);
  });

  it("requires every whitespace term to match", () => {
    expect(matchesQuery("Progression Roadmap", "progression roadmap")).toBe(true);
    expect(matchesQuery("Progression Roadmap", "progression boss")).toBe(false);
  });
});

describe("filterGuides — category filter", () => {
  it("'all' returns every guide", () => {
    const result = filterGuides(libraryGuides, { ...EMPTY_LIBRARY_FILTER });
    expect(result.length).toBe(libraryGuides.length);
  });

  it("'classes' returns only class guides", () => {
    const result = filterGuides(libraryGuides, { ...EMPTY_LIBRARY_FILTER, category: "classes" });
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((g) => g.category === "classes")).toBe(true);
  });

  it("'beginner' returns only beginner guides", () => {
    const result = filterGuides(libraryGuides, { ...EMPTY_LIBRARY_FILTER, category: "beginner" });
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((g) => g.category === "beginner")).toBe(true);
  });

  it("each category has at least one guide (catalogue completeness)", () => {
    for (const cat of ["content", "classes", "equipment", "events", "resources", "beginner"] as const) {
      const result = filterGuides(libraryGuides, { ...EMPTY_LIBRARY_FILTER, category: cat });
      expect(result.length, `category ${cat} should have at least one guide`).toBeGreaterThan(0);
    }
  });
});

describe("filterGuides — search", () => {
  it("matches by title term", () => {
    const result = filterGuides(libraryGuides, { ...EMPTY_LIBRARY_FILTER, query: "star force" });
    expect(result.length).toBeGreaterThan(0);
    expect(result.some((g) => g.title.toLowerCase().includes("star force"))).toBe(true);
  });

  it("matches by tag term", () => {
    const result = filterGuides(libraryGuides, { ...EMPTY_LIBRARY_FILTER, query: "potential" });
    expect(result.length).toBeGreaterThan(0);
  });

  it("returns empty when no match", () => {
    const result = filterGuides(libraryGuides, {
      ...EMPTY_LIBRARY_FILTER,
      query: "zzzzz-no-match-zzzzz"
    });
    expect(result).toEqual([]);
    expect(isLibraryEmpty(result)).toBe(true);
  });

  it("combines search with category filter", () => {
    const result = filterGuides(libraryGuides, {
      ...EMPTY_LIBRARY_FILTER,
      category: "classes",
      query: "link"
    });
    expect(result.every((g) => g.category === "classes")).toBe(true);
    expect(result.some((g) => g.id === "link-skills")).toBe(true);
  });
});

describe("filterGuides — difficulty filter", () => {
  it("Beginner returns only Beginner guides", () => {
    const result = filterGuides(libraryGuides, { ...EMPTY_LIBRARY_FILTER, difficulty: "Beginner" });
    expect(result.every((g) => g.difficulty === "Beginner")).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it("Advanced returns only Advanced guides", () => {
    const result = filterGuides(libraryGuides, { ...EMPTY_LIBRARY_FILTER, difficulty: "Advanced" });
    expect(result.every((g) => g.difficulty === "Advanced")).toBe(true);
  });
});

describe("filterGuides — region filter", () => {
  it("'GMS' returns only GMS-tagged guides", () => {
    const result = filterGuides(libraryGuides, { ...EMPTY_LIBRARY_FILTER, region: "GMS" });
    expect(result.every((g) => g.region === "GMS")).toBe(true);
  });

  it("'General' returns only General guides", () => {
    const result = filterGuides(libraryGuides, {
      ...EMPTY_LIBRARY_FILTER,
      region: "General" as LibraryRegion
    });
    expect(result.every((g) => g.region === "General")).toBe(true);
  });
});

describe("filterGuides — tag filter", () => {
  it("'progression' returns guides tagged progression", () => {
    const result = filterGuides(libraryGuides, { ...EMPTY_LIBRARY_FILTER, tag: "progression" });
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((g) => g.tags.includes("progression"))).toBe(true);
  });

  it("non-existent tag returns empty", () => {
    const result = filterGuides(libraryGuides, { ...EMPTY_LIBRARY_FILTER, tag: "definitely-not-a-tag" });
    expect(result).toEqual([]);
  });
});

describe("guideMatches — composite filters", () => {
  const guide = sample();

  it("passes when all filters match", () => {
    expect(
      guideMatches(guide, {
        category: guide.category,
        query: "",
        difficulty: guide.difficulty,
        region: guide.region,
        tag: null
      })
    ).toBe(true);
  });

  it("fails when category mismatches", () => {
    expect(
      guideMatches(guide, { ...EMPTY_LIBRARY_FILTER, category: guide.category === "content" ? "events" : "content" })
    ).toBe(false);
  });
});

describe("getGuideById", () => {
  it("returns the guide when ID exists", () => {
    const found = getGuideById(libraryGuides, "progression-overview");
    expect(found).not.toBeNull();
    expect(found?.title).toBe("Progression Roadmap");
  });

  it("returns null for unknown ID", () => {
    expect(getGuideById(libraryGuides, "nope-not-real")).toBeNull();
  });

  it("opens correctly for every guide ID in the catalogue", () => {
    for (const guide of libraryGuides) {
      expect(getGuideById(libraryGuides, guide.id)).toBe(guide);
    }
  });
});

describe("getFeaturedGuides", () => {
  it("returns flagged guides if any exist", () => {
    const featured = getFeaturedGuides(libraryGuides, 3);
    expect(featured.length).toBeGreaterThan(0);
    expect(featured.length).toBeLessThanOrEqual(3);
    expect(featured.every((g) => g.featured === true)).toBe(true);
  });

  it("falls back to first N when none are flagged", () => {
    const noFlagged: LibraryGuide[] = libraryGuides.map((g) => ({ ...g, featured: false }));
    const featured = getFeaturedGuides(noFlagged, 2);
    expect(featured.length).toBe(2);
  });
});

describe("getRelatedGuides", () => {
  it("resolves IDs to guide objects", () => {
    const guide = getGuideById(libraryGuides, "progression-overview")!;
    const related = getRelatedGuides(libraryGuides, guide);
    expect(related.length).toBe(guide.relatedIds!.length);
    expect(related.every((g) => guide.relatedIds!.includes(g.id))).toBe(true);
  });

  it("skips missing IDs gracefully", () => {
    const fake: LibraryGuide = { ...sample(), relatedIds: ["nope-1", "nope-2"] };
    expect(getRelatedGuides(libraryGuides, fake)).toEqual([]);
  });

  it("returns [] when guide has no relatedIds", () => {
    const fake: LibraryGuide = { ...sample(), relatedIds: undefined };
    expect(getRelatedGuides(libraryGuides, fake)).toEqual([]);
  });
});

describe("getCategoryCounts", () => {
  it("'all' equals total guide count", () => {
    const counts = getCategoryCounts(libraryGuides);
    expect(counts.all).toBe(libraryGuides.length);
  });

  it("per-category counts sum to total", () => {
    const counts = getCategoryCounts(libraryGuides);
    const sum = (["content", "classes", "equipment", "events", "resources", "beginner"] as const).reduce(
      (acc, key) => acc + (counts[key] ?? 0),
      0
    );
    expect(sum).toBe(libraryGuides.length);
  });
});

describe("getTagList", () => {
  it("returns sorted unique tags", () => {
    const tags = getTagList(libraryGuides);
    expect(tags.length).toBeGreaterThan(0);
    const sorted = [...tags].sort();
    expect(tags).toEqual(sorted);
    expect(new Set(tags).size).toBe(tags.length);
  });

  it("contains expected core tags", () => {
    const tags = getTagList(libraryGuides);
    expect(tags).toContain("progression");
    expect(tags).toContain("link-skills");
    expect(tags).toContain("star-force");
  });
});

describe("isLibraryEmpty", () => {
  it("returns true for empty array", () => {
    expect(isLibraryEmpty([])).toBe(true);
  });

  it("returns false for non-empty array", () => {
    expect(isLibraryEmpty([sample()])).toBe(false);
  });

  it("returns true after a query that matches nothing", () => {
    const filtered = filterGuides(libraryGuides, { ...EMPTY_LIBRARY_FILTER, query: "qqqzzz-no-such-thing" });
    expect(isLibraryEmpty(filtered)).toBe(true);
  });
});

describe("data integrity", () => {
  it("all guide IDs are unique", () => {
    const ids = new Set(libraryGuides.map((g) => g.id));
    expect(ids.size).toBe(libraryGuides.length);
  });

  it("all relatedIds reference existing guides", () => {
    const allIds = new Set(libraryGuides.map((g) => g.id));
    for (const guide of libraryGuides) {
      for (const id of guide.relatedIds ?? []) {
        expect(allIds.has(id), `Guide '${guide.id}' references missing relatedId '${id}'`).toBe(true);
      }
    }
  });

  it("every guide has at least one tag", () => {
    for (const g of libraryGuides) {
      expect(g.tags.length, `Guide ${g.id} has no tags`).toBeGreaterThan(0);
    }
  });

  it("every guide has a non-empty body and summary", () => {
    for (const g of libraryGuides) {
      expect(g.summary.length).toBeGreaterThan(20);
      expect(g.body.length).toBeGreaterThan(20);
    }
  });

  it("difficulty values are within the allowed set", () => {
    for (const g of libraryGuides) {
      expect(["Beginner", "Intermediate", "Advanced"]).toContain(g.difficulty);
    }
  });

  it("region values are within the allowed set", () => {
    for (const g of libraryGuides) {
      expect(["GMS", "KMS", "General"]).toContain(g.region);
    }
  });
});
