import type { LibraryGuide } from "../../data/libraryGuides";
import { Button } from "../ui/Button";

type Props = {
  guide: LibraryGuide;
  featured?: boolean;
  onSelect?: (guide: LibraryGuide) => void;
};

export function LibraryGuideCard({ guide, featured = false, onSelect }: Props) {
  const image = guide.heroImage ?? guide.image ?? guide.sections.find((section) => section.image)?.image;

  return (
    <article className={`card library-card ${featured ? "library-card--featured" : ""}`}>
      <div className="library-card__media" aria-hidden="true">
        {image ? (
          <img alt="" className="library-card__image" decoding="async" loading="lazy" src={image} />
        ) : (
          <span className="library-card__icon">{guide.icon}</span>
        )}
        <div className="library-card__media-top">
          <span className="library-card__badge">{guide.subcategory}</span>
          <span className={`library-card__badge library-card__badge--${guide.difficulty.toLowerCase()}`}>
            {guide.difficulty}
          </span>
        </div>
        <div className="library-card__media-bottom">
          <span>{guide.region}</span>
        </div>
      </div>

      <div className="library-card__body">
        <div className="library-card__meta">
          <span>{categoryLabel(guide.category)}</span>
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
            <Button onClick={() => onSelect(guide)} variant={featured ? "primary" : "ghost"}>
              Read Guide
            </Button>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function categoryLabel(category: LibraryGuide["category"]): string {
  switch (category) {
    case "Content":
      return "Content";
    case "Classes":
      return "Classes";
    case "Equipment":
      return "Equipment";
    case "Events":
      return "Events";
    case "Resources":
      return "Resources";
    case "Beginner":
      return "Beginner";
    default:
      return category;
  }
}
