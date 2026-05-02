import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "../styles/library.css";
import "../styles/library-extras.css";
import { usePageMeta } from "../app/usePageMeta";
import { LibraryCategoryTabs } from "../components/content/LibraryCategoryTabs";
import { LibraryFeaturedGuides } from "../components/content/LibraryFeaturedGuides";
import { LibraryGuideCard } from "../components/content/LibraryGuideCard";
import { LibraryGuideModal } from "../components/content/LibraryGuideModal";
import { LibraryHero } from "../components/content/LibraryHero";
import { LibrarySearchFilters } from "../components/content/LibrarySearchFilters";
import { LibraryClassBrowser } from "../components/library/LibraryClassBrowser";
import { SectionHeader } from "../components/ui/SectionHeader";
import {
  libraryCategories,
  libraryDifficulties,
  libraryGuides,
  libraryRegions,
  type LibraryDifficulty,
  type LibraryGuide,
  type LibraryRegion
} from "../data/libraryGuides";
import { createLibraryPageModel, type LibrarySortMode } from "../lib/libraryPageModel";
import type { LibraryCategoryFilter } from "../lib/libraryGuides";

const SORT_OPTIONS: { value: LibrarySortMode; label: string }[] = [
  { value: "featured", label: "Featured" },
  { value: "recent",   label: "Recently Updated" },
  { value: "beginner", label: "Beginner Friendly" },
  { value: "az",       label: "A-Z" }
];

export function LibraryPage() {
  usePageMeta(
    "Maple Library",
    "Original guides on progression, classes, equipment, events, and trusted MapleStory resources."
  );

  const navigate = useNavigate();
  const { guideId, classId } = useParams<{ guideId?: string; classId?: string }>();

  const [activeCategory, setActiveCategory] = useState<LibraryCategoryFilter>("all");
  const [query, setQuery] = useState("");
  const [difficulty, setDifficulty] = useState<LibraryDifficulty | null>(null);
  const [region, setRegion] = useState<LibraryRegion | null>(null);
  const [tag, setTag] = useState<string | null>(null);
  const [sort, setSort] = useState<LibrarySortMode>("featured");

  const model = useMemo(
    () =>
      createLibraryPageModel(
        {
          activeCategory,
          query,
          difficulty,
          region,
          tag,
          guideId,
          sort
        },
        libraryGuides
      ),
    [activeCategory, query, difficulty, guideId, region, tag, sort]
  );

  const openGuide = (guide: LibraryGuide) => navigate(`/library/${guide.id}`);
  const closeGuide = () => navigate("/library");

  useEffect(() => {
    if (model.unknownGuideId) {
      navigate("/library", { replace: true });
    }
  }, [model.unknownGuideId, navigate]);

  const clearFilters = () => {
    setActiveCategory("all");
    setQuery("");
    setDifficulty(null);
    setRegion(null);
    setTag(null);
  };

  return (
    <>
      <section className="section section--page-start library-page" data-reveal>
        <div className="container">
          <LibraryHero
            beginnerGuides={model.beginnerGuides}
            onSelectGuide={openGuide}
            totalGuides={model.totalGuides}
          />

          <LibrarySearchFilters
            difficulties={libraryDifficulties}
            difficulty={difficulty}
            onClear={clearFilters}
            onDifficultyChange={setDifficulty}
            onQueryChange={setQuery}
            onRegionChange={setRegion}
            onTagChange={setTag}
            query={query}
            region={region}
            regions={libraryRegions}
            tag={tag}
            tags={model.tags}
          />

          <LibraryCategoryTabs
            activeCategory={activeCategory}
            categories={libraryCategories}
            counts={model.counts}
            onChange={setActiveCategory}
          />

          {model.showFeatured ? (
            <LibraryFeaturedGuides guides={model.featured} onSelectGuide={openGuide} />
          ) : null}

          <section aria-label="All guides" className="library-results">
            <div className="library-results__head">
              <SectionHeader
                description="Searchable guide cards with difficulty, region, and topic tags."
                eyebrow="Guide index"
                title={model.empty ? "No Matching Guides" : `${model.filtered.length} Guides`}
              />
              <label className="library-results__sort">
                <span>Sort by</span>
                <select
                  aria-label="Sort guides"
                  onChange={(event) => setSort(event.target.value as LibrarySortMode)}
                  value={sort}
                >
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {model.empty ? (
              <div className="content-empty-state card library-empty-state">
                <strong>No guides match those filters.</strong>
                <p>Try clearing a filter or searching for a different term.</p>
                <button onClick={clearFilters} type="button">
                  Clear filters
                </button>
              </div>
            ) : (
              <div className="library-grid">
                {model.filtered.map((guide) => (
                  <LibraryGuideCard guide={guide} key={guide.id} onSelect={openGuide} />
                ))}
              </div>
            )}
          </section>

          <LibraryClassBrowser
            onSelectClass={(nextClassId) => navigate(`/library/classes/${nextClassId}`)}
            selectedClassId={classId}
          />
        </div>
      </section>

      <LibraryGuideModal
        guide={model.selectedGuide}
        onClose={closeGuide}
        onSelectRelated={openGuide}
        related={model.relatedForSelected}
      />
    </>
  );
}
