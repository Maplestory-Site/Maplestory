/**
 * libraryGuides.ts — pure filter / search / lookup helpers for the Maple Library.
 *
 * No React, no DOM, no fetch. All functions are deterministic and easy to test.
 */

import type {
  LibraryCategory,
  LibraryCategoryKey,
  LibraryDifficulty,
  LibraryExternalLinkType,
  LibraryGuide,
  LibraryRegion
} from "../data/libraryGuides";

export type LibraryCategoryFilter = LibraryCategory | LibraryCategoryKey | "All" | "all";

export type LibraryFilter = {
  /** "All" matches every category. */
  category: LibraryCategoryFilter;
  /** Free-text search. Empty string disables search. */
  query: string;
  /** null = any difficulty. */
  difficulty: LibraryDifficulty | null;
  /** null = any region. */
  region: LibraryRegion | null;
  /** null / empty = any tag. Lower-cased compare. */
  tag: string | null;
};

export const EMPTY_LIBRARY_FILTER: LibraryFilter = {
  category: "all",
  query: "",
  difficulty: null,
  region: null,
  tag: null
};

/** True if `text` matches every whitespace-separated term in `query` (case-insensitive). */
export function matchesQuery(text: string, query: string): boolean {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return true;
  const haystack = text.toLowerCase();
  return trimmed.split(/\s+/).every((term) => haystack.includes(term));
}

/** Build a single searchable haystack string for a guide. */
export function buildGuideHaystack(guide: LibraryGuide): string {
  const sectionText = guide.sections.map((s) => `${s.heading} ${s.body}`).join(" ");
  return [
    guide.title,
    guide.subcategory ?? "",
    guide.description,
    guide.summary,
    guide.body ?? "",
    guide.tags.join(" "),
    sectionText
  ].join(" ");
}

/** Returns true if the guide passes every active filter. */
export function guideMatches(guide: LibraryGuide, filter: LibraryFilter): boolean {
  const category = normalizeCategoryFilter(filter.category);
  if (category && guide.category !== category) return false;
  if (filter.difficulty && guide.difficulty !== filter.difficulty) return false;
  if (filter.region && guide.region !== filter.region) return false;
  if (filter.tag) {
    const wanted = filter.tag.toLowerCase();
    const hit = guide.tags.some((t) => t.toLowerCase() === wanted);
    if (!hit) return false;
  }
  if (filter.query.trim() && !matchesQuery(buildGuideHaystack(guide), filter.query)) {
    return false;
  }
  return true;
}

export function filterGuides(guides: LibraryGuide[], filter: LibraryFilter): LibraryGuide[] {
  return guides.filter((guide) => guideMatches(guide, filter));
}

export function getGuideById(guides: LibraryGuide[], id: string): LibraryGuide | null {
  return guides.find((g) => g.id === id) ?? null;
}

/** Featured guides for the hero strip. Falls back to first N if none are flagged. */
export function getFeaturedGuides(guides: LibraryGuide[], limit = 3): LibraryGuide[] {
  const flagged = guides.filter((g) => g.featured);
  if (flagged.length >= 1) return flagged.slice(0, limit);
  return guides.slice(0, limit);
}

/** Returns related guides resolved from `guide.relatedGuideIds`. Missing IDs are skipped. */
export function getRelatedGuides(all: LibraryGuide[], guide: LibraryGuide): LibraryGuide[] {
  const relatedIds = guide.relatedGuideIds?.length ? guide.relatedGuideIds : guide.relatedIds ?? [];
  if (!relatedIds.length) return [];
  const map = new Map(all.map((g) => [g.id, g] as const));
  return relatedIds.map((id) => map.get(id)).filter((g): g is LibraryGuide => Boolean(g));
}

/** Map of category key → count, including "All". Useful for tab badges. */
export function getCategoryCounts(guides: LibraryGuide[]): Record<LibraryCategory | LibraryCategoryKey | "All" | "all", number> {
  const counts: Record<string, number> = { All: guides.length, all: guides.length };
  for (const g of guides) {
    counts[g.category] = (counts[g.category] ?? 0) + 1;
    const key = categoryToKey(g.category);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts as Record<LibraryCategory | LibraryCategoryKey | "All" | "all", number>;
}

/** Unique tag list, sorted alphabetically, lower-cased. */
export function getTagList(guides: LibraryGuide[]): string[] {
  const set = new Set<string>();
  for (const g of guides) for (const t of g.tags) set.add(t.toLowerCase());
  return [...set].sort();
}

export function isLibraryEmpty(filtered: LibraryGuide[]): boolean {
  return filtered.length === 0;
}

/** Flat list of all external links across all guides, deduplicated by URL. */
export type LibraryExternalLinkSummary = {
  label: string;
  url: string;
  type: LibraryExternalLinkType;
  guideCount: number;
};

export function getAllExternalLinks(guides: LibraryGuide[]): LibraryExternalLinkSummary[] {
  const byUrl = new Map<string, LibraryExternalLinkSummary>();
  for (const guide of guides) {
    for (const link of guide.externalLinks ?? []) {
      const existing = byUrl.get(link.url);
      if (existing) {
        existing.guideCount += 1;
        continue;
      }
      byUrl.set(link.url, { label: link.label, url: link.url, type: link.type, guideCount: 1 });
    }
  }
  return [...byUrl.values()].sort((a, b) => a.label.localeCompare(b.label));
}

/** True if a link type is third-party (Wiki / Community / Tool / Video). Used for the disclaimer. */
export function isThirdPartyLinkType(type: LibraryExternalLinkType): boolean {
  return type !== "Official";
}

export function categoryToKey(category: LibraryCategory): LibraryCategoryKey {
  return category.toLowerCase() as LibraryCategoryKey;
}

export function normalizeCategoryFilter(category: LibraryCategoryFilter): LibraryCategory | null {
  if (category === "All" || category === "all") return null;
  const normalized = category.toLowerCase();
  const map: Record<LibraryCategoryKey, LibraryCategory> = {
    content: "Content",
    classes: "Classes",
    equipment: "Equipment",
    events: "Events",
    resources: "Resources",
    beginner: "Beginner"
  };
  return map[normalized as LibraryCategoryKey] ?? (category as LibraryCategory);
}
