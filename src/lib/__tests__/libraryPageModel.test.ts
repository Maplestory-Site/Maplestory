import { describe, expect, it } from "vitest";
import { libraryGuides } from "../../data/libraryGuides";
import { createLibraryPageModel, DEFAULT_LIBRARY_PAGE_STATE, getLibraryCategoryTabs } from "../libraryPageModel";

describe("createLibraryPageModel", () => {
  it("builds the default Library page model", () => {
    const model = createLibraryPageModel(DEFAULT_LIBRARY_PAGE_STATE);

    expect(model.filtered.length).toBe(libraryGuides.length);
    expect(model.featured.length).toBeGreaterThan(0);
    expect(model.showFeatured).toBe(true);
    expect(model.empty).toBe(false);
    expect(getLibraryCategoryTabs().map((tab) => tab.key)).toContain("Beginner");
  });

  it("search filters guides by topic", () => {
    const model = createLibraryPageModel({
      ...DEFAULT_LIBRARY_PAGE_STATE,
      query: "star force"
    });

    expect(model.filtered.length).toBeGreaterThan(0);
    expect(model.filtered.some((guide) => guide.id === "star-force")).toBe(true);
    expect(model.showFeatured).toBe(false);
  });

  it("category filter returns only that guide category", () => {
    const model = createLibraryPageModel({
      ...DEFAULT_LIBRARY_PAGE_STATE,
      activeCategory: "events"
    });

    expect(model.filtered.length).toBeGreaterThan(0);
    expect(model.filtered.every((guide) => guide.category === "Events")).toBe(true);
  });

  it("difficulty filter returns only matching difficulty", () => {
    const model = createLibraryPageModel({
      ...DEFAULT_LIBRARY_PAGE_STATE,
      difficulty: "Advanced"
    });

    expect(model.filtered.length).toBeGreaterThan(0);
    expect(model.filtered.every((guide) => guide.difficulty === "Advanced")).toBe(true);
  });

  it("opens a guide detail model from a route id", () => {
    const model = createLibraryPageModel({
      ...DEFAULT_LIBRARY_PAGE_STATE,
      guideId: "progression-overview"
    });

    expect(model.selectedGuide?.id).toBe("progression-overview");
    expect(model.relatedForSelected.length).toBeGreaterThan(0);
    expect(model.unknownGuideId).toBe(false);
  });

  it("reports unknown route IDs for clean redirect handling", () => {
    const model = createLibraryPageModel({
      ...DEFAULT_LIBRARY_PAGE_STATE,
      guideId: "missing-guide"
    });

    expect(model.selectedGuide).toBeNull();
    expect(model.unknownGuideId).toBe(true);
  });

  it("shows empty state when filters match nothing", () => {
    const model = createLibraryPageModel({
      ...DEFAULT_LIBRARY_PAGE_STATE,
      query: "no-library-guide-should-match-this"
    });

    expect(model.filtered).toEqual([]);
    expect(model.empty).toBe(true);
  });
});
