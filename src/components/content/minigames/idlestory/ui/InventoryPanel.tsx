import { memo, useEffect, useMemo, useState, type CSSProperties } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  formatNumber,
  getActiveSetBonuses,
  getCraftRecipeDefinitions,
  getEnhanceCost,
  getItemSetDefinition,
  getRerollCost,
  getSalvageYield
} from "../gameEngine";
import type {
  CraftMaterialId,
  CraftRecipeId,
  DatabaseItem,
  GearId,
  IdleGameState,
  IdleItemInstance,
  IdleItemType,
  RerollMode
} from "../gameEngine";
import { GEAR, getGearCost, getGearEffect } from "../progressionSystem";
import { MAX_ITEM_REROLLS, getItemPower } from "../itemSystem";
import {
  compareItemStats,
  getItemRarityStyle,
  getItemTypeLabel,
  isItemUpgrade,
  resolveItemVisuals,
  type ItemDatabaseEntry
} from "../itemVisuals";
import "../inventory-icons.css";

type Props = {
  state: IdleGameState;
  items: DatabaseItem[];
  onBuyGear: (id: GearId) => void;
  onBestGear: () => void;
  onEquipLoot: (itemId: string) => void;
  onUnequipLoot: (type: IdleItemType) => void;
  onAutoEquipLoot: () => void;
  onEnhanceLoot: (itemId: string) => void;
  onRerollLoot: (itemId: string, mode: RerollMode) => void;
  onSalvageLoot: (itemId: string) => void;
  onCraftLoot: (recipeId: CraftRecipeId) => void;
};

type InventoryFilter = "all" | "weapon" | "armor" | "accessory" | "sets" | "rare";
type InventorySort = "newest" | "rarity" | "power" | "level" | "type";

const RARITY_RANK: Record<string, number> = {
  common: 1,
  uncommon: 2,
  rare: 3,
  epic: 4,
  legendary: 5
};

const SLOT_META: Record<IdleItemType, { icon: string; label: string }> = {
  weapon: { icon: "SW", label: "Weapon" },
  armor: { icon: "AR", label: "Armor" },
  helmet: { icon: "HM", label: "Helmet" },
  ring: { icon: "RG", label: "Ring" },
  amulet: { icon: "AM", label: "Amulet" }
};

const LEGACY_GEAR: Record<GearId, { icon: string; label: string }> = {
  weapon: { icon: "Blade", label: "Weapon forge" },
  armor: { icon: "Guard", label: "Armor forge" },
  charm: { icon: "Charm", label: "Charm forge" }
};

const FILTERS: Array<{ id: InventoryFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "weapon", label: "Weapons" },
  { id: "armor", label: "Armor" },
  { id: "accessory", label: "Accessories" },
  { id: "sets", label: "Sets" },
  { id: "rare", label: "Rare+" }
];

function rarityLabel(rarity: string): string {
  return rarity ? `${rarity[0].toUpperCase()}${rarity.slice(1)}` : "Common";
}

function itemCssVars(item: IdleItemInstance): CSSProperties {
  const style = getItemRarityStyle(item.rarity);
  return {
    "--item-rarity": style.color,
    "--item-rarity-border": style.border,
    "--item-rarity-glow": style.glow
  } as CSSProperties;
}

function ItemVisualIcon({
  item,
  database,
  className,
  large = false
}: {
  item: IdleItemInstance;
  database: readonly ItemDatabaseEntry[];
  className?: string;
  large?: boolean;
}) {
  const visuals = useMemo(() => resolveItemVisuals(item, database), [item, database]);
  const [src, setSrc] = useState(visuals.icon);

  useEffect(() => {
    setSrc(visuals.icon);
  }, [visuals.icon]);

  return (
    <span className={`isw-item-visual${large ? " is-large" : ""}${className ? ` ${className}` : ""}`}>
      <img
        alt={item.name}
        decoding="async"
        loading="lazy"
        src={src}
        onError={() => setSrc(visuals.fallbackIcon)}
      />
    </span>
  );
}

function statLine(item: IdleItemInstance): string {
  const stats = item.stats;
  const parts = [
    stats.attack > 0 ? `ATK ${formatNumber(stats.attack)}` : "",
    stats.defense > 0 ? `DEF ${formatNumber(stats.defense)}` : "",
    stats.hp > 0 ? `HP ${formatNumber(stats.hp)}` : "",
    stats.critChance > 0 ? `Crit ${Math.round(stats.critChance * 100)}%` : "",
    stats.attackSpeed > 0 ? `SPD +${Math.round(stats.attackSpeed * 100)}%` : ""
  ].filter(Boolean);
  return parts.slice(0, 3).join(" | ");
}

function affixPreview(item: IdleItemInstance, max = 2): string {
  const affixes = item.affixes ?? [];
  if (!affixes.length) return "No affixes";
  return affixes.slice(0, max).map((affix) => affix.display).join(" | ");
}

function comparePower(item: IdleItemInstance, equipped?: IdleItemInstance): number {
  return getItemPower(item) - (equipped ? getItemPower(equipped) : 0);
}

function formatStatDiff(value: number, isPercent = false): string {
  if (value === 0) return "0";
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${isPercent ? `${Math.round(value * 100)}%` : formatNumber(value)}`;
}

function isPercentStat(key: string): boolean {
  return !["attack", "defense", "hp"].includes(key);
}

function canAffordMaterials(
  materials: Record<CraftMaterialId, number>,
  cost: Partial<Record<CraftMaterialId, number>>
) {
  return (
    materials.shard >= (cost.shard ?? 0) &&
    materials.essence >= (cost.essence ?? 0) &&
    materials.crystal >= (cost.crystal ?? 0) &&
    materials.bossCore >= (cost.bossCore ?? 0)
  );
}

function formatMaterialCost(cost: Partial<Record<CraftMaterialId, number>>) {
  const parts: string[] = [];
  if ((cost.shard ?? 0) > 0) parts.push(`${cost.shard} shard`);
  if ((cost.essence ?? 0) > 0) parts.push(`${cost.essence} essence`);
  if ((cost.crystal ?? 0) > 0) parts.push(`${cost.crystal} crystal`);
  if ((cost.bossCore ?? 0) > 0) parts.push(`${cost.bossCore} core`);
  return parts.length ? parts.join(" | ") : "No mats";
}

function statDisplayLabel(key: string): string {
  const map: Record<string, string> = {
    attack: "Attack",
    defense: "Defense",
    hp: "HP",
    critChance: "Crit Chance",
    critDamage: "Crit Damage",
    attackSpeed: "Attack Speed",
    damageMultiplier: "Damage",
    goldMultiplier: "Gold Gain",
    xpMultiplier: "XP Gain"
  };
  return map[key] ?? key;
}

function statDisplayValue(key: string, value: number): string {
  if (key === "attack" || key === "defense" || key === "hp") {
    return formatNumber(value);
  }
  return `${Math.round(value * 100)}%`;
}

const EMPTY_ARRAY: IdleItemInstance[] = [];
const EMPTY_OBJECT: Record<string, IdleItemInstance | undefined> = {};

function InventoryPanelInner({
  state,
  items,
  onBuyGear,
  onBestGear,
  onEquipLoot,
  onUnequipLoot,
  onAutoEquipLoot,
  onEnhanceLoot,
  onRerollLoot,
  onSalvageLoot,
  onCraftLoot
}: Props) {
  const [selected, setSelected] = useState<IdleItemInstance | null>(null);
  const [filter, setFilter] = useState<InventoryFilter>("all");
  const [sort, setSort] = useState<InventorySort>("newest");
  const inventory = state.inventory ?? EMPTY_ARRAY;
  const equipment = state.equipment ?? EMPTY_OBJECT;
  const itemDatabase = items as ItemDatabaseEntry[];
  const fallbackItems = items.slice(0, 10);
  const materials = state.materials ?? { shard: 0, essence: 0, crystal: 0, bossCore: 0 };
  const craftRecipes = useMemo(() => getCraftRecipeDefinitions(), []);
  const activeSetBonuses = useMemo(
    () => getActiveSetBonuses(state.equipment, { buildFocus: state.buildFocus, talentNodes: state.talentNodes }),
    [state.equipment, state.buildFocus, state.talentNodes]
  );
  const latestDropIds = useMemo(
    () => new Set((state.lastLootDrops ?? []).map((item) => item.id)),
    [state.lastLootDrops]
  );
  const visibleInventory = useMemo(() => {
    const filtered = inventory.filter((item) => {
      if (filter === "weapon") return item.type === "weapon";
      if (filter === "armor") return item.category === "armor" || item.type === "helmet";
      if (filter === "accessory") return item.category === "accessory" || item.type === "ring" || item.type === "amulet";
      if (filter === "sets") return Boolean(item.setId);
      if (filter === "rare") return (RARITY_RANK[item.rarity] ?? 0) >= RARITY_RANK.rare || item.isRareDrop || item.isUnique;
      return true;
    });
    return [...filtered].sort((a, b) => {
      if (sort === "rarity") return (RARITY_RANK[b.rarity] ?? 0) - (RARITY_RANK[a.rarity] ?? 0) || getItemPower(b) - getItemPower(a);
      if (sort === "power") return getItemPower(b) - getItemPower(a);
      if (sort === "level") return b.levelRequirement - a.levelRequirement || getItemPower(b) - getItemPower(a);
      if (sort === "type") return getItemTypeLabel(a.type).localeCompare(getItemTypeLabel(b.type)) || a.name.localeCompare(b.name);
      return Number(latestDropIds.has(b.id)) - Number(latestDropIds.has(a.id));
    });
  }, [filter, inventory, latestDropIds, sort]);

  useEffect(() => {
    if (!selected) return;
    const stillExists =
      inventory.some((item) => item.id === selected.id) ||
      Object.values(equipment).some((item) => item?.id === selected.id);
    if (!stillExists) setSelected(null);
  }, [selected, inventory, equipment]);
  const selectedSet = selected ? getItemSetDefinition(selected.setId) : null;
  const selectedSetPieces = selectedSet
    ? Object.values(equipment).filter((entry) => entry?.setId === selectedSet.id).length
    : 0;
  const selectedEquippedItem = selected ? equipment[selected.type] : undefined;
  const selectedIsEquipped = Boolean(selected && selectedEquippedItem?.id === selected.id);
  const selectedCompareTarget = selectedIsEquipped ? undefined : selectedEquippedItem;
  const selectedVisuals = selected ? resolveItemVisuals(selected, itemDatabase) : null;
  const selectedPowerDelta = selected ? comparePower(selected, selectedCompareTarget) : 0;
  const selectedDeltaRows = selected ? compareItemStats(selectedCompareTarget ?? null, selected) : [];
  const selectedRecommended = Boolean(selected && !selectedIsEquipped && isItemUpgrade(selectedCompareTarget ?? null, selected));

  return (
    <div className="isw-panel isw-inv isw-premium-panel">
      <div className="isw-panel-hero">
        <div>
          <span className="isw-section-label">Armory</span>
          <h3>Loot Loadout</h3>
          <p>{inventory.length} items | {Object.values(equipment).filter(Boolean).length}/5 equipped</p>
        </div>
        <motion.button className="isw-section-best isw-glow-btn" onClick={onAutoEquipLoot} whileTap={{ scale: 0.92 }} type="button">
          Auto Equip Best
        </motion.button>
      </div>

      <section className="isw-inv__loadout">
        {(Object.keys(SLOT_META) as IdleItemType[]).map((type) => {
          const item = equipment[type];
          const meta = SLOT_META[type];
          return (
            <motion.button
              key={type}
              className={`isw-equip-slot ${item ? `isw-rarity-card--${item.rarity} has-item` : "is-empty"}`}
              data-rarity={item?.rarity}
              onClick={() => item ? setSelected(item) : undefined}
              style={item ? itemCssVars(item) : undefined}
              whileTap={{ scale: 0.94 }}
              type="button"
            >
              <span className="isw-equip-slot__icon">
                {item ? (
                  <ItemVisualIcon item={item} database={itemDatabase} />
                ) : (
                  meta.icon
                )}
              </span>
              <span className="isw-equip-slot__label">{meta.label}</span>
              <strong>{item ? item.name : "Empty"}</strong>
              <small>{item ? `${item.isUnique ? "Unique" : item.isRareDrop ? "Rare drop" : rarityLabel(item.rarity)} | PWR ${formatNumber(getItemPower(item))}` : "Tap loot to equip"}</small>
            </motion.button>
          );
        })}
      </section>

      <section className="isw-inv__legacy-forge">
        <div className="isw-inv__section-head">
          <span className="isw-section-label">Set Progress</span>
          <span className="isw-section-sub">{activeSetBonuses.length} tracked set{activeSetBonuses.length === 1 ? "" : "s"}</span>
        </div>
        <div className="isw-inv__loot-grid">
          {activeSetBonuses.length ? (
            activeSetBonuses.map((setState) => {
              const activeTiers = setState.tiers.filter((tier) => tier.active);
              const nextTier = setState.tiers.find((tier) => !tier.active);
              return (
                <div key={setState.setId} className="isw-loot-card is-preview">
                  <span className="isw-loot-card__rarity">{setState.name}</span>
                  <strong>
                    {setState.equippedPieces}/{setState.maxPieces} pieces | Synergy x{setState.synergyMultiplier.toFixed(2)}
                  </strong>
                  <small>Theme: {setState.theme.toUpperCase()}</small>
                  {activeTiers.map((tier) => (
                    <small key={`${setState.setId}-${tier.pieces}`}>
                      {tier.pieces}pc: {tier.label}
                    </small>
                  ))}
                  {nextTier ? (
                    <small>
                      Need {nextTier.missingPieces} more piece{nextTier.missingPieces === 1 ? "" : "s"} for {nextTier.pieces}pc.
                    </small>
                  ) : (
                    <small>Full set active.</small>
                  )}
                </div>
              );
            })
          ) : (
            <div className="isw-loot-card is-preview">
              <strong>No active set bonuses</strong>
              <small>Equip 2+ pieces from the same set to activate bonuses.</small>
            </div>
          )}
        </div>
      </section>

      <section className="isw-inv__legacy-forge">
        <div className="isw-inv__section-head">
          <span className="isw-section-label">Crafting Bench</span>
          <span className="isw-section-sub">
            Shards {formatNumber(materials.shard)} | Essence {formatNumber(materials.essence)} | Crystals {formatNumber(materials.crystal)} | Boss Cores {formatNumber(materials.bossCore)}
          </span>
        </div>
        <div className="isw-inv__forge-grid">
          {craftRecipes.map((recipe) => {
            const canAfford =
              state.mesos >= recipe.mesosCost &&
              canAffordMaterials(materials, recipe.materials);
            return (
              <motion.button
                key={recipe.id}
                className={`isw-forge-card${canAfford ? " can-afford" : ""}`}
                onClick={() => onCraftLoot(recipe.id)}
                whileTap={{ scale: 0.94 }}
                type="button"
              >
                <span>{recipe.targetRarity === "epic" ? "Epic" : "Rare"}</span>
                <strong>{recipe.label}</strong>
                <small>{recipe.description}</small>
                <em>{formatNumber(recipe.mesosCost)} gold | {formatMaterialCost(recipe.materials)}</em>
              </motion.button>
            );
          })}
        </div>
      </section>

      <div className="isw-inv__section-head">
        <span className="isw-section-label">Loot Bag</span>
        <span className="isw-section-sub">{inventory.length ? "Tap item for details" : "No live loot yet"}</span>
      </div>

      {state.lastLootDrops?.length ? (
        <div className="isw-inv__recent-drops">
          {state.lastLootDrops.slice(0, 3).map((item) => (
            <span key={item.id} className={`isw-rarity--${item.rarity}`} style={itemCssVars(item)}>
              <ItemVisualIcon item={item} database={itemDatabase} />
              + {rarityLabel(item.rarity)} {item.name}
            </span>
          ))}
        </div>
      ) : null}

      <div className="isw-inv__toolbar" aria-label="Inventory filters">
        <div className="isw-inv__filter-row">
          {FILTERS.map((entry) => (
            <button
              key={entry.id}
              className={`isw-inv__filter${filter === entry.id ? " is-active" : ""}`}
              onClick={() => setFilter(entry.id)}
              type="button"
            >
              {entry.label}
            </button>
          ))}
        </div>
        <label className="isw-inv__sort">
          <span>Sort</span>
          <select value={sort} onChange={(event) => setSort(event.target.value as InventorySort)}>
            <option value="newest">Newest</option>
            <option value="rarity">Rarity</option>
            <option value="power">Power</option>
            <option value="level">Level</option>
            <option value="type">Type</option>
          </select>
        </label>
      </div>

      <div className="isw-inv__loot-grid">
        {visibleInventory.map((item, index) => {
          const equipped = Object.values(equipment).some((entry) => entry?.id === item.id);
          const visuals = resolveItemVisuals(item, itemDatabase);
          const recommended = !equipped && isItemUpgrade(equipment[item.type] ?? null, item);
          const isNew = item.isNew || latestDropIds.has(item.id);
          return (
            <motion.button
              key={item.id}
              className={`isw-loot-card isw-rarity-card--${item.rarity}${equipped ? " is-equipped" : ""}`}
              data-rarity={item.rarity}
              onClick={() => setSelected(item)}
              style={itemCssVars(item)}
              whileTap={{ scale: 0.92 }}
              initial={{ opacity: 0, y: 10, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: Math.min(index * 0.015, 0.18) }}
              type="button"
            >
              <span className="isw-loot-card__icon">
                <ItemVisualIcon item={item} database={itemDatabase} />
              </span>
              <span className="isw-loot-card__rarity">{rarityLabel(item.rarity)}</span>
              <span className="isw-loot-card__type">{visuals.typeLabel}</span>
              <strong>{item.name}</strong>
              <small>{statLine(item)}</small>
              <small className="isw-loot-card__affix">{affixPreview(item, 1)}</small>
              {item.setId ? (
                <small className="isw-loot-card__set">
                  Set: {getItemSetDefinition(item.setId)?.name ?? item.setId}
                </small>
              ) : null}
              <small className="isw-loot-card__source">{visuals.dropSourceLabel}</small>
              <span className="isw-loot-card__power">PWR {formatNumber(getItemPower(item))}</span>
              <span className="isw-loot-card__power">Value {formatNumber(item.sellValue ?? item.value)}g</span>
              {isNew && <span className="isw-loot-card__tag is-new">New</span>}
              {recommended && <span className="isw-loot-card__tag is-recommended">Recommended</span>}
              {item.isUnique && <span className="isw-loot-card__tag is-unique">Unique</span>}
              {!item.isUnique && item.isRareDrop && <span className="isw-loot-card__tag is-rare-drop">Rare Drop</span>}
              {equipped && <span className="isw-loot-card__tag">Equipped</span>}
            </motion.button>
          );
        })}

        {inventory.length > 0 && visibleInventory.length === 0 ? (
          <div className="isw-loot-card is-preview is-empty-state">
            <span className="isw-loot-card__icon">?</span>
            <strong>No items match this filter</strong>
            <small>Try All or another item family.</small>
          </div>
        ) : null}

        {!inventory.length && fallbackItems.map((item) => (
          <div className="isw-loot-card is-preview" key={item.id}>
            {item.image ? <img src={item.image} alt={item.name} /> : <span className="isw-loot-card__icon">{item.name.slice(0, 2)}</span>}
            <span className="isw-loot-card__rarity">{item.rarity}</span>
            <strong>{item.name}</strong>
            <small>Preview drop source</small>
          </div>
        ))}
      </div>

      <section className="isw-inv__legacy-forge">
        <div className="isw-inv__section-head">
          <span className="isw-section-label">Forge Boosts</span>
          <motion.button className="isw-section-best" onClick={onBestGear} whileTap={{ scale: 0.93 }} type="button">Best Forge</motion.button>
        </div>
        <div className="isw-inv__forge-grid">
          {(Object.keys(GEAR) as GearId[]).map((id) => {
            const gear = GEAR[id];
            const level = state.gearLevels[id];
            const cost = getGearCost(id, level);
            const canAfford = state.mesos >= cost;
            return (
              <motion.button
                key={id}
                className={`isw-forge-card${canAfford ? " can-afford" : ""}`}
                onClick={() => onBuyGear(id)}
                whileTap={{ scale: 0.94 }}
                type="button"
              >
                <span>{LEGACY_GEAR[id].icon}</span>
                <strong>{gear.name}</strong>
                <small>Lv.{level} | {getGearEffect(id, level)}</small>
                <em>{formatNumber(cost)} gold</em>
              </motion.button>
            );
          })}
        </div>
      </section>

      <AnimatePresence>
        {selected && (
          <motion.div className="isw-sheet-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelected(null)}>
            <motion.div
              className={`isw-item-sheet isw-rarity-card--${selected.rarity}`}
              data-rarity={selected.rarity}
              style={itemCssVars(selected)}
              initial={{ y: 80, opacity: 0, scale: 0.94 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 60, opacity: 0, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 360, damping: 30 }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="isw-item-sheet__top">
                <div className="isw-item-sheet__visual">
                  <ItemVisualIcon item={selected} database={itemDatabase} large />
                  {selectedRecommended ? <span className="isw-item-sheet__badge">Recommended</span> : null}
                </div>
                <div>
                  <span className="isw-loot-card__rarity">{rarityLabel(selected.rarity)}</span>
                  <h3>{selected.name}</h3>
                  <p>{selectedVisuals?.description}</p>
                  <p>{selectedVisuals?.categoryLabel} | {SLOT_META[selected.type].label} | Lv.{selected.levelRequirement} | +{selected.enhanceLevel}</p>
                  <p>{selected.category.toUpperCase()} | Value {formatNumber(selected.sellValue ?? selected.value)}g | Rerolls {selected.rerollCount}</p>
                  <p>{selected.isUnique ? "Unique drop" : selected.isRareDrop ? "Rare drop proc" : "Standard drop"}{selected.qualityRoll ? ` | Roll ${Math.round(selected.qualityRoll * 100)}%` : ""}</p>
                  {selectedSet ? (
                    <p>Set: {selectedSet.name} ({selectedSetPieces}/{selectedSet.pieceTypes.length})</p>
                  ) : null}
                  <div className="isw-item-sheet__chips">
                    {(selectedVisuals?.tags ?? []).slice(0, 5).map((tag) => (
                      <span key={tag}>{tag}</span>
                    ))}
                  </div>
                </div>
                <button type="button" onClick={() => setSelected(null)}>Close</button>
              </div>

              <div className="isw-item-sheet__compare">
                <div>
                  <span>Power</span>
                  <strong>{formatNumber(getItemPower(selected))}</strong>
                </div>
                <div className={selectedPowerDelta >= 0 ? "is-positive" : "is-negative"}>
                  <span>Compare</span>
                  <strong>{selectedPowerDelta >= 0 ? "+" : ""}{formatNumber(selectedPowerDelta)}</strong>
                </div>
              </div>

              <div className="isw-item-sheet__compare">
                {selectedDeltaRows.length ? selectedDeltaRows.map((entry) => (
                  <div key={entry.key} className={entry.better ? "is-positive" : "is-negative"}>
                    <span>{statDisplayLabel(entry.key)}</span>
                    <strong>{formatStatDiff(entry.delta, isPercentStat(entry.key))}</strong>
                  </div>
                )) : (
                  <div>
                    <span>Compare</span>
                    <strong>No stat change</strong>
                  </div>
                )}
              </div>

              <div className="isw-item-sheet__affixes">
                <span>Affixes</span>
                {(selected.affixes ?? []).length ? (
                  (selected.affixes ?? []).map((affix) => (
                    <strong key={affix.id}>{affix.display}</strong>
                  ))
                ) : (
                  <strong>No affixes rolled.</strong>
                )}
              </div>

              {selectedSet ? (
                <div className="isw-item-sheet__affixes">
                  <span>Set Bonuses</span>
                  {activeSetBonuses
                    .find((entry) => entry.setId === selectedSet.id)
                    ?.tiers.map((tier) => (
                      <strong key={`${selectedSet.id}-${tier.pieces}`}>
                        {tier.pieces}pc {tier.active ? "[ACTIVE]" : `[Need ${tier.missingPieces}]`} - {tier.label}
                      </strong>
                    )) ?? (
                    <strong>Equip at least 2 pieces to activate.</strong>
                  )}
                </div>
              ) : null}

              <div className="isw-item-sheet__source">
                <div>
                  <span>Drop Source</span>
                  <strong>{selectedVisuals?.dropSourceLabel}</strong>
                </div>
                <div>
                  <span>Database Match</span>
                  <strong>{selectedVisuals?.metadata?.name ?? "IdleStory generated item"}</strong>
                </div>
                {selectedVisuals?.databaseUrl ? (
                  <a href={selectedVisuals.databaseUrl} target="_blank" rel="noreferrer">
                    View in Database
                  </a>
                ) : null}
              </div>

              {selected.potentialLines?.length ? (
                <div className="isw-item-sheet__affixes">
                  <span>Potential</span>
                  {selected.potentialLines.map((line, index) => (
                    <strong key={`${selected.id}-potential-${index}`}>{line}</strong>
                  ))}
                </div>
              ) : null}

              {selected.bonusStats ? (
                <div className="isw-item-sheet__affixes">
                  <span>Bonus Stats</span>
                  {Object.entries(selected.bonusStats).map(([key, value]) => (
                    Number(value) ? <strong key={key}>{statDisplayLabel(key)} +{statDisplayValue(key, Number(value))}</strong> : null
                  ))}
                </div>
              ) : null}

              <div className="isw-item-sheet__stats">
                {Object.entries(selected.stats).map(([key, value]) => (
                  <div key={key}>
                    <span>{statDisplayLabel(key)}</span>
                    <strong>{statDisplayValue(key, Number(value))}</strong>
                  </div>
                ))}
              </div>

              <div className="isw-item-sheet__actions">
                <motion.button className="isw-primary-btn" whileTap={{ scale: 0.94 }} type="button" disabled={selectedIsEquipped} onClick={() => onEquipLoot(selected.id)}>Equip</motion.button>
                <motion.button whileTap={{ scale: 0.94 }} type="button" disabled={!selectedIsEquipped} onClick={() => onUnequipLoot(selected.type)}>Unequip</motion.button>
                {(() => {
                  const enhanceCost = getEnhanceCost(selected);
                  const canEnhance =
                    selected.enhanceLevel < 12 &&
                    state.mesos >= enhanceCost.mesos &&
                    canAffordMaterials(materials, enhanceCost.materials);
                  return (
                    <button type="button" disabled={!canEnhance} onClick={() => onEnhanceLoot(selected.id)}>
                      Upgrade (+{selected.enhanceLevel}) | {formatNumber(enhanceCost.mesos)}g
                    </button>
                  );
                })()}
                {(() => {
                  const allCost = getRerollCost(selected, "all");
                  const canReroll =
                    selected.rerollCount < MAX_ITEM_REROLLS &&
                    state.mesos >= allCost.mesos &&
                    canAffordMaterials(materials, allCost.materials);
                  return (
                    <button type="button" disabled={!canReroll} onClick={() => onRerollLoot(selected.id, "all")}>
                      Reroll All | {formatNumber(allCost.mesos)}g
                    </button>
                  );
                })()}
                {(() => {
                  const prefixCost = getRerollCost(selected, "prefix");
                  const canRerollPrefix =
                    Boolean(selected.affixes[0]) &&
                    selected.rerollCount < MAX_ITEM_REROLLS &&
                    state.mesos >= prefixCost.mesos &&
                    canAffordMaterials(materials, prefixCost.materials);
                  return (
                    <button type="button" disabled={!canRerollPrefix} onClick={() => onRerollLoot(selected.id, "prefix")}>
                      Reroll Prefix
                    </button>
                  );
                })()}
                {(() => {
                  const suffixCost = getRerollCost(selected, "suffix");
                  const canRerollSuffix =
                    Boolean(selected.affixes[1]) &&
                    selected.rerollCount < MAX_ITEM_REROLLS &&
                    state.mesos >= suffixCost.mesos &&
                    canAffordMaterials(materials, suffixCost.materials);
                  return (
                    <button type="button" disabled={!canRerollSuffix} onClick={() => onRerollLoot(selected.id, "suffix")}>
                      Reroll Suffix
                    </button>
                  );
                })()}
                <button type="button" disabled={selectedIsEquipped} onClick={() => onSalvageLoot(selected.id)}>
                  Salvage | {formatMaterialCost(getSalvageYield(selected))}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export const InventoryPanel = memo(InventoryPanelInner);
