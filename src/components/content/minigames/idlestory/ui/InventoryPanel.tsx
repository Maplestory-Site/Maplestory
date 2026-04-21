import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { formatNumber } from "../gameEngine";
import type { DatabaseItem, GearId, IdleGameState, IdleItemInstance, IdleItemType } from "../gameEngine";
import { GEAR, getGearCost, getGearEffect } from "../progressionSystem";
import { getItemPower } from "../itemSystem";

type Props = {
  state: IdleGameState;
  items: DatabaseItem[];
  onBuyGear: (id: GearId) => void;
  onBestGear: () => void;
  onEquipLoot: (itemId: string) => void;
  onUnequipLoot: (type: IdleItemType) => void;
  onAutoEquipLoot: () => void;
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

function statLine(item: IdleItemInstance): string {
  const stats = item.stats;
  const parts = [
    stats.attack > 0 ? `ATK ${formatNumber(stats.attack)}` : "",
    stats.defense > 0 ? `DEF ${formatNumber(stats.defense)}` : "",
    stats.hp > 0 ? `HP ${formatNumber(stats.hp)}` : "",
    stats.critChance > 0 ? `Crit ${Math.round(stats.critChance * 100)}%` : "",
    stats.attackSpeed > 0 ? `SPD +${Math.round(stats.attackSpeed * 100)}%` : ""
  ].filter(Boolean);
  return parts.slice(0, 3).join(" · ");
}

function comparePower(item: IdleItemInstance, equipped?: IdleItemInstance): number {
  return getItemPower(item) - (equipped ? getItemPower(equipped) : 0);
}

export function InventoryPanel({
  state,
  items,
  onBuyGear,
  onBestGear,
  onEquipLoot,
  onUnequipLoot,
  onAutoEquipLoot
}: Props) {
  const [selected, setSelected] = useState<IdleItemInstance | null>(null);
  const inventory = state.inventory ?? [];
  const equipment = state.equipment ?? {};
  const fallbackItems = items.slice(0, 10);

  return (
    <div className="isw-panel isw-inv isw-premium-panel">
      <div className="isw-panel-hero">
        <div>
          <span className="isw-section-label">Armory</span>
          <h3>Loot Loadout</h3>
          <p>{inventory.length} items · {Object.values(equipment).filter(Boolean).length}/5 equipped</p>
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
              <small>{item ? `PWR ${formatNumber(getItemPower(item))}` : "Tap loot to equip"}</small>
            </motion.button>
          );
        })}
      </section>

      <div className="isw-inv__section-head">
        <span className="isw-section-label">Loot Bag</span>
        <span className="isw-section-sub">{inventory.length ? "Tap item for details" : "No live loot yet"}</span>
      </div>

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
              <span className="isw-loot-card__rarity">{item.rarity}</span>
              <strong>{item.name}</strong>
              <small>{statLine(item)}</small>
              <span className="isw-loot-card__power">PWR {formatNumber(getItemPower(item))}</span>
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
                <small>Lv.{level} · {getGearEffect(id, level)}</small>
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
                  <span className="isw-loot-card__rarity">{selected.rarity}</span>
                  <h3>{selected.name}</h3>
                  <p>{SLOT_META[selected.type].label} · Lv.{selected.levelRequirement} · +{selected.enhanceLevel}</p>
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

              <div className="isw-item-sheet__stats">
                {Object.entries(selected.stats).map(([key, value]) => (
                  <div key={key}>
                    <span>{key}</span>
                    <strong>{typeof value === "number" && value < 1 ? `${Math.round(value * 100)}%` : formatNumber(value as number)}</strong>
                  </div>
                ))}
              </div>

              <div className="isw-item-sheet__actions">
                <motion.button className="isw-primary-btn" whileTap={{ scale: 0.94 }} type="button" onClick={() => onEquipLoot(selected.id)}>Equip</motion.button>
                <motion.button whileTap={{ scale: 0.94 }} type="button" onClick={() => onUnequipLoot(selected.type)}>Unequip</motion.button>
                <button type="button" disabled>Sell</button>
                <button type="button" disabled>Lock</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
