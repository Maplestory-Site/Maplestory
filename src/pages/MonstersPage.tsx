import { useMemo, useRef, useState } from "react";
import { NavLink, useParams } from "react-router-dom";
import { usePageMeta } from "../app/usePageMeta";
import { ItemDetailsPanel } from "../components/database/ItemDetailsPanel";
import { ItemGrid } from "../components/database/ItemGrid";
import { MapDetailsPanel } from "../components/database/MapDetailsPanel";
import { MapGrid } from "../components/database/MapGrid";
import { PetDetailsPanel } from "../components/database/PetDetailsPanel";
import { PetGrid } from "../components/database/PetGrid";
import { QuestDetailsPanel } from "../components/database/QuestDetailsPanel";
import { QuestGrid } from "../components/database/QuestGrid";
import { SimulatorStudio } from "../components/database/SimulatorStudio";
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
import type { ItemEntry } from "../data/items";
import type { MapEntry } from "../data/maps";
import type { FarmingPreset, MonsterEntry } from "../data/monsters";
import type { PetEntry } from "../data/pets";
import type { QuestEntry } from "../data/quests";
import { useItemsFeed } from "../hooks/useItemsFeed";
import { useMapsFeed } from "../hooks/useMapsFeed";
import { useMonstersFeed } from "../hooks/useMonstersFeed";
import { usePetsFeed } from "../hooks/usePetsFeed";
import { useQuestsFeed } from "../hooks/useQuestsFeed";
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

const databaseSections = [
  { id: "monster", label: "Monster" },
  { id: "items", label: "Items" },
  { id: "maps", label: "Maps" },
  { id: "pets", label: "Pets" },
  { id: "quests", label: "Quests" },
  { id: "simulator", label: "Simulator" }
] as const;

type DatabaseSection = (typeof databaseSections)[number]["id"];

function isDatabaseSection(value: string | undefined): value is DatabaseSection {
  return databaseSections.some((section) => section.id === value);
}

export function MonstersPage() {
  const params = useParams();
  const activeSection: DatabaseSection = isDatabaseSection(params.section) ? params.section : "monster";
  const monstersPerPage = 10;
  const itemsPerPage = 90;
  const petsPerPage = 120;

  const feed = useMonstersFeed();
  const itemsFeed = useItemsFeed();
  const [filters, setFilters] = useState<MonsterFilters>(defaultMonsterFilters);
  const [selectedMonster, setSelectedMonster] = useState<MonsterEntry | null>(null);
  const [selectedItem, setSelectedItem] = useState<ItemEntry | null>(null);
  const [selectedMap, setSelectedMap] = useState<MapEntry | null>(null);
  const [selectedPet, setSelectedPet] = useState<PetEntry | null>(null);
  const [selectedQuest, setSelectedQuest] = useState<QuestEntry | null>(null);
  const [comparedIds, setComparedIds] = useState<string[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const [farmingPreset, setFarmingPreset] = useState<FarmingPreset>("All");
  const [databaseQuery, setDatabaseQuery] = useState("");
  const [databaseView, setDatabaseView] = useState<"Monsters" | "Drops" | "Locations">("Monsters");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemQuery, setItemQuery] = useState("");
  const [itemTypeFilter, setItemTypeFilter] = useState<"All" | ItemEntry["type"]>("All");
  const [itemSort, setItemSort] = useState<"Alphabetical" | "Highest level" | "Most drops">("Alphabetical");
  const [itemCurrentPage, setItemCurrentPage] = useState(1);
  const [mapQuery, setMapQuery] = useState("");
  const [mapRegionFilter, setMapRegionFilter] = useState("All");
  const [mapCurrentPage, setMapCurrentPage] = useState(1);
  const [petQuery, setPetQuery] = useState("");
  const [petCategoryFilter, setPetCategoryFilter] = useState("All");
  const [petCurrentPage, setPetCurrentPage] = useState(1);
  const [questQuery, setQuestQuery] = useState("");
  const [questCategoryFilter, setQuestCategoryFilter] = useState("All");
  const [questCurrentPage, setQuestCurrentPage] = useState(1);
  const mapsFeed = useMapsFeed();
  const petsFeed = usePetsFeed();
  const questsFeed = useQuestsFeed();

  // Refs for tracking previous filter keys (during-render pagination reset pattern)
  const prevMonsterKeyRef = useRef("");
  const prevItemKeyRef = useRef("");
  const prevMapKeyRef = useRef("");
  const prevPetKeyRef = useRef("");
  const prevQuestKeyRef = useRef("");

  const regions = useMemo(() => getMonsterRegions(feed.items), [feed.items]);
  const weaknesses = useMemo(() => getMonsterWeaknesses(feed.items), [feed.items]);
  const featuredBosses = useMemo(() => getFeaturedBosses(feed.items), [feed.items]);
  const farmingItems = useMemo(() => {
    const items = getTopFarmingMonsters(feed.items);
    if (farmingPreset === "All") return items;
    return items.filter(
      (item) =>
        item.farmingTags.some((tag) =>
          tag.toLowerCase().includes(farmingPreset.toLowerCase().split(" ")[1] ?? "")
        ) || item.farmingReason.toLowerCase().includes(farmingPreset.toLowerCase().replace("best ", ""))
    );
  }, [feed.items, farmingPreset]);

  const filteredMonsters = useMemo(
    () => sortMonsters(feed.items.filter((item) => matchesMonsterFilters(item, filters)), filters.sort),
    [feed.items, filters]
  );

  const totalPages = Math.max(1, Math.ceil(filteredMonsters.length / monstersPerPage));

  // Reset monster page during render when filters/section change
  const monsterKey = `${activeSection}-${feed.items.length}-${JSON.stringify(filters)}`;
  if (prevMonsterKeyRef.current !== monsterKey) {
    prevMonsterKeyRef.current = monsterKey;
    if (currentPage !== 1) setCurrentPage(1);
  }
  const safePage = Math.min(currentPage, totalPages);

  const paginatedMonsters = useMemo(() => {
    const start = (safePage - 1) * monstersPerPage;
    return filteredMonsters.slice(start, start + monstersPerPage);
  }, [safePage, filteredMonsters]);

  const itemTypes = useMemo(
    () => ["All", ...new Set(itemsFeed.items.map((item) => item.type))] as Array<"All" | ItemEntry["type"]>,
    [itemsFeed.items],
  );

  const filteredItems = useMemo(() => {
    const query = itemQuery.trim().toLowerCase();
    const items = itemsFeed.items.filter((item) => {
      const matchesQuery =
        !query ||
        item.name.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query) ||
        item.sourceMonsters.some((monster) => monster.toLowerCase().includes(query));

      const matchesType = itemTypeFilter === "All" || item.type === itemTypeFilter;
      return matchesQuery && matchesType;
    });

    return [...items].sort((left, right) => {
      if (itemSort === "Highest level") {
        return (right.level || 0) - (left.level || 0) || left.name.localeCompare(right.name);
      }
      if (itemSort === "Most drops") {
        return right.sourceCount - left.sourceCount || left.name.localeCompare(right.name);
      }
      return left.name.localeCompare(right.name);
    });
  }, [itemQuery, itemSort, itemTypeFilter, itemsFeed.items]);

  const itemTotalPages = Math.max(1, Math.ceil(filteredItems.length / itemsPerPage));

  // Reset item page during render when filters change
  const itemKey = `${activeSection}-${itemsFeed.items.length}-${itemQuery}-${itemSort}-${itemTypeFilter}`;
  if (prevItemKeyRef.current !== itemKey) {
    prevItemKeyRef.current = itemKey;
    if (itemCurrentPage !== 1) setItemCurrentPage(1);
  }
  const safeItemPage = Math.min(itemCurrentPage, itemTotalPages);

  const paginatedItems = useMemo(() => {
    const start = (safeItemPage - 1) * itemsPerPage;
    return filteredItems.slice(start, start + itemsPerPage);
  }, [filteredItems, safeItemPage]);

  const comparedMonsters = useMemo(
    () => feed.items.filter((item) => comparedIds.includes(item.id)),
    [comparedIds, feed.items]
  );

  const mapRegions = useMemo(
    () => ["All", ...new Set(mapsFeed.items.map((item) => item.region).filter(Boolean).sort((left, right) => left.localeCompare(right)))],
    [mapsFeed.items]
  );

  const filteredMaps = useMemo(() => {
    const query = mapQuery.trim().toLowerCase();

    return mapsFeed.items.filter((item) => {
      const matchesQuery =
        !query ||
        item.name.toLowerCase().includes(query) ||
        item.streetName.toLowerCase().includes(query) ||
        item.region.toLowerCase().includes(query);
      const matchesRegion = mapRegionFilter === "All" || item.region === mapRegionFilter;
      return matchesQuery && matchesRegion;
    });
  }, [mapQuery, mapRegionFilter, mapsFeed.items]);

  const mapTotalPages = Math.max(1, Math.ceil(filteredMaps.length / itemsPerPage));

  // Reset map page during render when filters change
  const mapKey = `${activeSection}-${mapsFeed.items.length}-${mapQuery}-${mapRegionFilter}`;
  if (prevMapKeyRef.current !== mapKey) {
    prevMapKeyRef.current = mapKey;
    if (mapCurrentPage !== 1) setMapCurrentPage(1);
  }
  const safeMapPage = Math.min(mapCurrentPage, mapTotalPages);

  const paginatedMaps = useMemo(() => {
    const start = (safeMapPage - 1) * itemsPerPage;
    return filteredMaps.slice(start, start + itemsPerPage);
  }, [filteredMaps, safeMapPage]);

  const questCategories = useMemo(
    () => ["All", ...new Set(questsFeed.items.map((item) => item.category).filter(Boolean).sort((left, right) => left.localeCompare(right)))],
    [questsFeed.items]
  );

  const filteredQuests = useMemo(() => {
    const query = questQuery.trim().toLowerCase();

    return questsFeed.items.filter((item) => {
      const matchesQuery =
        !query ||
        item.name.toLowerCase().includes(query) ||
        item.pageTitle.toLowerCase().includes(query) ||
        item.summary.toLowerCase().includes(query) ||
        item.categories.some((category) => category.toLowerCase().includes(query));
      const matchesCategory = questCategoryFilter === "All" || item.category === questCategoryFilter;
      return matchesQuery && matchesCategory;
    });
  }, [questCategoryFilter, questQuery, questsFeed.items]);

  const questTotalPages = Math.max(1, Math.ceil(filteredQuests.length / itemsPerPage));

  // Reset quest page during render when filters change
  const questKey = `${activeSection}-${questsFeed.items.length}-${questQuery}-${questCategoryFilter}`;
  if (prevQuestKeyRef.current !== questKey) {
    prevQuestKeyRef.current = questKey;
    if (questCurrentPage !== 1) setQuestCurrentPage(1);
  }
  const safeQuestPage = Math.min(questCurrentPage, questTotalPages);

  const paginatedQuests = useMemo(() => {
    const start = (safeQuestPage - 1) * itemsPerPage;
    return filteredQuests.slice(start, start + itemsPerPage);
  }, [filteredQuests, safeQuestPage]);

  const monsterLookup = useMemo(() => {
    const lookup = new Map<string, MonsterEntry>();

    for (const item of feed.items) {
      const key = item.name
        .toLowerCase()
        .replace(/[\u2019']/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      if (!lookup.has(key)) {
        lookup.set(key, item);
      }
    }

    return lookup;
  }, [feed.items]);

  const petCategories = useMemo(
    () => ["All", ...new Set(petsFeed.items.map((item) => item.category).filter(Boolean).sort((left, right) => left.localeCompare(right)))],
    [petsFeed.items]
  );

  const filteredPets = useMemo(() => {
    const query = petQuery.trim().toLowerCase();

    return petsFeed.items.filter((item) => {
      const matchesQuery =
        !query ||
        item.name.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query) ||
        item.summary.toLowerCase().includes(query) ||
        item.tags.some((tag) => tag.toLowerCase().includes(query));
      const matchesCategory = petCategoryFilter === "All" || item.category === petCategoryFilter;
      return matchesQuery && matchesCategory;
    });
  }, [petCategoryFilter, petQuery, petsFeed.items]);

  const petTotalPages = Math.max(1, Math.ceil(filteredPets.length / petsPerPage));

  // Reset pet page during render when filters change
  const petKey = `${activeSection}-${petsFeed.items.length}-${petQuery}-${petCategoryFilter}`;
  if (prevPetKeyRef.current !== petKey) {
    prevPetKeyRef.current = petKey;
    if (petCurrentPage !== 1) setPetCurrentPage(1);
  }
  const safePetPage = Math.min(petCurrentPage, petTotalPages);

  const paginatedPets = useMemo(() => {
    const start = (safePetPage - 1) * petsPerPage;
    return filteredPets.slice(start, start + petsPerPage);
  }, [filteredPets, safePetPage]);


  usePageMeta(
    activeSection === "monster"
      ? "DataBase · Monster"
      : `DataBase · ${databaseSections.find((section) => section.id === activeSection)?.label ?? "Monster"}`,
    "Browse MapleStory monsters, items, maps, pets, quests, drops, and farming targets inside the SNAILSLAYER database."
  );

  const heroTotal =
    activeSection === "items"
      ? itemsFeed.items.length || feed.items.length
      : activeSection === "maps"
        ? mapsFeed.items.length
        : activeSection === "pets"
          ? petsFeed.items.length
          : activeSection === "quests"
            ? questsFeed.items.length
            : activeSection === "simulator"
              ? 24
            : feed.items.length;

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
        <MonstersHero
          bosses={feed.items.filter((item) => item.isBoss).length}
          eyebrow="DataBase"
          farmingTargets={getTopFarmingMonsters(feed.items).length}
          subtitle={
            activeSection === "monster"
              ? "Browse monsters, bosses, drops, and maps fast."
              : activeSection === "items"
        ? "Search item drops, rarity, and farming routes."
        : activeSection === "maps"
          ? "Browse maps, regions, and the monsters found there."
          : activeSection === "pets"
            ? "Track pet-related routes, tags, and preview entries."
            : activeSection === "quests"
              ? "Track quest monsters, quest drops, and useful routes."
              : "Preview a Maple-style simulator with layered looks, poses, and backgrounds."
          }
          title={databaseSections.find((section) => section.id === activeSection)?.label ?? "Monster"}
          total={heroTotal}
        />

        <nav aria-label="Database sections" className="database-subnav reveal-on-scroll">
          {databaseSections.map((section) => (
            <NavLink
              className={({ isActive }) => `database-subnav__link ${isActive ? "is-active" : ""}`}
              key={section.id}
              to={`/database/${section.id}`}
            >
              {section.label}
            </NavLink>
          ))}
        </nav>

        {activeSection === "monster" ? (
          <>
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
                    {Math.min(filteredMonsters.length, (safePage - 1) * monstersPerPage + 1)}-
                    {Math.min(filteredMonsters.length, safePage * monstersPerPage)}
                  </strong>
                  <span>
                    of {filteredMonsters.length} monsters · page {safePage} / {totalPages}
                  </span>
                </div>

                <div className="monster-pagination__actions">
                  <button
                    className="monster-pagination__button"
                    disabled={safePage === 1}
                    type="button"
                    onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  >
                    Previous
                  </button>
                  <button
                    className="monster-pagination__button"
                    disabled={safePage === totalPages}
                    type="button"
                    onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                  >
                    Next
                  </button>
                </div>
              </div>
            ) : null}
          </>
        ) : null}

        {activeSection === "items" ? (
          <>
            <section className="item-browser reveal-on-scroll">
              <div className="item-browser__filters">
                <label className="item-browser__field">
                  <span>Search</span>
                  <input
                    placeholder="Search item, category, or monster"
                    type="search"
                    value={itemQuery}
                    onChange={(event) => setItemQuery(event.target.value)}
                  />
                </label>

                <label className="item-browser__field">
                  <span>Type</span>
                  <select value={itemTypeFilter} onChange={(event) => setItemTypeFilter(event.target.value as "All" | ItemEntry["type"])}>
                    {itemTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="item-browser__field">
                  <span>Sort</span>
                  <select value={itemSort} onChange={(event) => setItemSort(event.target.value as "Alphabetical" | "Highest level" | "Most drops")}>
                    <option value="Alphabetical">Alphabetical</option>
                    <option value="Highest level">Highest level</option>
                    <option value="Most drops">Most drops</option>
                  </select>
                </label>
              </div>

              <div className="item-browser__summary">
                <strong>{filteredItems.length}</strong>
                <span>
                  items · {Math.min(filteredItems.length, (safeItemPage - 1) * itemsPerPage + 1)}-
                  {Math.min(filteredItems.length, safeItemPage * itemsPerPage)} visible
                </span>
              </div>
            </section>

            <ItemGrid items={paginatedItems} onOpen={setSelectedItem} />

            {filteredItems.length ? (
              <div className="monster-pagination reveal-on-scroll">
                <div className="monster-pagination__status">
                  <strong>
                    {Math.min(filteredItems.length, (safeItemPage - 1) * itemsPerPage + 1)}-
                    {Math.min(filteredItems.length, safeItemPage * itemsPerPage)}
                  </strong>
                  <span>
                    of {filteredItems.length} items · page {safeItemPage} / {itemTotalPages}
                  </span>
                </div>

                <div className="monster-pagination__actions">
                  <button
                    className="monster-pagination__button"
                    disabled={safeItemPage === 1}
                    type="button"
                    onClick={() => setItemCurrentPage((page) => Math.max(1, page - 1))}
                  >
                    Previous
                  </button>
                  <button
                    className="monster-pagination__button"
                    disabled={safeItemPage === itemTotalPages}
                    type="button"
                    onClick={() => setItemCurrentPage((page) => Math.min(itemTotalPages, page + 1))}
                  >
                    Next
                  </button>
                </div>
              </div>
            ) : null}
          </>
        ) : null}

        {activeSection === "maps" ? (
          <>
            <section className="item-browser reveal-on-scroll">
              <div className="item-browser__filters item-browser__filters--maps">
                <label className="item-browser__field">
                  <span>Search</span>
                  <input
                    placeholder="Search map, street, or region"
                    type="search"
                    value={mapQuery}
                    onChange={(event) => setMapQuery(event.target.value)}
                  />
                </label>

                <label className="item-browser__field">
                  <span>Region</span>
                  <select value={mapRegionFilter} onChange={(event) => setMapRegionFilter(event.target.value)}>
                    {mapRegions.map((region) => (
                      <option key={region} value={region}>
                        {region}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="item-browser__summary">
                <strong>{filteredMaps.length}</strong>
                <span>
                  maps · {Math.min(filteredMaps.length, (safeMapPage - 1) * itemsPerPage + 1)}-
                  {Math.min(filteredMaps.length, safeMapPage * itemsPerPage)} visible
                </span>
              </div>
            </section>

            <MapGrid items={paginatedMaps} onOpen={setSelectedMap} />

            {filteredMaps.length ? (
              <div className="monster-pagination reveal-on-scroll">
                <div className="monster-pagination__status">
                  <strong>
                    {Math.min(filteredMaps.length, (safeMapPage - 1) * itemsPerPage + 1)}-
                    {Math.min(filteredMaps.length, safeMapPage * itemsPerPage)}
                  </strong>
                  <span>
                    of {filteredMaps.length} maps · page {safeMapPage} / {mapTotalPages}
                  </span>
                </div>

                <div className="monster-pagination__actions">
                  <button
                    className="monster-pagination__button"
                    disabled={safeMapPage === 1}
                    type="button"
                    onClick={() => setMapCurrentPage((page) => Math.max(1, page - 1))}
                  >
                    Previous
                  </button>
                  <button
                    className="monster-pagination__button"
                    disabled={safeMapPage === mapTotalPages}
                    type="button"
                    onClick={() => setMapCurrentPage((page) => Math.min(mapTotalPages, page + 1))}
                  >
                    Next
                  </button>
                </div>
              </div>
            ) : null}
          </>
        ) : null}

        {activeSection === "pets" ? (
          <>
            <section className="item-browser reveal-on-scroll">
              <div className="item-browser__filters item-browser__filters--maps">
                <label className="item-browser__field">
                  <span>Search</span>
                  <input
                    placeholder="Search pet name, category, or tag"
                    type="search"
                    value={petQuery}
                    onChange={(event) => setPetQuery(event.target.value)}
                  />
                </label>

                <label className="item-browser__field">
                  <span>Category</span>
                  <select value={petCategoryFilter} onChange={(event) => setPetCategoryFilter(event.target.value)}>
                    {petCategories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="item-browser__summary">
                <strong>{filteredPets.length}</strong>
                <span>
                  pets · {Math.min(filteredPets.length, (safePetPage - 1) * petsPerPage + 1)}-
                  {Math.min(filteredPets.length, safePetPage * petsPerPage)} visible
                </span>
              </div>
            </section>

            <PetGrid items={paginatedPets} onOpen={setSelectedPet} />

            {filteredPets.length ? (
              <div className="monster-pagination reveal-on-scroll">
                <div className="monster-pagination__status">
                  <strong>
                    {Math.min(filteredPets.length, (safePetPage - 1) * petsPerPage + 1)}-
                    {Math.min(filteredPets.length, safePetPage * petsPerPage)}
                  </strong>
                  <span>
                    of {filteredPets.length} pets · page {safePetPage} / {petTotalPages}
                  </span>
                </div>

                <div className="monster-pagination__actions">
                  <button
                    className="monster-pagination__button"
                    disabled={safePetPage === 1}
                    type="button"
                    onClick={() => setPetCurrentPage((page) => Math.max(1, page - 1))}
                  >
                    Previous
                  </button>
                  <button
                    className="monster-pagination__button"
                    disabled={safePetPage === petTotalPages}
                    type="button"
                    onClick={() => setPetCurrentPage((page) => Math.min(petTotalPages, page + 1))}
                  >
                    Next
                  </button>
                </div>
              </div>
            ) : null}
          </>
        ) : null}

        {activeSection === "quests" ? (
          <>
            <section className="item-browser reveal-on-scroll">
              <div className="item-browser__filters item-browser__filters--maps">
                <label className="item-browser__field">
                  <span>Search</span>
                  <input
                    placeholder="Search quest name, route, or tag"
                    type="search"
                    value={questQuery}
                    onChange={(event) => setQuestQuery(event.target.value)}
                  />
                </label>

                <label className="item-browser__field">
                  <span>Category</span>
                  <select value={questCategoryFilter} onChange={(event) => setQuestCategoryFilter(event.target.value)}>
                    {questCategories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="item-browser__summary">
                <strong>{filteredQuests.length}</strong>
                <span>
                  quests · {Math.min(filteredQuests.length, (safeQuestPage - 1) * itemsPerPage + 1)}-
                  {Math.min(filteredQuests.length, safeQuestPage * itemsPerPage)} visible
                </span>
              </div>
            </section>

            <QuestGrid items={paginatedQuests} onOpen={setSelectedQuest} />

            {filteredQuests.length ? (
              <div className="monster-pagination reveal-on-scroll">
                <div className="monster-pagination__status">
                  <strong>
                    {Math.min(filteredQuests.length, (safeQuestPage - 1) * itemsPerPage + 1)}-
                    {Math.min(filteredQuests.length, safeQuestPage * itemsPerPage)}
                  </strong>
                  <span>
                    of {filteredQuests.length} quests · page {safeQuestPage} / {questTotalPages}
                  </span>
                </div>

                <div className="monster-pagination__actions">
                  <button
                    className="monster-pagination__button"
                    disabled={safeQuestPage === 1}
                    type="button"
                    onClick={() => setQuestCurrentPage((page) => Math.max(1, page - 1))}
                  >
                    Previous
                  </button>
                  <button
                    className="monster-pagination__button"
                    disabled={safeQuestPage === questTotalPages}
                    type="button"
                    onClick={() => setQuestCurrentPage((page) => Math.min(questTotalPages, page + 1))}
                  >
                    Next
                  </button>
                </div>
              </div>
            ) : null}
          </>
        ) : null}

        {activeSection === "simulator" ? <SimulatorStudio /> : null}
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

      <ItemDetailsPanel item={selectedItem} onClose={() => setSelectedItem(null)} />
      <PetDetailsPanel item={selectedPet} onClose={() => setSelectedPet(null)} />
      <QuestDetailsPanel item={selectedQuest} onClose={() => setSelectedQuest(null)} />
      <MapDetailsPanel
        item={selectedMap}
        monsterLookup={monsterLookup}
        onClose={() => setSelectedMap(null)}
        onOpenMonster={(item) => {
          setSelectedMap(null);
          setSelectedMonster(item);
        }}
      />

      {activeSection === "monster" && compareOpen ? (
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

      {activeSection === "monster" ? (
        <MonsterCompareDrawer
          items={comparedMonsters}
          onClear={() => {
            setComparedIds([]);
            setCompareOpen(false);
          }}
          onCompare={() => setCompareOpen(true)}
          onRemove={(id) => setComparedIds((current) => current.filter((value) => value !== id))}
        />
      ) : null}
    </div>
  );
}

