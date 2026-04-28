import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "../styles/library.css";
import { usePageMeta } from "../app/usePageMeta";
import { LibraryGuideCard } from "../components/content/LibraryGuideCard";
import { LibraryGuideModal } from "../components/content/LibraryGuideModal";
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
import { createLibraryPageModel } from "../lib/libraryPageModel";
import type { LibraryCategoryFilter } from "../lib/libraryGuides";

export function LibraryPage() {
  usePageMeta(
    "Maple Library",
    "Original guides on progression, classes, equipment, events, and trusted MapleStory resources."
  );

  const navigate = useNavigate();
  const { guideId } = useParams<{ guideId?: string }>();

  const [activeCategory, setActiveCategory] = useState<LibraryCategoryFilter>("all");
  const [query, setQuery] = useState("");
  const [difficulty, setDifficulty] = useState<LibraryDifficulty | null>(null);
  const [region, setRegion] = useState<LibraryRegion | null>(null);
  const [tag, setTag] = useState<string | null>(null);

  const model = useMemo(
    () =>
      createLibraryPageModel(
        {
          activeCategory,
          query,
          difficulty,
          region,
          tag,
          guideId
        },
        libraryGuides
      ),
    [activeCategory, query, difficulty, guideId, region, tag]
  );

  // Open / close handlers — keep URL in sync so deep links work.
  const openGuide = (guide: LibraryGuide) => navigate(`/library/${guide.id}`);
  const closeGuide = () => navigate("/library");

  // If the URL has an unknown guideId, redirect back to /library cleanly.
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
      <section className="section section--page-start" data-reveal>
        <div className="container">
          <SectionHeader
            description="Original guides on progression, classes, equipment, events, and trusted resources."
            eyebrow="Library"
            title="Maple Library"
          />

          <div className="library-toolbar card">
            <label className="library-toolbar__search">
              <span>Search</span>
              <input
                aria-label="Search guides"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by title, tag, or topic"
                type="search"
                value={query}
              />
            </label>

            <div className="library-toolbar__filters" role="group" aria-label="Filter guides">
              <label>
                <span>Difficulty</span>
                <select
                  onChange={(event) => setDifficulty((event.target.value || null) as LibraryDifficulty | null)}
                  value={difficulty ?? ""}
                >
                  <option value="">Any</option>
                  {libraryDifficulties.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Region</span>
                <select
                  onChange={(event) => setRegion((event.target.value || null) as LibraryRegion | null)}
                  value={region ?? ""}
                >
                  <option value="">Any</option>
                  {libraryRegions.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Tag</span>
                <select onChange={(event) => setTag(event.target.value || null)} value={tag ?? ""}>
                  <option value="">Any</option>
                  {model.tags.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>
              {difficulty || region || tag || query ? (
                <button className="library-toolbar__clear" onClick={clearFilters} type="button">
                  Clear filters
                </button>
              ) : null}
            </div>
          </div>

          <nav className="library-tabs" aria-label="Library categories">
            {libraryCategories.map((category) => (
              <button
                aria-pressed={activeCategory === category.key}
                className={`library-tabs__button ${activeCategory === category.key ? "is-active" : ""}`}
                key={category.key}
                onClick={() => setActiveCategory(category.key)}
                type="button"
              >
                <span>{category.label}</span>
                <small>{model.counts[category.key] ?? 0}</small>
              </button>
            ))}
          </nav>

          {model.showFeatured ? (
            <section className="library-featured" aria-label="Featured guides">
              <SectionHeader description="Hand-picked starting points." eyebrow="Featured" title="Start Here" />
              <div className="library-grid library-grid--featured">
                {model.featured.map((guide) => (
                  <LibraryGuideCard featured guide={guide} key={guide.id} onSelect={openGuide} />
                ))}
              </div>
            </section>
          ) : null}

          <section aria-label="All guides">
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
