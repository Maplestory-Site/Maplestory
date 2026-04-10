import type { MonsterEntry } from "../../data/monsters";
import { MonsterCard } from "./MonsterCard";

type MonsterGridProps = {
  items: MonsterEntry[];
  comparedIds: string[];
  onOpen: (item: MonsterEntry) => void;
  onToggleCompare: (item: MonsterEntry) => void;
};

export function MonsterGrid({ items, comparedIds, onOpen, onToggleCompare }: MonsterGridProps) {
  if (!items.length) {
    return (
      <div className="monster-empty-state reveal-on-scroll">
        <span>No monsters matched</span>
        <h3>Try a lighter filter mix</h3>
        <p>Drop a few filters and the full monster archive will come back into view.</p>
      </div>
    );
  }

  return (
    <div className="monster-grid reveal-on-scroll">
      {items.map((item) => (
        <MonsterCard
          key={item.id}
          compared={comparedIds.includes(item.id)}
          item={item}
          onOpen={onOpen}
          onToggleCompare={onToggleCompare}
        />
      ))}
    </div>
  );
}
