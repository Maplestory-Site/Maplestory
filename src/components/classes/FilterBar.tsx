import type { ClassCategory, ClassDifficulty, ClassPlaystyle } from "../../data/classesJobs";

type FilterBarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  playstyle: "All" | ClassPlaystyle;
  onPlaystyleChange: (value: "All" | ClassPlaystyle) => void;
  difficulty: "All" | ClassDifficulty;
  onDifficultyChange: (value: "All" | ClassDifficulty) => void;
  playstyles: ClassPlaystyle[];
  difficulties: ClassDifficulty[];
  selectedCategory: "All" | ClassCategory;
};

export function FilterBar({
  search,
  onSearchChange,
  playstyle,
  onPlaystyleChange,
  difficulty,
  onDifficultyChange,
  playstyles,
  difficulties,
  selectedCategory
}: FilterBarProps) {
  return (
    <section className="classes-filter-bar reveal-on-scroll">
      <label className="classes-filter-bar__search">
        <span>Search</span>
        <input
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search class name"
          aria-label="Search class by name"
        />
      </label>

      <div className="classes-filter-bar__group">
        <span>Category</span>
        <strong>{selectedCategory}</strong>
      </div>

      <label className="classes-filter-bar__select">
        <span>Playstyle</span>
        <select value={playstyle} onChange={(event) => onPlaystyleChange(event.target.value as "All" | ClassPlaystyle)}>
          <option value="All">All</option>
          {playstyles.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>

      <label className="classes-filter-bar__select">
        <span>Difficulty</span>
        <select value={difficulty} onChange={(event) => onDifficultyChange(event.target.value as "All" | ClassDifficulty)}>
          <option value="All">All</option>
          {difficulties.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
    </section>
  );
}
