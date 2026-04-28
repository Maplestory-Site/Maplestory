/**
 * IdleStory World inventory and equipment operations.
 * Pure functions only so this can later move to a server-authoritative model.
 */

import type { IdleGameState } from "./gameEngine";
import {
  EMPTY_CRAFTING_MATERIALS,
  EMPTY_EQUIPMENT,
  ITEM_TYPES,
  addItemStats,
  canEnhanceItem,
  canRerollItem,
  craftItemFromRecipe,
  enhanceItem,
  getCraftRecipeDefinition,
  getEmptyStats,
  getEnhanceCost,
  getItemPower,
  getRerollCost,
  getSalvageYield,
  hasMaterialCost,
  mergeCraftingMaterials,
  normalizeCraftingMaterials,
  normalizeItemInstance,
  normalizeItemList,
  rerollItemAffixes,
  subtractMaterialCost,
  type CraftMaterialId,
  type CraftingMaterials,
  type CraftRecipeId,
  type EquippedItems,
  type IdleItemInstance,
  type IdleItemStats,
  type IdleItemType,
  type MaterialCost,
  type RerollMode
} from "./itemSystem";
import {
  getItemSetDefinition,
  getSetProgressionScalar,
  getSetSynergyMultiplier,
  scaleSetBonusStats,
  sumSetStats,
  type ItemSetId,
  type ItemSetTheme
} from "./setSystem";
import type { BuildFocusId } from "./skillBuildSystem";
import type { TalentNodeId } from "./talentSystem";
import { defaultRng, type RngFn } from "./seededRng";

export const INVENTORY_SLOT_LIMIT = 80;
export const OVERFLOW_AUTO_SELL_RATE = 0.16;
const MATERIAL_STORAGE_CAP = 999_999;

export type InventoryResult = {
  state: IdleGameState;
  message: string;
  success: boolean;
};

type ItemLocation =
  | { kind: "inventory"; index: number; item: IdleItemInstance }
  | { kind: "equipment"; slot: IdleItemType; item: IdleItemInstance };

function clampMaterialValue(value: number): number {
  return Math.max(0, Math.min(MATERIAL_STORAGE_CAP, Math.floor(value)));
}

function getStateMaterials(state: IdleGameState): CraftingMaterials {
  return normalizeCraftingMaterials(state.materials ?? EMPTY_CRAFTING_MATERIALS);
}

function setStateMaterials(state: IdleGameState, materials: CraftingMaterials): IdleGameState {
  return {
    ...state,
    materials: {
      shard: clampMaterialValue(materials.shard),
      essence: clampMaterialValue(materials.essence),
      crystal: clampMaterialValue(materials.crystal),
      bossCore: clampMaterialValue(materials.bossCore)
    }
  };
}

function addMaterials(base: CraftingMaterials, gained: Partial<Record<CraftMaterialId, number>>): CraftingMaterials {
  const merged = mergeCraftingMaterials(base, gained);
  return {
    shard: clampMaterialValue(merged.shard),
    essence: clampMaterialValue(merged.essence),
    crystal: clampMaterialValue(merged.crystal),
    bossCore: clampMaterialValue(merged.bossCore)
  };
}

function formatMaterials(materials: MaterialCost): string {
  const parts: string[] = [];
  if ((materials.shard ?? 0) > 0) parts.push(`${Math.floor(materials.shard ?? 0)} shards`);
  if ((materials.essence ?? 0) > 0) parts.push(`${Math.floor(materials.essence ?? 0)} essence`);
  if ((materials.crystal ?? 0) > 0) parts.push(`${Math.floor(materials.crystal ?? 0)} crystals`);
  if ((materials.bossCore ?? 0) > 0) parts.push(`${Math.floor(materials.bossCore ?? 0)} boss cores`);
  return parts.length ? parts.join(", ") : "no materials";
}

function getAutoSellValue(item: IdleItemInstance): number {
  const normalized = normalizeItemInstance(item);
  const minimum = normalized.rarity === "legendary" ? 180 : normalized.rarity === "epic" ? 90 : 20;
  return Math.max(minimum, Math.floor(normalized.value * OVERFLOW_AUTO_SELL_RATE));
}

export function normalizeEquipment(equipment?: EquippedItems): EquippedItems {
  const merged: EquippedItems = { ...EMPTY_EQUIPMENT };
  for (const slot of ITEM_TYPES) {
    const item = equipment?.[slot];
    merged[slot] = item ? normalizeItemInstance(item) : undefined;
  }
  return merged;
}

export function addLootToInventory(state: IdleGameState, drops: IdleItemInstance[]): IdleGameState {
  const normalizedDrops = normalizeItemList(drops);
  if (!normalizedDrops.length) return { ...state, lastLootDrops: [] };

  const current = normalizeItemList(state.inventory);
  const space = Math.max(0, INVENTORY_SLOT_LIMIT - current.length);
  const accepted = normalizedDrops.slice(0, space);
  const overflow = normalizedDrops.slice(space);
  const overflowSell = overflow.reduce((sum, item) => sum + getAutoSellValue(item), 0);

  return {
    ...state,
    mesos: state.mesos + overflowSell,
    inventory: [...accepted, ...current].slice(0, INVENTORY_SLOT_LIMIT),
    lastLootDrops: accepted
  };
}

function findItemLocation(state: IdleGameState, itemId: string): ItemLocation | null {
  const inventory = normalizeItemList(state.inventory);
  const inventoryIndex = inventory.findIndex((entry) => entry.id === itemId);
  if (inventoryIndex >= 0) {
    return { kind: "inventory", index: inventoryIndex, item: inventory[inventoryIndex] };
  }

  const equipment = normalizeEquipment(state.equipment);
  for (const slot of ITEM_TYPES) {
    const equipped = equipment[slot];
    if (equipped?.id === itemId) {
      return { kind: "equipment", slot, item: equipped };
    }
  }

  return null;
}

function updateItemInState(state: IdleGameState, location: ItemLocation, nextItem: IdleItemInstance): IdleGameState {
  if (location.kind === "inventory") {
    const inventory = normalizeItemList(state.inventory);
    inventory[location.index] = nextItem;
    return { ...state, inventory };
  }

  const equipment = normalizeEquipment(state.equipment);
  return { ...state, equipment: { ...equipment, [location.slot]: nextItem } };
}

export function addCraftingMaterialsToState(
  state: IdleGameState,
  materials: Partial<Record<CraftMaterialId, number>>
): IdleGameState {
  return setStateMaterials(state, addMaterials(getStateMaterials(state), materials));
}

export function equipItem(state: IdleGameState, itemId: string): InventoryResult {
  const inventory = normalizeItemList(state.inventory);
  const item = inventory.find((entry) => entry.id === itemId);
  if (!item) return { state, message: "Item not found.", success: false };
  if (state.level < item.levelRequirement) {
    return { state, message: `Requires level ${item.levelRequirement}.`, success: false };
  }

  const equipment = normalizeEquipment(state.equipment);
  const previous = equipment[item.type];
  const nextInventory = inventory.filter((entry) => entry.id !== itemId);

  return {
    state: {
      ...state,
      inventory: previous ? [previous, ...nextInventory] : nextInventory,
      equipment: { ...equipment, [item.type]: item }
    },
    message: `${item.name} equipped.`,
    success: true
  };
}

export function unequipItem(state: IdleGameState, type: IdleItemType): InventoryResult {
  const equipment = normalizeEquipment(state.equipment);
  const item = equipment[type];
  if (!item) return { state, message: "No item equipped.", success: false };

  const inventory = normalizeItemList(state.inventory);
  if (inventory.length >= INVENTORY_SLOT_LIMIT) {
    return { state, message: "Inventory is full.", success: false };
  }

  return {
    state: {
      ...state,
      inventory: [item, ...inventory],
      equipment: { ...equipment, [type]: undefined }
    },
    message: `${item.name} unequipped.`,
    success: true
  };
}

export function calculateEquipmentStats(equipment?: EquippedItems): IdleItemStats {
  const normalized = normalizeEquipment(equipment);
  return Object.values(normalized).reduce<IdleItemStats>((sum, item) => {
    if (!item) return sum;
    return addItemStats(sum, item.stats);
  }, getEmptyStats());
}

export type SetBonusTierState = {
  pieces: number;
  label: string;
  active: boolean;
  missingPieces: number;
  stats: IdleItemStats;
};

export type ActiveSetBonusState = {
  setId: ItemSetId;
  name: string;
  theme: ItemSetTheme;
  equippedPieces: number;
  maxPieces: number;
  synergyMultiplier: number;
  tiers: SetBonusTierState[];
  activeStats: IdleItemStats;
};

type SetAccumulator = {
  count: number;
  totalLevelRequirement: number;
  totalEnhanceLevel: number;
};

type EquipmentSetContext = {
  buildFocus?: BuildFocusId | null;
  talentNodes?: Partial<Record<TalentNodeId, boolean>>;
};

function getSetAccumulators(equipment?: EquippedItems): Partial<Record<ItemSetId, SetAccumulator>> {
  const accumulators: Partial<Record<ItemSetId, SetAccumulator>> = {};
  for (const item of Object.values(normalizeEquipment(equipment))) {
    if (!item) continue;
    const setDefinition = getItemSetDefinition(item.setId);
    if (!setDefinition) continue;
    const setId = setDefinition.id;
    const current = accumulators[setId] ?? {
      count: 0,
      totalLevelRequirement: 0,
      totalEnhanceLevel: 0
    };
    accumulators[setId] = {
      count: current.count + 1,
      totalLevelRequirement: current.totalLevelRequirement + item.levelRequirement,
      totalEnhanceLevel: current.totalEnhanceLevel + item.enhanceLevel
    };
  }
  return accumulators;
}

export function getActiveSetBonuses(
  equipment?: EquippedItems,
  context?: EquipmentSetContext
): ActiveSetBonusState[] {
  const accumulators = getSetAccumulators(equipment);
  const activeBonuses: ActiveSetBonusState[] = [];

  for (const [setIdRaw, accumulator] of Object.entries(accumulators) as Array<[ItemSetId, SetAccumulator | undefined]>) {
    if (!accumulator || accumulator.count <= 0) continue;
    const setDefinition = getItemSetDefinition(setIdRaw);
    if (!setDefinition) continue;

    const avgLevelRequirement = accumulator.totalLevelRequirement / accumulator.count;
    const avgEnhanceLevel = accumulator.totalEnhanceLevel / accumulator.count;
    const progressionScalar = getSetProgressionScalar(avgLevelRequirement, avgEnhanceLevel);
    const synergyMultiplier = getSetSynergyMultiplier(setDefinition.id, context);

    const tiers: SetBonusTierState[] = setDefinition.bonuses
      .map((tier) => ({
        pieces: tier.pieces,
        label: tier.label,
        active: accumulator.count >= tier.pieces,
        missingPieces: Math.max(0, tier.pieces - accumulator.count),
        stats: scaleSetBonusStats(tier.stats, progressionScalar, synergyMultiplier)
      }))
      .sort((left, right) => left.pieces - right.pieces);

    const activeStats = sumSetStats(
      tiers
        .filter((tier) => tier.active)
        .map((tier) => tier.stats)
    );

    activeBonuses.push({
      setId: setDefinition.id,
      name: setDefinition.name,
      theme: setDefinition.theme,
      equippedPieces: accumulator.count,
      maxPieces: setDefinition.pieceTypes.length,
      synergyMultiplier,
      tiers,
      activeStats
    });
  }

  return activeBonuses.sort((left, right) => {
    if (right.equippedPieces !== left.equippedPieces) return right.equippedPieces - left.equippedPieces;
    return left.name.localeCompare(right.name);
  });
}

export function getSetBonusStats(
  equipment?: EquippedItems,
  context?: EquipmentSetContext
): IdleItemStats {
  const activeSetBonuses = getActiveSetBonuses(equipment, context);
  if (!activeSetBonuses.length) return getEmptyStats();
  return sumSetStats(activeSetBonuses.map((entry) => entry.activeStats));
}

export function calculateTotalEquipmentStats(
  equipment?: EquippedItems,
  context?: EquipmentSetContext
): IdleItemStats {
  return addItemStats(calculateEquipmentStats(equipment), getSetBonusStats(equipment, context));
}

export function autoEquipBestItems(state: IdleGameState): InventoryResult {
  const inventory = normalizeItemList(state.inventory);
  let nextState = { ...state, equipment: normalizeEquipment(state.equipment), inventory: [...inventory] };
  let equippedCount = 0;

  for (const item of [...inventory].sort((a, b) => getItemPower(b) - getItemPower(a))) {
    if (nextState.level < item.levelRequirement) continue;
    const current = nextState.equipment[item.type];
    if (current && getItemPower(current) >= getItemPower(item)) continue;

    const result = equipItem(nextState, item.id);
    if (result.success) {
      nextState = result.state;
      equippedCount += 1;
    }
  }

  return {
    state: nextState,
    message: equippedCount ? `Auto-equipped ${equippedCount} upgrades.` : "No better items found.",
    success: equippedCount > 0
  };
}

export function enhanceInventoryItem(state: IdleGameState, itemId: string, rng: RngFn = defaultRng): InventoryResult {
  const location = findItemLocation(state, itemId);
  if (!location) return { state, message: "Item not found.", success: false };
  if (!canEnhanceItem(location.item)) {
    return { state, message: "Item reached max upgrade level.", success: false };
  }

  const cost = getEnhanceCost(location.item);
  const materials = getStateMaterials(state);
  if (state.mesos < cost.mesos || !hasMaterialCost(materials, cost.materials)) {
    return {
      state,
      message: `Need ${cost.mesos.toLocaleString()} mesos and ${formatMaterials(cost.materials)}.`,
      success: false
    };
  }

  const paidState = setStateMaterials(
    { ...state, mesos: state.mesos - cost.mesos },
    subtractMaterialCost(materials, cost.materials)
  );

  if (rng() < cost.failureChance) {
    return {
      state: paidState,
      message: `${location.item.name} enhancement failed. No downgrade.`,
      success: false
    };
  }

  const nextItem = enhanceItem(location.item);
  return {
    state: updateItemInState(paidState, location, nextItem),
    message: `${location.item.name} upgraded to +${nextItem.enhanceLevel}.`,
    success: true
  };
}

export function rerollInventoryItem(
  state: IdleGameState,
  itemId: string,
  mode: RerollMode
): InventoryResult {
  const location = findItemLocation(state, itemId);
  if (!location) return { state, message: "Item not found.", success: false };
  const normalizedItem = normalizeItemInstance(location.item);
  if (!canRerollItem(normalizedItem)) {
    return { state, message: "Reroll cap reached for this item.", success: false };
  }
  if (mode !== "all" && !normalizedItem.affixes[mode === "prefix" ? 0 : 1]) {
    return { state, message: "That item has no affix in the selected slot.", success: false };
  }

  const cost = getRerollCost(normalizedItem, mode);
  const materials = getStateMaterials(state);
  if (state.mesos < cost.mesos || !hasMaterialCost(materials, cost.materials)) {
    return {
      state,
      message: `Need ${cost.mesos.toLocaleString()} mesos and ${formatMaterials(cost.materials)}.`,
      success: false
    };
  }

  const paidState = setStateMaterials(
    { ...state, mesos: state.mesos - cost.mesos },
    subtractMaterialCost(materials, cost.materials)
  );

  const rerolled = rerollItemAffixes(normalizedItem, mode);
  return {
    state: updateItemInState(paidState, location, rerolled),
    message: `${location.item.name} ${mode === "all" ? "rerolled" : `${mode} rerolled`}.`,
    success: true
  };
}

export function salvageInventoryItem(state: IdleGameState, itemId: string): InventoryResult {
  const inventory = normalizeItemList(state.inventory);
  const target = inventory.find((entry) => entry.id === itemId);
  if (!target) return { state, message: "Item not found in inventory.", success: false };

  const salvageYield = getSalvageYield(target);
  const nextInventory = inventory.filter((entry) => entry.id !== itemId);
  const nextState = setStateMaterials(
    { ...state, inventory: nextInventory },
    addMaterials(getStateMaterials(state), salvageYield)
  );

  return {
    state: nextState,
    message: `${target.name} salvaged for ${formatMaterials(salvageYield)}.`,
    success: true
  };
}

export function craftInventoryItem(
  state: IdleGameState,
  recipeId: CraftRecipeId,
  zoneIndex: number,
  levelRequirement: number
): InventoryResult {
  const inventory = normalizeItemList(state.inventory);
  if (inventory.length >= INVENTORY_SLOT_LIMIT) {
    return { state, message: "Inventory is full.", success: false };
  }

  const recipe = getCraftRecipeDefinition(recipeId);
  const materials = getStateMaterials(state);
  if (state.mesos < recipe.mesosCost || !hasMaterialCost(materials, recipe.materials)) {
    return {
      state,
      message: `Need ${recipe.mesosCost.toLocaleString()} mesos and ${formatMaterials(recipe.materials)}.`,
      success: false
    };
  }

  const crafted = craftItemFromRecipe(recipe.id, zoneIndex, levelRequirement);
  const paidState = setStateMaterials(
    {
      ...state,
      mesos: state.mesos - recipe.mesosCost,
      inventory: [crafted, ...inventory].slice(0, INVENTORY_SLOT_LIMIT),
      lastLootDrops: [crafted]
    },
    subtractMaterialCost(materials, recipe.materials)
  );

  return {
    state: paidState,
    message: `${recipe.label} crafted ${crafted.name}.`,
    success: true
  };
}

