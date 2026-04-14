import type { ClassDifficulty, ClassPlaystyle } from "../../data/classesJobs";
import { useI18n } from "../../i18n/I18nProvider";

type FilterBarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  playstyle: "All" | ClassPlaystyle;
  onPlaystyleChange: (value: "All" | ClassPlaystyle) => void;
  difficulty: "All" | ClassDifficulty;
  onDifficultyChange: (value: "All" | ClassDifficulty) => void;
  playstyles: ClassPlaystyle[];
  difficulties: ClassDifficulty[];
  selectedCategory: string;
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
  const { t } = useI18n();
  return (
    <section className="classes-filter-bar reveal-on-scroll">
      <label className="classes-filter-bar__search">
        <span>{t("Search")}</span>
        <input
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={t("Search class name")}
          aria-label={t("Search class by name")}
        />
      </label>

      <div className="classes-filter-bar__group">
        <span>{t("Category")}</span>
        <strong>{t(selectedCategory)}</strong>
      </div>

      <label className="classes-filter-bar__select">
        <span>{t("Playstyle")}</span>
        <select value={playstyle} onChange={(event) => onPlaystyleChange(event.target.value as "All" | ClassPlaystyle)}>
          <option value="All">{t("All")}</option>
          {playstyles.map((option) => (
            <option key={option} value={option}>
              {t(option)}
            </option>
          ))}
        </select>
      </label>

      <label className="classes-filter-bar__select">
        <span>{t("Difficulty")}</span>
        <select value={difficulty} onChange={(event) => onDifficultyChange(event.target.value as "All" | ClassDifficulty)}>
          <option value="All">{t("All")}</option>
          {difficulties.map((option) => (
            <option key={option} value={option}>
              {t(option)}
            </option>
          ))}
        </select>
      </label>
    </section>
  );
}
