import { memo, useEffect, useMemo, useState } from "react";
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

function rarityLabel(rarity: string): string {
  return rarity ? `${rarity[0].toUpperCase()}${rarity.slice(1)}` : "Common";
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

function getItemDeltaRows(item: IdleItemInstance, equipped?: IdleItemInstance) {
  const base = equipped?.stats;
  return [
    { label: "Attack", value: item.stats.attack - (base?.attack ?? 0), percent: false },
    { label: "Defense", value: item.stats.defense - (base?.defense ?? 0), percent: false },
    { label: "HP", value: item.stats.hp - (base?.hp ?? 0), percent: false },
    { label: "Crit", value: item.stats.critChance - (base?.critChance ?? 0), percent: true },
    { label: "Crit DMG", value: item.stats.critDamage - (base?.critDamage ?? 0), percent: true },
    { label: "Speed", value: item.stats.attackSpeed - (base?.attackSpeed ?? 0), percent: true }
  ];
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
  const inventory = state.inventory ?? [];
  const equipment = state.equipment ?? {};
  const fallbackItems = items.slice(0, 10);
  const materials = state.materials ?? { shard: 0, essence: 0, crystal: 0, bossCore: 0 };
  const craftRecipes = useMemo(() => getCraftRecipeDefinitions(), []);
  const activeSetBonuses = useMemo(
    () => getActiveSetBonuses(state.equipment, { buildFocus: state.buildFocus, talentNodes: state.talentNodes }),
    [state.equipment, state.buildFocus, state.talentNodes]
  );

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
              className={`isw-equip-slot ${item ? `isw-rarity-card--${item.rarity}` : "is-empty"}`}
              onClick={() => item ? setSelected(item) : undefined}
              whileTap={{ scale: 0.94 }}
              type="button"
            >
              <span className="isw-equip-slot__icon">{item ? item.name.slice(0, 2) : meta.icon}</span>
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
            <span key={item.id} className={`isw-rarity--${item.rarity}`}>
              + {rarityLabel(item.rarity)} {item.name}
            </span>
          ))}
        </div>
      ) : null}

      <div className="isw-inv__loot-grid">
        {inventory.map((item, index) => {
          const equipped = Object.values(equipment).some((entry) => entry?.id === item.id);
          return (
            <motion.button
              key={item.id}
              className={`isw-loot-card isw-rarity-card--${item.rarity}${equipped ? " is-equipped" : ""}`}
              onClick={() => setSelected(item)}
              whileTap={{ scale: 0.92 }}
              initial={{ opacity: 0, y: 10, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: Math.min(index * 0.015, 0.18) }}
              type="button"
            >
              <span className="isw-loot-card__icon">{item.name.slice(0, 2)}</span>
              <span className="isw-loot-card__rarity">{rarityLabel(item.rarity)}</span>
              <strong>{item.name}</strong>
              <small>{statLine(item)}</small>
              <small className="isw-loot-card__affix">{affixPreview(item, 1)}</small>
              {item.setId ? (
                <small className="isw-loot-card__affix">
                  Set: {getItemSetDefinition(item.setId)?.name ?? item.setId}
                </small>
              ) : null}
              <span className="isw-loot-card__power">PWR {formatNumber(getItemPower(item))}</span>
              <span className="isw-loot-card__power">Value {formatNumber(item.value)}g</span>
              {item.isUnique && <span className="isw-loot-card__tag is-unique">Unique</span>}
              {!item.isUnique && item.isRareDrop && <span className="isw-loot-card__tag is-rare-drop">Rare Drop</span>}
              {equipped && <span className="isw-loot-card__tag">Equipped</span>}
            </motion.button>
          );
        })}

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
              initial={{ y: 80, opacity: 0, scale: 0.94 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 60, opacity: 0, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 360, damping: 30 }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="isw-item-sheet__top">
                <span className="isw-item-sheet__icon">{selected.name.slice(0, 2)}</span>
                <div>
                  <span className="isw-loot-card__rarity">{rarityLabel(selected.rarity)}</span>
                  <h3>{selected.name}</h3>
                  <p>{selected.isUnique ? "Unique drop" : selected.isRareDrop ? "Rare drop proc" : "Standard drop"}{selected.qualityRoll ? ` | Roll ${Math.round(selected.qualityRoll * 100)}%` : ""}</p>
                  <p>{SLOT_META[selected.type].label} | Lv.{selected.levelRequirement} | +{selected.enhanceLevel}</p>
                  <p>{selected.category.toUpperCase()} | Value {formatNumber(selected.value)}g | Rerolls {selected.rerollCount}</p>
                  {selectedSet ? (
                    <p>Set: {selectedSet.name} ({selectedSetPieces}/{selectedSet.pieceTypes.length})</p>
                  ) : null}
                </div>
                <button type="button" onClick={() => setSelected(null)}>Close</button>
              </div>

              <div className="isw-item-sheet__compare">
                <div>
                  <span>Power</span>
                  <strong>{formatNumber(getItemPower(selected))}</strong>
                </div>
                <div className={comparePower(selected, equipment[selected.type]) >= 0 ? "is-positive" : "is-negative"}>
                  <span>Compare</span>
                  <strong>{comparePower(selected, equipment[selected.type]) >= 0 ? "+" : ""}{formatNumber(comparePower(selected, equipment[selected.type]))}</strong>
                </div>
              </div>

              <div className="isw-item-sheet__compare">
                {getItemDeltaRows(selected, equipment[selected.type]).map((entry) => (
                  <div key={entry.label} className={entry.value >= 0 ? "is-positive" : "is-negative"}>
                    <span>{entry.label}</span>
                    <strong>{formatStatDiff(entry.value, entry.percent)}</strong>
                  </div>
                ))}
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

              <div className="isw-item-sheet__stats">
                {Object.entries(selected.stats).map(([key, value]) => (
                  <div key={key}>
                    <span>{statDisplayLabel(key)}</span>
                    <strong>{statDisplayValue(key, Number(value))}</strong>
                  </div>
                ))}
              </div>

              <div className="isw-item-sheet__actions">
                <motion.button className="isw-primary-btn" whileTap={{ scale: 0.94 }} type="button" onClick={() => onEquipLoot(selected.id)}>Equip</motion.button>
                <motion.button whileTap={{ scale: 0.94 }} type="button" onClick={() => onUnequipLoot(selected.type)}>Unequip</motion.button>
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
                <button type="button" onClick={() => onSalvageLoot(selected.id)}>
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

