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
  getCategoryCounts,
  getFeaturedGuides,
  getGuideById,
  getRelatedGuides,
  getTagList,
  isLibraryEmpty,
  type LibraryCategoryFilter,
  type LibraryFilter
} from "./libraryGuides";

export type LibraryPageState = {
  activeCategory: LibraryCategoryFilter;
  query: string;
  difficulty: LibraryDifficulty | null;
  region: LibraryRegion | null;
  tag: string | null;
  guideId?: string;
};

export type LibraryPageModel = {
  filter: LibraryFilter;
  filtered: LibraryGuide[];
  featured: LibraryGuide[];
  counts: Record<LibraryCategoryKey | "all" | "All" | import("../data/libraryGuides").LibraryCategory, number>;
  tags: string[];
  selectedGuide: LibraryGuide | null;
  relatedForSelected: LibraryGuide[];
  empty: boolean;
  showFeatured: boolean;
  unknownGuideId: boolean;
};

export const DEFAULT_LIBRARY_PAGE_STATE: LibraryPageState = {
  activeCategory: "all",
  query: "",
  difficulty: null,
  region: null,
  tag: null
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
  const filtered = filterGuides(guides, filter);
  const featured = getFeaturedGuides(guides, 3);
  const counts = getCategoryCounts(guides);
  const tags = getTagList(guides);
  const selectedGuide = state.guideId ? getGuideById(guides, state.guideId) : null;
  const relatedForSelected = selectedGuide ? getRelatedGuides(guides, selectedGuide) : [];
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
    empty: isLibraryEmpty(filtered),
    showFeatured: !hasActiveFilter && featured.length > 0,
    unknownGuideId: Boolean(state.guideId && !selectedGuide)
  };
}

export function getLibraryCategoryTabs() {
  return libraryCategories;
}
