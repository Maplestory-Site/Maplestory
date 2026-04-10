import { useEffect, useMemo, useState } from "react";
import { usePageMeta } from "../app/usePageMeta";
import { BossSpotlightSection } from "../components/monsters/BossSpotlightSection";
import { MonsterCompareModal } from "../components/monsters/MonsterCompareModal";
import { MonsterDropsDatabase } from "../components/monsters/MonsterDropsDatabase";
import { MonsterFarmingOptimizer } from "../components/monsters/MonsterFarmingOptimizer";
import { FarmingTargetsSection } from "../components/monsters/FarmingTargetsSection";
import { MonsterCompareDrawer } from "../components/monsters/MonsterCompareDrawer";
import { MonsterDetailsPanel } from "../components/monsters/MonsterDetailsPanel";
import { MonstersFilterBar } from "../components/monsters/MonstersFilterBar";
import { MonsterGrid } from "../components/monsters/MonsterGrid";
import { MonstersHero } from "../components/monsters/MonstersHero";
import { MonsterRecommendationAssistant } from "../components/monsters/MonsterRecommendationAssistant";
import type { FarmingPreset, MonsterEntry } from "../data/monsters";
import { useMonstersFeed } from "../hooks/useMonstersFeed";
import {
  defaultMonsterFilters,
  getFeaturedBosses,
  getMonsterRegions,
  getMonsterWeaknesses,
  getTopFarmingMonsters,
  matchesMonsterFilters,
  sortMonsters,
  type MonsterFilters
} from "../lib/monsters";

export function MonstersPage() {
  const monstersPerPage = 10;
  usePageMeta(
    "Monsters",
    "Browse MapleStory monsters, bosses, drops, weaknesses, maps, and farming targets inside the SNAILSLAYER monster encyclopedia."
  );

  const feed = useMonstersFeed();
  const [filters, setFilters] = useState<MonsterFilters>(defaultMonsterFilters);
  const [selectedMonster, setSelectedMonster] = useState<MonsterEntry | null>(null);
  const [comparedIds, setComparedIds] = useState<string[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const [farmingPreset, setFarmingPreset] = useState<FarmingPreset>("All");
  const [databaseQuery, setDatabaseQuery] = useState("");
  const [databaseView, setDatabaseView] = useState<"Monsters" | "Drops" | "Locations">("Monsters");
  const [currentPage, setCurrentPage] = useState(1);

  const regions = useMemo(() => getMonsterRegions(feed.items), [feed.items]);
  const weaknesses = useMemo(() => getMonsterWeaknesses(feed.items), [feed.items]);
  const featuredBosses = useMemo(() => getFeaturedBosses(feed.items), [feed.items]);
  const farmingItems = useMemo(() => {
    const items = getTopFarmingMonsters(feed.items);
    if (farmingPreset === "All") return items;
    return items.filter((item) => item.farmingTags.some((tag) => tag.toLowerCase().includes(farmingPreset.toLowerCase().split(" ")[1] ?? "")) || item.farmingReason.toLowerCase().includes(farmingPreset.toLowerCase().replace("best ", "")));
  }, [feed.items, farmingPreset]);

  const filteredMonsters = useMemo(
    () => sortMonsters(feed.items.filter((item) => matchesMonsterFilters(item, filters)), filters.sort),
    [feed.items, filters]
  );

  const totalPages = Math.max(1, Math.ceil(filteredMonsters.length / monstersPerPage));
  const paginatedMonsters = useMemo(() => {
    const start = (currentPage - 1) * monstersPerPage;
    return filteredMonsters.slice(start, start + monstersPerPage);
  }, [currentPage, filteredMonsters]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters, feed.items.length]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const comparedMonsters = useMemo(
    () => feed.items.filter((item) => comparedIds.includes(item.id)),
    [comparedIds, feed.items]
  );

  function handleFilterChange<K extends keyof MonsterFilters>(key: K, value: MonsterFilters[K]) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function toggleCompare(item: MonsterEntry) {
    setComparedIds((current) => {
      const next = current.includes(item.id)
        ? current.filter((id) => id !== item.id)
        : current.length >= 4
          ? [...current.slice(1), item.id]
          : [...current, item.id];

      if (next.length < 2) {
        setCompareOpen(false);
      }

      return next;
    });
  }

  return (
    <div className="monsters-page">
      <div className="page-shell">
        <MonstersHero total={feed.items.length} bosses={feed.items.filter((item) => item.isBoss).length} farmingTargets={getTopFarmingMonsters(feed.items).length} />

        <MonsterRecommendationAssistant
          items={feed.items}
          onOpen={setSelectedMonster}
          regions={regions}
          weaknesses={weaknesses}
        />

        <MonsterFarmingOptimizer
          comparedIds={comparedIds}
          items={feed.items}
          onOpen={setSelectedMonster}
          onToggleCompare={toggleCompare}
          weaknesses={weaknesses}
        />

        <MonsterDropsDatabase
          comparedIds={comparedIds}
          items={feed.items}
          onOpenMonster={setSelectedMonster}
          onToggleCompare={toggleCompare}
          regions={regions}
          searchQuerySeed={databaseQuery}
          viewSeed={databaseView}
          weaknesses={weaknesses}
        />

        <MonstersFilterBar filters={filters} onChange={handleFilterChange} regions={regions} weaknesses={weaknesses} />

        <BossSpotlightSection items={featuredBosses} onOpen={setSelectedMonster} />

        <FarmingTargetsSection activePreset={farmingPreset} items={farmingItems} onOpen={setSelectedMonster} onPresetChange={setFarmingPreset} />

        <section className="monster-section-heading reveal-on-scroll">
          <div>
            <span>Full archive</span>
            <h2>{filteredMonsters.length} monsters ready to browse</h2>
          </div>
          <p>Showing 10 at a time so browsing stays fast and clean.</p>
        </section>

        <MonsterGrid comparedIds={comparedIds} items={paginatedMonsters} onOpen={setSelectedMonster} onToggleCompare={toggleCompare} />

        {filteredMonsters.length ? (
          <div className="monster-pagination reveal-on-scroll">
            <div className="monster-pagination__status">
              <strong>
                {Math.min(filteredMonsters.length, (currentPage - 1) * monstersPerPage + 1)}-
                {Math.min(filteredMonsters.length, currentPage * monstersPerPage)}
              </strong>
              <span>
                of {filteredMonsters.length} monsters · page {currentPage} / {totalPages}
              </span>
            </div>

            <div className="monster-pagination__actions">
              <button
                className="monster-pagination__button"
                disabled={currentPage === 1}
                type="button"
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              >
                Previous
              </button>
              <button
                className="monster-pagination__button"
                disabled={currentPage === totalPages}
                type="button"
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
              >
                Next
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <MonsterDetailsPanel
        compared={selectedMonster ? comparedIds.includes(selectedMonster.id) : false}
        item={selectedMonster}
        onClose={() => setSelectedMonster(null)}
        onSearchDrop={(dropName) => {
          setDatabaseQuery(dropName);
          setDatabaseView("Drops");
          setSelectedMonster(null);
        }}
        onToggleCompare={toggleCompare}
      />

      {compareOpen ? (
        <MonsterCompareModal
          items={comparedMonsters}
          onClear={() => {
            setComparedIds([]);
            setCompareOpen(false);
          }}
          onClose={() => setCompareOpen(false)}
          onRemove={(id) => {
            setComparedIds((current) => {
              const next = current.filter((value) => value !== id);
              if (next.length < 2) {
                setCompareOpen(false);
              }
              return next;
            });
          }}
        />
      ) : null}

      <MonsterCompareDrawer
        items={comparedMonsters}
        onClear={() => {
          setComparedIds([]);
          setCompareOpen(false);
        }}
        onCompare={() => setCompareOpen(true)}
        onRemove={(id) => setComparedIds((current) => current.filter((value) => value !== id))}
      />
    </div>
  );
}
