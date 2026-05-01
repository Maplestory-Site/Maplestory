/**
 * librarySort.test.ts - sort-mode and image-fallback regressions.
 *
 * Covers the four sort modes (Featured / Recently Updated / Beginner Friendly
 * / A-Z) and the asset-helper fallback chain. All assertions run against the
 * real catalogue + the real asset module - no mocks.
 */

import { describe, expect, it } from "vitest";
import { libraryGuides, type LibraryGuide } from "../../data/libraryGuides";
import {
  getCategoryAsset,
  getGuideCardImage,
  getGuideHeroImage,
  getGuideIcon,
  getGuideTheme,
  hasOwnImage,
  libraryCategoryAssets,
  LIBRARY_ICON_PATHS
} from "../../data/libraryAssets";
import { sortGuides, type LibrarySortMode } from "../libraryGuides";
import { createLibraryPageModel } from "../libraryPageModel";

const sample = (): LibraryGuide => libraryGuides[0]!;

describe("sortGuides - featured", () => {
  it("featured guides come first", () => {
    const sorted = sortGuides(libraryGuides, "featured");
    const featuredCount = libraryGuides.filter((g) => g.featured).length;
    expect(featuredCount).toBeGreaterThan(0);
    for (let i = 0; i < featuredCount; i++) {
      expect(sorted[i]!.featured).toBe(true);
    }
  });

  it("among featured, more recent updates come first", () => {
    const sorted = sortGuides(libraryGuides, "featured");
    const featured = sorted.filter((g) => g.featured);
    for (let i = 0; i < featured.length - 1; i++) {
      expect(featured[i]!.lastUpdated >= featured[i + 1]!.lastUpdated).toBe(true);
    }
  });
});

describe("sortGuides - recent", () => {
  it("guides come back in descending lastUpdated order", () => {
    const sorted = sortGuides(libraryGuides, "recent");
    for (let i = 0; i < sorted.length - 1; i++) {
      expect(sorted[i]!.lastUpdated >= sorted[i + 1]!.lastUpdated).toBe(true);
    }
  });
});

describe("sortGuides - beginner", () => {
  it("Beginner difficulty bubbles to the top, Advanced to the bottom", () => {
    const sorted = sortGuides(libraryGuides, "beginner");
    const ranks = sorted.map((g) =>
      g.difficulty === "Beginner" ? 0 : g.difficulty === "Intermediate" ? 1 : 2
    );
    for (let i = 0; i < ranks.length - 1; i++) {
      expect(ranks[i]! <= ranks[i + 1]!).toBe(true);
    }
  });

  it("ties within a difficulty are alphabetical", () => {
    const sorted = sortGuides(libraryGuides, "beginner");
    const beginners = sorted.filter((g) => g.difficulty === "Beginner");
    for (let i = 0; i < beginners.length - 1; i++) {
      expect(beginners[i]!.title.localeCompare(beginners[i + 1]!.title) <= 0).toBe(true);
    }
  });
});

describe("sortGuides - A-Z", () => {
  it("alphabetical by title", () => {
    const sorted = sortGuides(libraryGuides, "az");
    for (let i = 0; i < sorted.length - 1; i++) {
      expect(sorted[i]!.title.localeCompare(sorted[i + 1]!.title) <= 0).toBe(true);
    }
  });
});

describe("sortGuides - purity", () => {
  it("does not mutate the input array", () => {
    const original = [...libraryGuides];
    const before = libraryGuides.map((g) => g.id);
    for (const mode of ["featured", "recent", "beginner", "az"] as LibrarySortMode[]) {
      sortGuides(libraryGuides, mode);
    }
    const after = libraryGuides.map((g) => g.id);
    expect(after).toEqual(before);
    expect(libraryGuides).toEqual(original);
  });
});

describe("createLibraryPageModel - sort wiring", () => {
  it("applies the selected sort to the filtered list", () => {
    const az = createLibraryPageModel({
      activeCategory: "all",
      query: "",
      difficulty: null,
      region: null,
      tag: null,
      sort: "az"
    });
    for (let i = 0; i < az.filtered.length - 1; i++) {
      expect(az.filtered[i]!.title.localeCompare(az.filtered[i + 1]!.title) <= 0).toBe(true);
    }
  });

  it("defaults to featured when sort is omitted", () => {
    const model = createLibraryPageModel({
      activeCategory: "all",
      query: "",
      difficulty: null,
      region: null,
      tag: null
    });
    const featuredCount = libraryGuides.filter((g) => g.featured).length;
    if (featuredCount > 0) {
      expect(model.filtered[0]!.featured).toBe(true);
    }
  });
});

// Asset-mapping integrity

describe("libraryCategoryAssets", () => {
  it("has an entry for every category used in the catalogue", () => {
    const categoriesInUse = new Set(libraryGuides.map((g) => g.category));
    for (const cat of categoriesInUse) {
      expect(libraryCategoryAssets[cat], `missing asset for category ${cat}`).toBeDefined();
    }
  });

  it("every category asset references a known icon key", () => {
    for (const cat of Object.keys(libraryCategoryAssets) as Array<keyof typeof libraryCategoryAssets>) {
      const asset = libraryCategoryAssets[cat]!;
      expect(LIBRARY_ICON_PATHS[asset.icon], `unknown icon ${asset.icon} on category ${cat}`).toBeTruthy();
    }
  });

  it("every category asset has a non-empty fallback image and gradient", () => {
    for (const cat of Object.keys(libraryCategoryAssets) as Array<keyof typeof libraryCategoryAssets>) {
      const asset = libraryCategoryAssets[cat]!;
      expect(asset.fallbackImage.length).toBeGreaterThan(0);
      expect(asset.gradient.length).toBeGreaterThan(0);
      expect(asset.accent.length).toBeGreaterThan(0);
    }
  });
});

describe("getGuideIcon", () => {
  it("returns a key that exists in LIBRARY_ICON_PATHS for every guide", () => {
    for (const guide of libraryGuides) {
      const key = getGuideIcon(guide);
      expect(LIBRARY_ICON_PATHS[key], `guide ${guide.id} got unknown icon ${key}`).toBeTruthy();
    }
  });

  it("prefers an explicit iconKey when supplied", () => {
    const guide = sample();
    const result = getGuideIcon({ ...guide, iconKey: "calendar" });
    expect(result).toBe("calendar");
  });

  it("falls back to the category icon when no tag matches", () => {
    // iconKey from sample() would short-circuit; pass a partial without iconKey.
    expect(getGuideIcon({ category: "Resources", tags: [] })).toBe(libraryCategoryAssets.Resources.icon);
  });

  it("matches a tag-based hint (link-skills -> 'link')", () => {
    expect(getGuideIcon({ category: "Classes", tags: ["link-skills"] })).toBe("link");
  });
});

describe("getGuideCardImage / getGuideHeroImage / hasOwnImage", () => {
  it("returns a non-empty string for every guide", () => {
    for (const guide of libraryGuides) {
      expect(getGuideCardImage(guide).length, `card image empty for ${guide.id}`).toBeGreaterThan(0);
      expect(getGuideHeroImage(guide).length, `hero image empty for ${guide.id}`).toBeGreaterThan(0);
    }
  });

  it("falls back to the category cardImage when the guide has no own image", () => {
    // Helpers accept partials by design; they exist precisely to fill missing fields.
    const partial = { category: "Content" as const };
    expect(getGuideCardImage(partial)).toBe(getCategoryAsset("Content").cardImage);
    // hasOwnImage takes its own partial shape (no category needed).
    expect(hasOwnImage({})).toBe(false);
  });

  it("prefers heroImage over image and image over section image", () => {
    // The helpers accept partials, so we test the priority chain on a partial
    // (otherwise sample()'s enriched cardImage would short-circuit).
    const partial = {
      category: "Content" as const,
      heroImage: "/hero.png",
      image: "/card.png",
      sections: [{ heading: "h", body: "b", image: "/section.png" }]
    };
    expect(getGuideHeroImage(partial)).toBe("/hero.png");
    expect(getGuideCardImage(partial)).toBe("/hero.png"); // heroImage wins when cardImage is unset
  });

  it("hasOwnImage is true when any image source is set", () => {
    expect(hasOwnImage({ heroImage: "/x.png" })).toBe(true);
    expect(hasOwnImage({ image: "/x.png" })).toBe(true);
    expect(hasOwnImage({})).toBe(false);
  });
});

describe("getGuideTheme", () => {
  it("returns a gradient and accent for every guide", () => {
    for (const guide of libraryGuides) {
      const theme = getGuideTheme(guide);
      expect(theme.gradient.length).toBeGreaterThan(0);
      expect(theme.accent.startsWith("#") || theme.accent.startsWith("rgb")).toBe(true);
    }
  });
});

describe("LIBRARY_ICON_PATHS", () => {
  it("has only non-empty SVG path strings", () => {
    for (const [key, value] of Object.entries(LIBRARY_ICON_PATHS)) {
      expect(value.length, `empty SVG path for ${key}`).toBeGreaterThan(8);
    }
  });
});
