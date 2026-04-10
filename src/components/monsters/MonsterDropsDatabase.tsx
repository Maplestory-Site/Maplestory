import { useEffect, useMemo, useState } from "react";
import type { MonsterBossFilter, MonsterDifficultyLabel, MonsterEntry, MonsterHpRange, MonsterLevelRange } from "../../data/monsters";
import {
  buildMonsterDropsDatabase,
  formatMonsterHp,
  getMonsterScoreProfile,
  getMonsterSearchSuggestions,
  type MonsterDropDatabaseEntry
} from "../../lib/monsters";

type ResultView = "Monsters" | "Drops" | "Locations";
type MonsterDropSort = "Best Farming" | "Highest HP" | "Lowest HP" | "Most Drops" | "Rarest Drops" | "Alphabetical";

type MonsterDropsDatabaseProps = {
  items: MonsterEntry[];
  regions: string[];
  weaknesses: string[];
  comparedIds: string[];
  searchQuerySeed?: string;
  viewSeed?: ResultView;
  onOpenMonster: (item: MonsterEntry) => void;
  onToggleCompare: (item: MonsterEntry) => void;
};

type DropDetailsPanelProps = {
  item: MonsterDropDatabaseEntry | null;
  comparedIds: string[];
  onClose: () => void;
  onOpenMonster: (item: MonsterEntry) => void;
  onToggleCompare: (item: MonsterEntry) => void;
};

const levelOptions: MonsterLevelRange[] = ["All", "1-30", "31-70", "71-120", "121-180", "181+"];
const hpOptions: MonsterHpRange[] = ["All", "0-10K", "10K-1M", "1M-100M", "100M+"];
const difficultyOptions: Array<"All" | MonsterDifficultyLabel> = ["All", "Low", "Moderate", "High", "Extreme"];
const bossOptions: MonsterBossFilter[] = ["All", "Bosses", "Non-Bosses"];
const eliteOptions = ["All", "Elite only", "Non-elite"] as const;
const rarityOptions = ["All", "Common", "Rare", "Epic"] as const;
const itemCategoryOptions = ["All", "Material", "Equipment", "Consumable", "Quest", "Currency"] as const;
const farmingOptions = ["All", "Low", "Solid", "Strong", "Top"] as const;
const sortOptions: MonsterDropSort[] = ["Best Farming", "Highest HP", "Lowest HP", "Most Drops", "Rarest Drops", "Alphabetical"];
const viewOptions: ResultView[] = ["Monsters", "Drops", "Locations"];

function hpRangeMatches(hp: number, range: MonsterHpRange) {
  switch (range) {
    case "0-10K":
      return hp <= 10_000;
    case "10K-1M":
      return hp > 10_000 && hp <= 1_000_000;
    case "1M-100M":
      return hp > 1_000_000 && hp <= 100_000_000;
    case "100M+":
      return hp > 100_000_000;
    default:
      return true;
  }
}

function levelRangeMatches(level: number, range: MonsterLevelRange) {
  switch (range) {
    case "1-30":
      return level <= 30;
    case "31-70":
      return level >= 31 && level <= 70;
    case "71-120":
      return level >= 71 && level <= 120;
    case "121-180":
      return level >= 121 && level <= 180;
    case "181+":
      return level >= 181;
    default:
      return true;
  }
}

function getMonsterQueryScore(item: MonsterEntry, query: string) {
  if (!query) return 0;
  const normalized = query.toLowerCase();
  let score = 0;
  if (item.name.toLowerCase() === normalized) score += 140;
  if (item.name.toLowerCase().includes(normalized)) score += 90;
  if (item.drops.some((drop) => drop.name.toLowerCase().includes(normalized))) score += 72;
  if (item.locations.some((location) => `${location.region} ${location.map}`.toLowerCase().includes(normalized))) score += 58;
  if (item.farmingTags.some((tag) => tag.toLowerCase().includes(normalized))) score += 42;
  if (normalized.includes("boss") && item.isBoss) score += 46;
  if (normalized.includes("rare") && item.drops.some((drop) => drop.rarity !== "Common")) score += 38;
  return score;
}

function getLocationQueryScore(locationLabel: string, query: string) {
  if (!query) return 0;
  const normalized = query.toLowerCase();
  const lower = locationLabel.toLowerCase();
  if (lower === normalized) return 120;
  if (lower.includes(normalized)) return 70;
  return 0;
}

function getDropBestSource(drop: MonsterDropDatabaseEntry) {
  return [...drop.sourceMonsters]
    .sort((a, b) => b.farmingScore - a.farmingScore || a.difficulty - b.difficulty)
    [0];
}

function getMonsterPrimaryLocation(item: MonsterEntry) {
  const location = item.locations[0];
  return location ? `${location.region} - ${location.map}` : "Unknown route";
}

function DropDetailsPanel({ item, comparedIds, onClose, onOpenMonster, onToggleCompare }: DropDetailsPanelProps) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!item) return null;

  return (
    <div className="monster-drop-details" onClick={onClose} role="presentation">
      <div className="monster-drop-details__panel" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
        <button className="monster-drop-details__close" type="button" onClick={onClose}>
          Close
        </button>

        <div className="monster-drop-details__hero">
          <div>
            <span className="monster-drop-details__eyebrow">Drop details</span>
            <h3>{item.name}</h3>
            <p>Track the best monsters, routes, and farming value for this drop.</p>
          </div>
          <div className="monster-drop-details__badges">
            <span>{item.rarity}</span>
            <span>{item.itemType}</span>
            <span>Value {item.estimatedValue}</span>
          </div>
        </div>

        <div className="monster-drop-details__sources">
          {item.sourceMonsters.map((monster) => {
            const profile = getMonsterScoreProfile(monster);
            return (
              <article key={monster.id} className="monster-drop-details__source">
                <div className="monster-drop-details__source-head">
                  <div>
                    <strong>{monster.name}</strong>
                    <span>{monster.locations[0] ? `${monster.locations[0].region} - ${monster.locations[0].map}` : "Unknown route"}</span>
                  </div>
                  <div className="monster-drop-details__source-meta">
                    <span>Lv. {monster.level}</span>
                    <span>HP {formatMonsterHp(monster.hp)}</span>
                    <span>Farm {profile.farmingScore.value}</span>
                  </div>
                </div>

                <div className="monster-drop-details__source-reasons">
                  <span>{profile.dropValueScore.reasons[0]}</span>
                  <span>{monster.farmingReason}</span>
                </div>

                <div className="monster-drop-details__source-actions">
                  <button type="button" onClick={() => onOpenMonster(monster)}>
                    View monster
                  </button>
                  <button
                    className={comparedIds.includes(monster.id) ? "is-active" : ""}
                    type="button"
                    onClick={() => onToggleCompare(monster)}
                  >
                    {comparedIds.includes(monster.id) ? "Added to compare" : "Compare source"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function MonsterDropsDatabase({
  items,
  regions,
  weaknesses,
  comparedIds,
  searchQuerySeed,
  viewSeed,
  onOpenMonster,
  onToggleCompare
}: MonsterDropsDatabaseProps) {
  const [query, setQuery] = useState(searchQuerySeed ?? "");
  const [view, setView] = useState<ResultView>(viewSeed ?? "Monsters");
  const [level, setLevel] = useState<MonsterLevelRange>("All");
  const [hp, setHp] = useState<MonsterHpRange>("All");
  const [difficulty, setDifficulty] = useState<"All" | MonsterDifficultyLabel>("All");
  const [boss, setBoss] = useState<MonsterBossFilter>("All");
  const [elite, setElite] = useState<(typeof eliteOptions)[number]>("All");
  const [region, setRegion] = useState("All");
  const [weakness, setWeakness] = useState("All");
  const [dropRarity, setDropRarity] = useState<(typeof rarityOptions)[number]>("All");
  const [itemCategory, setItemCategory] = useState<(typeof itemCategoryOptions)[number]>("All");
  const [farming, setFarming] = useState<(typeof farmingOptions)[number]>("All");
  const [sort, setSort] = useState<MonsterDropSort>("Best Farming");
  const [selectedDrop, setSelectedDrop] = useState<MonsterDropDatabaseEntry | null>(null);

  useEffect(() => {
    if (searchQuerySeed !== undefined) {
      setQuery(searchQuerySeed);
    }
  }, [searchQuerySeed]);

  useEffect(() => {
    if (viewSeed) {
      setView(viewSeed);
    }
  }, [viewSeed]);

  const dropDatabase = useMemo(() => buildMonsterDropsDatabase(items), [items]);
  const suggestions = useMemo(() => getMonsterSearchSuggestions(items, query), [items, query]);

  const monsterResults = useMemo(() => {
    const filtered = items.filter((item) => {
      const matchesQuery = !query || getMonsterQueryScore(item, query) > 0;
      const matchesLevel = levelRangeMatches(item.level, level);
      const matchesHp = hpRangeMatches(item.hp, hp);
      const matchesDifficulty = difficulty === "All" || item.difficultyLabel === difficulty;
      const matchesBoss = boss === "All" || (boss === "Bosses" ? item.isBoss : !item.isBoss);
      const matchesElite = elite === "All" || (elite === "Elite only" ? item.isElite : !item.isElite);
      const matchesRegion = region === "All" || item.locations.some((location) => location.region === region || location.map === region);
      const matchesWeakness = weakness === "All" || item.weaknesses.includes(weakness);
      const matchesRarity = dropRarity === "All" || item.drops.some((drop) => drop.rarity === dropRarity);
      const matchesCategory = itemCategory === "All" || item.drops.some((drop) => drop.kind === itemCategory);
      const matchesFarming = farming === "All" || item.farmingTier === farming;
      return (
        matchesQuery &&
        matchesLevel &&
        matchesHp &&
        matchesDifficulty &&
        matchesBoss &&
        matchesElite &&
        matchesRegion &&
        matchesWeakness &&
        matchesRarity &&
        matchesCategory &&
        matchesFarming
      );
    });

    return filtered.sort((a, b) => {
      const queryDelta = getMonsterQueryScore(b, query) - getMonsterQueryScore(a, query);
      if (queryDelta !== 0) return queryDelta;
      switch (sort) {
        case "Highest HP":
          return b.hp - a.hp;
        case "Lowest HP":
          return a.hp - b.hp;
        case "Most Drops":
          return b.drops.length - a.drops.length;
        case "Rarest Drops":
          return (
            b.drops.filter((drop) => drop.rarity !== "Common").length - a.drops.filter((drop) => drop.rarity !== "Common").length
          );
        case "Alphabetical":
          return a.name.localeCompare(b.name);
        default:
          return b.farmingScore - a.farmingScore;
      }
    });
  }, [items, query, level, hp, difficulty, boss, elite, region, weakness, dropRarity, itemCategory, farming, sort]);

  const dropResults = useMemo(() => {
    return dropDatabase
      .filter((drop) => {
        const matchesQuery = !query || drop.name.toLowerCase().includes(query.toLowerCase()) || drop.sourceMonsters.some((monster) => getMonsterQueryScore(monster, query) > 0);
        const matchesRarity = dropRarity === "All" || drop.rarity === dropRarity;
        const matchesCategory = itemCategory === "All" || drop.itemType === itemCategory;
        const matchesBoss = boss === "All" || drop.sourceMonsters.some((monster) => (boss === "Bosses" ? monster.isBoss : !monster.isBoss));
        const matchesRegion = region === "All" || drop.sourceMonsters.some((monster) => monster.locations.some((location) => location.region === region || location.map === region));
        return matchesQuery && matchesRarity && matchesCategory && matchesBoss && matchesRegion;
      })
      .sort((a, b) => {
        const exactA = a.name.toLowerCase() === query.toLowerCase() ? 1 : 0;
        const exactB = b.name.toLowerCase() === query.toLowerCase() ? 1 : 0;
        if (exactA !== exactB) return exactB - exactA;
        if (sort === "Rarest Drops") {
          const rarityWeight = { Common: 1, Rare: 2, Epic: 3 } as const;
          return rarityWeight[b.rarity] - rarityWeight[a.rarity];
        }
        if (sort === "Alphabetical") return a.name.localeCompare(b.name);
        return b.estimatedValue - a.estimatedValue;
      });
  }, [dropDatabase, query, dropRarity, itemCategory, boss, region, sort]);

  const locationResults = useMemo(() => {
    const map = new Map<string, { id: string; label: string; region: string; map: string; monsters: MonsterEntry[] }>();

    for (const item of monsterResults) {
      for (const location of item.locations) {
        const label = `${location.region} - ${location.map}`;
        const existing = map.get(label);
        if (existing) {
          existing.monsters.push(item);
        } else {
          map.set(label, { id: label, label, region: location.region, map: location.map, monsters: [item] });
        }
      }
    }

    return Array.from(map.values())
      .filter((location) => !query || getLocationQueryScore(location.label, query) > 0)
      .sort((a, b) => b.monsters.length - a.monsters.length || a.label.localeCompare(b.label));
  }, [monsterResults, query]);

  const viewCounts = useMemo(
    () => ({
      Monsters: monsterResults.length,
      Drops: dropResults.length,
      Locations: locationResults.length
    }),
    [monsterResults.length, dropResults.length, locationResults.length]
  );

  const quickSearches = useMemo(() => {
    const bestFarmers = [...items].sort((a, b) => b.farmingScore - a.farmingScore).slice(0, 2).map((item) => item.name);
    const premiumDrops = [...dropDatabase]
      .sort((a, b) => b.estimatedValue - a.estimatedValue)
      .slice(0, 3)
      .map((drop) => drop.name);
    const hotRoutes = Array.from(new Set(items.flatMap((item) => item.locations.map((location) => location.map)))).slice(0, 2);

    return Array.from(new Set([...bestFarmers, ...premiumDrops, ...hotRoutes])).slice(0, 7);
  }, [items, dropDatabase]);

  const topMonsterMatch = monsterResults[0] ?? null;
  const topDropMatch = dropResults[0] ?? null;
  const topLocationMatch = locationResults[0] ?? null;

  const searchHighlights = useMemo(() => {
    const highlights: Array<{
      id: string;
      eyebrow: string;
      title: string;
      body: string;
      action: string;
      onClick: () => void;
    }> = [];

    if (topDropMatch) {
      const bestSource = getDropBestSource(topDropMatch);
      highlights.push({
        id: `drop-${topDropMatch.id}`,
        eyebrow: "Best source for this drop",
        title: topDropMatch.name,
        body: bestSource
          ? `${bestSource.name} in ${bestSource.locations[0]?.map ?? "Unknown route"} is the strongest farming source right now.`
          : "No farming source available yet.",
        action: "Open drop view",
        onClick: () => {
          setView("Drops");
          setSelectedDrop(topDropMatch);
        }
      });
    }

    if (topMonsterMatch) {
      const profile = getMonsterScoreProfile(topMonsterMatch);
      highlights.push({
        id: `monster-${topMonsterMatch.id}`,
        eyebrow: "Best farming target",
        title: topMonsterMatch.name,
        body: `${getMonsterPrimaryLocation(topMonsterMatch)} • Farm ${profile.farmingScore.value} • ${topMonsterMatch.farmingReason}`,
        action: "Open monster",
        onClick: () => onOpenMonster(topMonsterMatch)
      });
    }

    if (topLocationMatch) {
      highlights.push({
        id: `location-${topLocationMatch.id}`,
        eyebrow: "Where it appears",
        title: topLocationMatch.map,
        body: `${topLocationMatch.region} • ${topLocationMatch.monsters.length} matching monsters in this route.`,
        action: "Show location results",
        onClick: () => setView("Locations")
      });
    }

    return highlights.slice(0, query ? 3 : 2);
  }, [onOpenMonster, query, topDropMatch, topLocationMatch, topMonsterMatch]);

  function resetFilters() {
    setQuery("");
    setView("Monsters");
    setLevel("All");
    setHp("All");
    setDifficulty("All");
    setBoss("All");
    setElite("All");
    setRegion("All");
    setWeakness("All");
    setDropRarity("All");
    setItemCategory("All");
    setFarming("All");
    setSort("Best Farming");
  }

  return (
    <section className="monster-database reveal-on-scroll">
      <header className="monster-section-heading">
        <div>
          <span>Monster drops database</span>
          <h2>Search monsters, drops, and routes fast</h2>
        </div>
        <p>Track item sources, map routes, rare drops, and the best monster target for what you need next.</p>
      </header>

      <div className="monster-database__shell">
        <div className="monster-database__search-row">
          <label className="monster-database__search">
            <span>Search encyclopedia</span>
            <input
              type="search"
              placeholder="Search monster, drop, tag, or location"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>

          <button className="monster-database__reset" type="button" onClick={resetFilters}>
            Reset filters
          </button>
        </div>

        {!query ? (
          <div className="monster-database__quick-picks">
            <span>Quick picks</span>
            <div className="monster-database__quick-pick-list">
              {quickSearches.map((item) => (
                <button key={item} type="button" onClick={() => setQuery(item)}>
                  {item}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {query ? (
          <div className="monster-database__suggestions">
            {suggestions.length ? (
              suggestions.map((suggestion) => (
                <button
                  key={suggestion.id}
                  className="monster-database__suggestion"
                  type="button"
                  onClick={() => {
                    setQuery(suggestion.label);
                    if (suggestion.type === "Drop") setView("Drops");
                    if (suggestion.type === "Location") setView("Locations");
                    if (suggestion.type === "Monster") setView("Monsters");
                  }}
                >
                  <span>{suggestion.type}</span>
                  <strong>{suggestion.label}</strong>
                </button>
              ))
            ) : (
              <div className="monster-database__no-suggestions">
                <span>No direct match</span>
                <p>Try searching by map, material, boss, or weakness tag.</p>
              </div>
            )}
          </div>
        ) : null}

        {searchHighlights.length ? (
          <div className="monster-database__highlights">
            {searchHighlights.map((highlight) => (
              <button key={highlight.id} className="monster-database__highlight-card" type="button" onClick={highlight.onClick}>
                <span>{highlight.eyebrow}</span>
                <strong>{highlight.title}</strong>
                <p>{highlight.body}</p>
                <em>{highlight.action}</em>
              </button>
            ))}
          </div>
        ) : null}

        <div className="monster-database__view-tabs">
          {viewOptions.map((option) => (
            <button
              key={option}
              className={`monster-database__view-tab ${view === option ? "is-active" : ""}`}
              type="button"
              onClick={() => setView(option)}
            >
              {option}
              <span>{viewCounts[option]}</span>
            </button>
          ))}
        </div>

        <div className="monster-database__filters">
          <label>
            <span>Level</span>
            <select value={level} onChange={(event) => setLevel(event.target.value as MonsterLevelRange)}>
              {levelOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>HP</span>
            <select value={hp} onChange={(event) => setHp(event.target.value as MonsterHpRange)}>
              {hpOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Difficulty</span>
            <select value={difficulty} onChange={(event) => setDifficulty(event.target.value as "All" | MonsterDifficultyLabel)}>
              {difficultyOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Boss</span>
            <select value={boss} onChange={(event) => setBoss(event.target.value as MonsterBossFilter)}>
              {bossOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Elite</span>
            <select value={elite} onChange={(event) => setElite(event.target.value as (typeof eliteOptions)[number])}>
              {eliteOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Region / map</span>
            <select value={region} onChange={(event) => setRegion(event.target.value)}>
              <option value="All">All</option>
              {regions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Weakness</span>
            <select value={weakness} onChange={(event) => setWeakness(event.target.value)}>
              <option value="All">All</option>
              {weaknesses.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Drop rarity</span>
            <select value={dropRarity} onChange={(event) => setDropRarity(event.target.value as (typeof rarityOptions)[number])}>
              {rarityOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Item category</span>
            <select value={itemCategory} onChange={(event) => setItemCategory(event.target.value as (typeof itemCategoryOptions)[number])}>
              {itemCategoryOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Farming relevance</span>
            <select value={farming} onChange={(event) => setFarming(event.target.value as (typeof farmingOptions)[number])}>
              {farmingOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Sort</span>
            <select value={sort} onChange={(event) => setSort(event.target.value as MonsterDropSort)}>
              {sortOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="monster-database__active-filters">
          {query ? <span>Query: {query}</span> : null}
          {region !== "All" ? <span>Region: {region}</span> : null}
          {dropRarity !== "All" ? <span>Rarity: {dropRarity}</span> : null}
          {itemCategory !== "All" ? <span>Item: {itemCategory}</span> : null}
          {boss !== "All" ? <span>{boss}</span> : null}
        </div>

        {view === "Monsters" ? (
          monsterResults.length ? (
            <div className="monster-database__monster-results">
              {monsterResults.map((item) => {
                return (
                  <article
                    key={item.id}
                    className={`monster-database__monster-tile ${item.isBoss ? "is-boss" : ""}`}
                  >
                    <button
                      aria-label={`Open ${item.name} monster details`}
                      className="monster-database__monster-open"
                      type="button"
                      onClick={() => onOpenMonster(item)}
                    >
                      <div className="monster-database__monster-frame">
                        <div className="monster-database__monster-art">
                          {item.image ? <img alt={item.name} loading="lazy" src={item.image} /> : <span>{item.portrait}</span>}
                        </div>
                      </div>

                      <div className="monster-database__monster-copy">
                        <strong>{item.name}</strong>
                        <span>Lv. {item.level}</span>
                      </div>

                      <div className="monster-database__monster-flags">
                        {item.isBoss ? <span>BOSS</span> : null}
                        {item.isElite ? <span>ELITE</span> : null}
                      </div>
                    </button>

                    <button
                      aria-label={comparedIds.includes(item.id) ? `Remove ${item.name} from compare` : `Add ${item.name} to compare`}
                      className={`monster-database__monster-compare ${comparedIds.includes(item.id) ? "is-active" : ""}`}
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onToggleCompare(item);
                      }}
                    >
                      {comparedIds.includes(item.id) ? "Added" : "Compare"}
                    </button>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="monster-empty-state">
              <span>No monsters matched</span>
              <h3>Try a lighter search mix</h3>
              <p>Search by monster, map, drop, or weakness tag.</p>
            </div>
          )
        ) : null}

        {view === "Drops" ? (
          dropResults.length ? (
            <div className="monster-database__drop-results">
              {dropResults.map((drop) => {
                const bestSource = getDropBestSource(drop);
                return (
                  <article key={drop.id} className="monster-database__drop-card">
                    <div className="monster-database__drop-top">
                      <div>
                        <h3>{drop.name}</h3>
                        <p>{drop.sourceMonsters.length} source monsters</p>
                      </div>
                      <div className="monster-database__drop-badges">
                        <span>{drop.rarity}</span>
                        <span>{drop.itemType}</span>
                      </div>
                    </div>

                    <div className="monster-database__drop-meta">
                      <span>Best source: {bestSource?.name ?? "Unknown"}</span>
                      <span>Value {drop.estimatedValue}</span>
                    </div>

                    {bestSource ? (
                      <div className="monster-database__best-source">
                        <div>
                          <strong>{bestSource.name}</strong>
                          <span>{getMonsterPrimaryLocation(bestSource)}</span>
                        </div>
                        <div className="monster-database__best-source-badges">
                          <span>Farm {getMonsterScoreProfile(bestSource).farmingScore.value}</span>
                          <span>{bestSource.farmingTier}</span>
                        </div>
                      </div>
                    ) : null}

                    <div className="monster-database__source-list">
                      {drop.sourceMonsters.slice(0, 3).map((monster) => (
                        <button key={monster.id} type="button" onClick={() => onOpenMonster(monster)}>
                          {monster.name}
                        </button>
                      ))}
                    </div>

                    <div className="monster-database__drop-actions">
                      <button type="button" onClick={() => setSelectedDrop(drop)}>
                        View drop details
                      </button>
                      {bestSource ? (
                        <button type="button" onClick={() => onOpenMonster(bestSource)}>
                          View best source
                        </button>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="monster-empty-state">
              <span>No drops matched</span>
              <h3>Try a different item or rarity</h3>
              <p>Search materials, equipment, currency, or a monster that might drop it.</p>
            </div>
          )
        ) : null}

        {view === "Locations" ? (
          locationResults.length ? (
            <div className="monster-database__location-results">
              {locationResults.map((location) => (
                <article key={location.id} className="monster-database__location-card">
                  <div>
                    <h3>{location.map}</h3>
                    <p>{location.region}</p>
                  </div>
                  <span className="monster-database__result-badge">{location.monsters.length} monsters</span>
                  <div className="monster-database__route-callout">
                    <strong>Best farming route</strong>
                    <span>{location.monsters[0]?.name ?? "Unknown"} is the top match in this map.</span>
                  </div>
                  <div className="monster-database__source-list">
                    {location.monsters.slice(0, 4).map((monster) => (
                      <button key={monster.id} type="button" onClick={() => onOpenMonster(monster)}>
                        {monster.name}
                      </button>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="monster-empty-state">
              <span>No locations matched</span>
              <h3>Try a region or map name</h3>
              <p>Search by region, map, or the monster you want to farm there.</p>
            </div>
          )
        ) : null}
      </div>

      <DropDetailsPanel
        comparedIds={comparedIds}
        item={selectedDrop}
        onClose={() => setSelectedDrop(null)}
        onOpenMonster={(monster) => {
          setSelectedDrop(null);
          onOpenMonster(monster);
        }}
        onToggleCompare={onToggleCompare}
      />
    </section>
  );
}
