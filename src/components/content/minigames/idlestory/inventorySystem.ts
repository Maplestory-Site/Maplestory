/**
 * IdleStory World inventory and equipment operations.
 * Pure functions only so this can later move to a server-authoritative model.
 */

import type { IdleGameState } from "./gameEngine";
import {
  EMPTY_EQUIPMENT,
  addItemStats,
  enhanceItem,
  getEmptyStats,
  getItemPower,
  type EquippedItems,
  type IdleItemInstance,
  type IdleItemStats,
  type IdleItemType
} from "./itemSystem";

export const INVENTORY_SLOT_LIMIT = 80;

export type InventoryResult = {
  state: IdleGameState;
  message: string;
  success: boolean;
};

export function normalizeEquipment(equipment?: EquippedItems): EquippedItems {
  return { ...EMPTY_EQUIPMENT, ...(equipment ?? {}) };
}

export function addLootToInventory(state: IdleGameState, drops: IdleItemInstance[]): IdleGameState {
  if (!drops.length) return { ...state, lastLootDrops: [] };

  const current = Array.isArray(state.inventory) ? state.inventory : [];
  const space = Math.max(0, INVENTORY_SLOT_LIMIT - current.length);
  const accepted = drops.slice(0, space);

  return {
    ...state,
    inventory: [...accepted, ...current].slice(0, INVENTORY_SLOT_LIMIT),
    lastLootDrops: accepted
  };
}

export function equipItem(state: IdleGameState, itemId: string): InventoryResult {
  const inventory = Array.isArray(state.inventory) ? state.inventory : [];
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

  const inventory = Array.isArray(state.inventory) ? state.inventory : [];
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

export function getSetBonusStats(equipment?: EquippedItems): IdleItemStats {
  const counts = Object.values(normalizeEquipment(equipment)).reduce<Record<string, number>>((acc, item) => {
    if (!item?.setId) return acc;
    acc[item.setId] = (acc[item.setId] ?? 0) + 1;
    return acc;
  }, {});

  return Object.values(counts).reduce<IdleItemStats>((sum, count) => {
    if (count < 2) return sum;
    return addItemStats(sum, {
      attack: count >= 4 ? 18 : 8,
      defense: count >= 3 ? 10 : 4,
      hp: count >= 3 ? 80 : 30,
      critChance: count >= 4 ? 0.04 : 0.015,
      critDamage: count >= 4 ? 0.18 : 0.06,
      attackSpeed: count >= 5 ? 0.08 : 0.02
    });
  }, getEmptyStats());
}

export function calculateTotalEquipmentStats(equipment?: EquippedItems): IdleItemStats {
  return addItemStats(calculateEquipmentStats(equipment), getSetBonusStats(equipment));
}

export function autoEquipBestItems(state: IdleGameState): InventoryResult {
  const inventory = Array.isArray(state.inventory) ? state.inventory : [];
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

export function enhanceInventoryItem(state: IdleGameState, itemId: string): InventoryResult {
  const inventory = Array.isArray(state.inventory) ? state.inventory : [];
  const item = inventory.find((entry) => entry.id === itemId);
  if (!item) return { state, message: "Item not found.", success: false };

  const cost = Math.floor(150 * Math.pow(item.enhanceLevel + 1, 1.7) * (1 + item.zoneIndex * 0.25));
  if (state.mesos < cost) return { state, message: "Need more mesos to enhance.", success: false };

  return {
    state: {
      ...state,
      mesos: state.mesos - cost,
      inventory: inventory.map((entry) => entry.id === itemId ? enhanceItem(entry) : entry)
    },
    message: `${item.name} enhanced.`,
    success: true
  };
}
