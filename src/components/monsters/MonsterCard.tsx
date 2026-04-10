import type { MonsterEntry } from "../../data/monsters";
type MonsterCardProps = {
  item: MonsterEntry;
  compared: boolean;
  onOpen: (item: MonsterEntry) => void;
  onToggleCompare: (item: MonsterEntry) => void;
};

export function MonsterCard({ item, compared, onOpen, onToggleCompare }: MonsterCardProps) {
  return (
    <article className={`monster-mini-tile ${item.isBoss ? "is-boss" : ""}`}>
      <button className="monster-mini-tile__open" type="button" onClick={() => onOpen(item)}>
        <div className="monster-mini-tile__frame">
          <div className="monster-mini-tile__art">
            {item.image ? <img alt={item.name} loading="lazy" src={item.image} /> : <span className="monster-mini-tile__glyph">{item.portrait}</span>}
          </div>
        </div>

        <div className="monster-mini-tile__copy">
          <strong>{item.name}</strong>
          <span>Lv. {item.level}</span>
        </div>

        <div className="monster-mini-tile__flags">
          {item.isBoss ? <span>BOSS</span> : null}
          {item.isElite ? <span>ELITE</span> : null}
        </div>
      </button>

      <div className="monster-mini-tile__actions">
        <button
          className={`monster-mini-tile__compare ${compared ? "is-active" : ""}`}
          type="button"
          onClick={() => onToggleCompare(item)}
        >
          {compared ? "Added" : "Compare"}
        </button>
      </div>
    </article>
  );
}
