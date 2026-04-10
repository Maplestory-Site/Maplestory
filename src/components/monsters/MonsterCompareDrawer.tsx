import type { MonsterEntry } from "../../data/monsters";
import { formatMonsterHp } from "../../lib/monsters";

type MonsterCompareDrawerProps = {
  items: MonsterEntry[];
  onRemove: (id: string) => void;
  onClear: () => void;
  onCompare: () => void;
};

export function MonsterCompareDrawer({ items, onRemove, onClear, onCompare }: MonsterCompareDrawerProps) {
  if (items.length === 0) return null;

  return (
    <aside className="monster-compare">
      <div className="monster-compare__head">
        <div>
          <span>Compare monsters</span>
          <h3>{items.length} selected</h3>
        </div>
        <div className="monster-compare__head-actions">
          <button className="monster-compare__clear" type="button" onClick={onClear}>
            Clear all
          </button>
          <button className="monster-compare__launch" disabled={items.length < 2} type="button" onClick={onCompare}>
            Compare now
          </button>
        </div>
      </div>

      <div className="monster-compare__grid">
        {items.map((item) => (
          <article key={item.id} className="monster-compare__card">
            <div className="monster-compare__preview">
              {item.image ? <img alt={item.name} loading="lazy" src={item.image} /> : <span>{item.portrait}</span>}
            </div>
            <div className="monster-compare__top">
              <strong>{item.name}</strong>
              <button className="monster-compare__remove" type="button" onClick={() => onRemove(item.id)}>
                Remove
              </button>
            </div>
            <div className="monster-compare__stats">
              <span>Lv. {item.level}</span>
              <span>HP {formatMonsterHp(item.hp)}</span>
              <span>STR {item.strength}</span>
              <span>{item.difficultyLabel}</span>
              <span>{item.farmingTier} farm</span>
            </div>
            <p>{item.shortDescription}</p>
          </article>
        ))}
      </div>
    </aside>
  );
}
