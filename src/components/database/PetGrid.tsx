import type { PetEntry } from "../../data/pets";
import { useI18n } from "../../i18n/I18nProvider";

type PetGridProps = {
  items: PetEntry[];
  onOpen: (item: PetEntry) => void;
};

export function PetGrid({ items, onOpen }: PetGridProps) {
  const { t, td } = useI18n();

  if (!items.length) {
    return (
      <section className="item-grid item-grid--empty reveal-on-scroll">
        <div className="database-empty">
          <span>{t("No pets found")}</span>
          <p>{t("Try a different pet name or category.")}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="item-grid reveal-on-scroll">
      <div className="item-grid__tiles pet-grid__tiles">
        {items.map((item) => (
          <button className="item-tile pet-tile" key={item.id} type="button" onClick={() => onOpen(item)}>
            <span className="item-tile__rarity item-tile__rarity--common">{td(item.category)}</span>
            <span className="item-tile__media pet-tile__media">
              {item.image ? (
                <img alt={td(item.name)} loading="lazy" src={item.image} />
              ) : (
                <span className="item-tile__fallback">{item.name.slice(0, 2).toUpperCase()}</span>
              )}
            </span>
            <span className="item-tile__name">{td(item.name)}</span>
            <span className="item-tile__meta">{td(item.category)}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
