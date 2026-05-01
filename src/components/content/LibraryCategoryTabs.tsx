import type { LibraryCategory, LibraryCategoryDefinition, LibraryCategoryKey } from "../../data/libraryGuides";
import type { LibraryCategoryFilter } from "../../lib/libraryGuides";

type CountKey = LibraryCategory | LibraryCategoryKey | "All" | "all";

type Props = {
  categories: LibraryCategoryDefinition[];
  activeCategory: LibraryCategoryFilter;
  counts: Record<CountKey, number>;
  onChange: (category: LibraryCategoryFilter) => void;
};

export function LibraryCategoryTabs({ categories, activeCategory, counts, onChange }: Props) {
  return (
    <nav className="library-tabs" aria-label="Library categories">
      {categories.map((category) => {
        const nextCategory: LibraryCategoryFilter = category.key === "All" ? "all" : category.key;
        const isActive = activeCategory === nextCategory || (category.key === "All" && activeCategory === "All");

        return (
          <button
            aria-pressed={isActive}
            className={`library-tabs__button ${isActive ? "is-active" : ""}`}
            key={category.key}
            onClick={() => onChange(nextCategory)}
            title={category.description}
            type="button"
          >
            <span className="library-tabs__icon">{category.icon}</span>
            <span>{category.label}</span>
            <small>{counts[category.key] ?? counts[nextCategory] ?? 0}</small>
          </button>
        );
      })}
    </nav>
  );
}
