import type { MapEntry } from "../../data/maps";
import { useI18n } from "../../i18n/I18nProvider";

type MapGridProps = {
  items: MapEntry[];
  onOpen: (item: MapEntry) => void;
};

export function MapGrid({ items, onOpen }: MapGridProps) {
  const { t, td } = useI18n();

  if (!items.length) {
    return (
      <section className="map-grid map-grid--empty reveal-on-scroll">
        <div className="database-empty">
          <span>{t("No maps found")}</span>
          <p>{t("Try a different name, street, or region.")}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="map-grid reveal-on-scroll">
      <div className="map-grid__tiles">
        {items.map((item) => (
          <button className="map-tile" key={item.id} type="button" onClick={() => onOpen(item)}>
            <img alt={td(item.name)} loading="lazy" src={item.image} />
            <span className="map-tile__name">{td(item.name)}</span>
            <span className="map-tile__meta">{td(item.streetName)}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
