import type { MapEntry } from "../../data/maps";

type MapGridProps = {
  items: MapEntry[];
  onOpen: (item: MapEntry) => void;
};

export function MapGrid({ items, onOpen }: MapGridProps) {
  if (!items.length) {
    return (
      <section className="map-grid map-grid--empty reveal-on-scroll">
        <div className="database-empty">
          <span>No maps found</span>
          <p>Try a different name, street, or region.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="map-grid reveal-on-scroll">
      <div className="map-grid__tiles">
        {items.map((item) => (
          <button className="map-tile" key={item.id} type="button" onClick={() => onOpen(item)}>
            <img alt={item.name} loading="lazy" src={item.image} />
            <span className="map-tile__name">{item.name}</span>
            <span className="map-tile__meta">{item.streetName}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
