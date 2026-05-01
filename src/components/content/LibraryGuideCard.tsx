import type { LibraryGuide } from "../../data/libraryGuides";
import {
  getCategoryAsset,
  getGuideCardImage,
  getGuideIcon,
  getGuideTheme
} from "../../data/libraryAssets";
import { LibraryIcon } from "./LibraryIcon";

type Props = {
  guide: LibraryGuide;
  featured?: boolean;
  onSelect?: (guide: LibraryGuide) => void;
};

export function LibraryGuideCard({ guide, featured = false, onSelect }: Props) {
  // Visual fields are guaranteed by the data-layer enrichment, but helpers
  // stay defensive: they accept partials and always return a value.
  const theme = guide.visualTheme ?? getGuideTheme(guide);
  const imageSrc = guide.cardImage || getGuideCardImage(guide);
  const iconKey = guide.iconKey ?? getGuideIcon(guide);
  const categoryAccent = getCategoryAsset(guide.category).accent;

  return (
    <article
      className={`card library-card ${featured ? "library-card--featured" : ""}`}
      style={{ ["--library-accent" as string]: categoryAccent }}
    >
      <div
        className="library-card__media"
        aria-hidden="true"
        style={{ background: theme.gradient }}
      >
        <img
          alt=""
          className="library-card__image"
          decoding="async"
          loading="lazy"
          onError={(event) => {
            // Image-fallback: hide a broken <img> so the gradient + icon show through.
            event.currentTarget.style.display = "none";
          }}
          src={imageSrc}
        />
        {/* Icon overlay: always rendered, gives each card a per-guide identity. */}
        <span className="library-card__icon-overlay" aria-hidden="true">
          <LibraryIcon name={iconKey} size={28} strokeWidth={2} />
        </span>
        <div className="library-card__media-top">
          {guide.subcategory ? <span className="library-card__badge">{guide.subcategory}</span> : null}
          <span className={`library-card__badge library-card__badge--${guide.difficulty.toLowerCase()}`}>
            {guide.difficulty}
          </span>
        </div>
        <div className="library-card__media-bottom">
          <span>{guide.region}</span>
          <span>{guide.estimatedReadTime}</span>
        </div>
      </div>

      <div className="library-card__body">
        <div className="library-card__meta">
          <span>{guide.category}</span>
          <span>Updated {guide.lastUpdated}</span>
        </div>
        <h3>{guide.title}</h3>
        <p>{guide.description}</p>
        {guide.tags.length ? (
          <ul className="library-card__tags" aria-label="Tags">
            {guide.tags.slice(0, 4).map((tag) => (
              <li key={tag}>#{tag}</li>
            ))}
          </ul>
        ) : null}
        <div className="library-card__actions">
          {onSelect ? (
            <button
              className={`library-card__cta ${featured ? "library-card__cta--primary" : ""}`}
              onClick={() => onSelect(guide)}
              type="button"
            >
              Read guide
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}
