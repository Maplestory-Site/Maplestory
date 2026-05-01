import {
  libraryCategories,
  libraryGuides,
  type LibraryCategoryKey,
  type LibraryDifficulty,
  type LibraryGuide,
  type LibraryRegion
} from "../data/libraryGuides";
import {
  EMPTY_LIBRARY_FILTER,
  filterGuides,
  getAllExternalLinks,
  getCategoryCounts,
  getFeaturedGuides,
  getGuideById,
  getRelatedGuides,
  getTagList,
  isLibraryEmpty,
  sortGuides,
  type LibraryCategoryFilter,
  type LibraryExternalLinkSummary,
  type LibraryFilter,
  type LibrarySortMode
} from "./libraryGuides";

export type { LibrarySortMode } from "./libraryGuides";

export type LibraryPageState = {
  activeCategory: LibraryCategoryFilter;
  query: string;
  difficulty: LibraryDifficulty | null;
  region: LibraryRegion | null;
  tag: string | null;
  guideId?: string;
  /** Sort mode applied to filtered results. Defaults to "featured". */
  sort?: LibrarySortMode;
};

export type LibraryPageModel = {
  filter: LibraryFilter;
  filtered: LibraryGuide[];
  featured: LibraryGuide[];
  counts: Record<LibraryCategoryKey | "all" | "All" | import("../data/libraryGuides").LibraryCategory, number>;
  tags: string[];
  selectedGuide: LibraryGuide | null;
  relatedForSelected: LibraryGuide[];
  beginnerGuides: LibraryGuide[];
  resourceLinks: LibraryExternalLinkSummary[];
  totalGuides: number;
  empty: boolean;
  showFeatured: boolean;
  unknownGuideId: boolean;
};

export const DEFAULT_LIBRARY_PAGE_STATE: LibraryPageState = {
  activeCategory: "all",
  query: "",
  difficulty: null,
  region: null,
  tag: null,
  sort: "featured"
};

export function createLibraryPageModel(
  state: LibraryPageState,
  guides: LibraryGuide[] = libraryGuides
): LibraryPageModel {
  const filter: LibraryFilter = {
    ...EMPTY_LIBRARY_FILTER,
    category: state.activeCategory,
    query: state.query,
    difficulty: state.difficulty,
    region: state.region,
    tag: state.tag
  };
  const filtered = sortGuides(filterGuides(guides, filter), state.sort ?? "featured");
  const featured = getFeaturedGuides(guides, 3);
  const counts = getCategoryCounts(guides);
  const tags = getTagList(guides);
  const selectedGuide = state.guideId ? getGuideById(guides, state.guideId) : null;
  const relatedForSelected = selectedGuide ? getRelatedGuides(guides, selectedGuide) : [];
  const beginnerGuides = guides.filter((guide) => guide.category === "Beginner").slice(0, 4);
  const resourceLinks = getAllExternalLinks(guides).slice(0, 8);
  const hasActiveFilter =
    state.activeCategory !== "all" || Boolean(state.query || state.difficulty || state.region || state.tag);

  return {
    filter,
    filtered,
    featured,
    counts,
    tags,
    selectedGuide,
    relatedForSelected,
    beginnerGuides,
    resourceLinks,
    totalGuides: guides.length,
    empty: isLibraryEmpty(filtered),
    showFeatured: !hasActiveFilter && featured.length > 0,
    unknownGuideId: Boolean(state.guideId && !selectedGuide)
  };
}

export function getLibraryCategoryTabs() {
  return libraryCategories;
}
