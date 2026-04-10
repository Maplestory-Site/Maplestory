import {
  monsterBossFilters,
  monsterDifficulties,
  monsterFarmingPresets,
  monsterHpRanges,
  monsterLevelRanges,
  monsterSortOptions,
  monsterTypeFilters
} from "../../data/monsters";
import type { MonsterFilters } from "../../lib/monsters";

type MonstersFilterBarProps = {
  filters: MonsterFilters;
  regions: string[];
  weaknesses: string[];
  onChange: <K extends keyof MonsterFilters>(key: K, value: MonsterFilters[K]) => void;
};

export function MonstersFilterBar({ filters, regions, weaknesses, onChange }: MonstersFilterBarProps) {
  return (
    <section className="monsters-filter-bar reveal-on-scroll">
      <label className="monsters-filter-bar__search">
        <span>Search</span>
        <input
          type="search"
          value={filters.search}
          onChange={(event) => onChange("search", event.target.value)}
          placeholder="Search monster or map"
        />
      </label>

      <label className="monsters-filter-bar__select">
        <span>Type</span>
        <select value={filters.type} onChange={(event) => onChange("type", event.target.value as MonsterFilters["type"])}>
          {monsterTypeFilters.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>

      <label className="monsters-filter-bar__select">
        <span>Boss</span>
        <select value={filters.boss} onChange={(event) => onChange("boss", event.target.value as MonsterFilters["boss"])}>
          {monsterBossFilters.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>

      <label className="monsters-filter-bar__select">
        <span>Level</span>
        <select value={filters.level} onChange={(event) => onChange("level", event.target.value as MonsterFilters["level"])}>
          {monsterLevelRanges.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>

      <label className="monsters-filter-bar__select">
        <span>HP</span>
        <select value={filters.hp} onChange={(event) => onChange("hp", event.target.value as MonsterFilters["hp"])}>
          {monsterHpRanges.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>

      <label className="monsters-filter-bar__select">
        <span>Difficulty</span>
        <select
          value={filters.difficulty}
          onChange={(event) => onChange("difficulty", event.target.value as MonsterFilters["difficulty"])}
        >
          {monsterDifficulties.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>

      <label className="monsters-filter-bar__select">
        <span>Region</span>
        <select value={filters.region} onChange={(event) => onChange("region", event.target.value as MonsterFilters["region"])}>
          <option value="All">All</option>
          {regions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>

      <label className="monsters-filter-bar__select">
        <span>Weakness</span>
        <select
          value={filters.weakness}
          onChange={(event) => onChange("weakness", event.target.value as MonsterFilters["weakness"])}
        >
          <option value="All">All</option>
          {weaknesses.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>

      <label className="monsters-filter-bar__select">
        <span>Farming</span>
        <select
          value={filters.farming}
          onChange={(event) => onChange("farming", event.target.value as MonsterFilters["farming"])}
        >
          {monsterFarmingPresets.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>

      <label className="monsters-filter-bar__select">
        <span>Sort</span>
        <select value={filters.sort} onChange={(event) => onChange("sort", event.target.value as MonsterFilters["sort"])}>
          {monsterSortOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
    </section>
  );
}
