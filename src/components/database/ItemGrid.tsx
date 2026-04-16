import type { ItemEntry } from "../../data/items";
import { useI18n } from "../../i18n/I18nProvider";

type ItemGridProps = {
  items: ItemEntry[];
  onOpen: (item: ItemEntry) => void;
};

export function ItemGrid({ items, onOpen }: ItemGridProps) {
  const { t, td } = useI18n();

  if (!items.length) {
    return (
      <section className="item-grid item-grid--empty">
        <div className="database-empty">
          <span>{t("No items found")}</span>
          <p>{t("Try a different name, type, or sort.")}</p>
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
              {td(item.rarity)}
            </span>
            <span className="item-tile__media">
              {item.image ? (
                <img alt={td(item.name)} loading="lazy" src={item.image} />
              ) : (
                <span className="item-tile__fallback">{item.name.slice(0, 2).toUpperCase()}</span>
              )}
            </span>
            <span className="item-tile__name">{td(item.name)}</span>
            <span className="item-tile__meta">
              {item.level ? td(`Lv.${item.level}`) : td(item.type)}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
