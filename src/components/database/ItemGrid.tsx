import type { ItemEntry } from "../../data/items";

type ItemGridProps = {
  items: ItemEntry[];
  onOpen: (item: ItemEntry) => void;
};

export function ItemGrid({ items, onOpen }: ItemGridProps) {
  if (!items.length) {
    return (
      <section className="item-grid item-grid--empty">
        <div className="database-empty">
          <span>No items found</span>
          <p>Try a different name, type, or sort.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="item-grid">
      <div className="item-grid__tiles">
        {items.map((item) => (
          <button
            className="item-tile"
            key={item.id}
            type="button"
            onClick={() => onOpen(item)}
          >
            <span className={`item-tile__rarity item-tile__rarity--${item.rarity.toLowerCase()}`}>
              {item.rarity}
            </span>
            <span className="item-tile__media">
              {item.image ? (
                <img alt={item.name} loading="lazy" src={item.image} />
              ) : (
                <span className="item-tile__fallback">{item.name.slice(0, 2).toUpperCase()}</span>
              )}
            </span>
            <span className="item-tile__name">{item.name}</span>
            <span className="item-tile__meta">
              {item.level ? `Lv.${item.level}` : item.type}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
