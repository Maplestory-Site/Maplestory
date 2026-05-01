import type { LibraryDifficulty, LibraryRegion } from "../../data/libraryGuides";

type Props = {
  query: string;
  difficulty: LibraryDifficulty | null;
  region: LibraryRegion | null;
  tag: string | null;
  tags: string[];
  difficulties: LibraryDifficulty[];
  regions: LibraryRegion[];
  onQueryChange: (value: string) => void;
  onDifficultyChange: (value: LibraryDifficulty | null) => void;
  onRegionChange: (value: LibraryRegion | null) => void;
  onTagChange: (value: string | null) => void;
  onClear: () => void;
};

export function LibrarySearchFilters({
  query,
  difficulty,
  region,
  tag,
  tags,
  difficulties,
  regions,
  onQueryChange,
  onDifficultyChange,
  onRegionChange,
  onTagChange,
  onClear
}: Props) {
  const hasFilters = Boolean(query || difficulty || region || tag);

  return (
    <section className="library-toolbar card" aria-label="Search and filter library guides">
      <label className="library-toolbar__search">
        <span>Search guides</span>
        <input
          aria-label="Search guides"
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search progression, star force, links..."
          type="search"
          value={query}
        />
      </label>

      <div className="library-toolbar__filters" role="group" aria-label="Filter guides">
        <label>
          <span>Difficulty</span>
          <select
            onChange={(event) => onDifficultyChange((event.target.value || null) as LibraryDifficulty | null)}
            value={difficulty ?? ""}
          >
            <option value="">Any</option>
            {difficulties.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Region</span>
          <select
            onChange={(event) => onRegionChange((event.target.value || null) as LibraryRegion | null)}
            value={region ?? ""}
          >
            <option value="">Any</option>
            {regions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Tag</span>
          <select onChange={(event) => onTagChange(event.target.value || null)} value={tag ?? ""}>
            <option value="">Any</option>
            {tags.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        {hasFilters ? (
          <button className="library-toolbar__clear" onClick={onClear} type="button">
            Clear filters
          </button>
        ) : null}
      </div>
    </section>
  );
}
