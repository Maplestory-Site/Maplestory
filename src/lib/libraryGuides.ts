/**
 * libraryGuides.ts — pure filter / search / lookup helpers for the Maple Library.
 *
 * No React, no DOM, no fetch. All functions are deterministic and easy to test.
 */

import type {
  LibraryCategoryKey,
  LibraryDifficulty,
  LibraryGuide,
  LibraryRegion
} from "../data/libraryGuides";

export type LibraryFilter = {
  /** "all" matches every category. */
  category: LibraryCategoryKey | "all";
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

/** Returns true if the guide passes every active filter. */
export function guideMatches(guide: LibraryGuide, filter: LibraryFilter): boolean {
  if (filter.category !== "all" && guide.category !== filter.category) return false;
  if (filter.difficulty && guide.difficulty !== filter.difficulty) return false;
  if (filter.region && guide.region !== filter.region) return false;
  if (filter.tag) {
    const wanted = filter.tag.toLowerCase();
    const hit = guide.tags.some((t) => t.toLowerCase() === wanted);
    if (!hit) return false;
  }
  if (filter.query.trim()) {
    const haystack = [
      guide.title,
      guide.subcategory,
      guide.description,
      guide.summary,
      guide.tags.join(" ")
    ].join(" ");
    if (!matchesQuery(haystack, filter.query)) return false;
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

/** Returns related guides resolved from `guide.relatedIds`. Missing IDs are skipped. */
export function getRelatedGuides(all: LibraryGuide[], guide: LibraryGuide): LibraryGuide[] {
  if (!guide.relatedIds?.length) return [];
  const map = new Map(all.map((g) => [g.id, g] as const));
  return guide.relatedIds.map((id) => map.get(id)).filter((g): g is LibraryGuide => Boolean(g));
}

/** Map of category key → count, including "all". Useful for tab badges. */
export function getCategoryCounts(guides: LibraryGuide[]): Record<LibraryCategoryKey | "all", number> {
  const counts: Record<string, number> = { all: guides.length };
  for (const g of guides) {
    counts[g.category] = (counts[g.category] ?? 0) + 1;
  }
  return counts as Record<LibraryCategoryKey | "all", number>;
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
