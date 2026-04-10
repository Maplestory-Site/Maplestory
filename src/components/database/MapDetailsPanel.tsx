import { useEffect, useMemo, useState } from "react";
import type { MapDetail, MapEntry } from "../../data/maps";
import type { MonsterEntry } from "../../data/monsters";

type MapDetailsPanelProps = {
  item: MapEntry | null;
  monsterLookup: Map<string, MonsterEntry>;
  onClose: () => void;
  onOpenMonster: (item: MonsterEntry) => void;
};

function slugify(value = "") {
  return String(value)
    .toLowerCase()
    .replace(/[\u2019']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function MapDetailsPanel({ item, monsterLookup, onClose, onOpenMonster }: MapDetailsPanelProps) {
  const [detail, setDetail] = useState<MapDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadDetail() {
      if (!item) {
        setDetail(null);
        return;
      }

      setLoading(true);
      try {
        const response = await fetch(`/api/maps/${item.mapId}`);
        if (!response.ok) {
          throw new Error("Unable to load map detail.");
        }
        const payload = (await response.json()) as MapDetail;
        if (active) {
          setDetail(payload);
        }
      } catch {
        if (active) {
          setDetail(null);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadDetail();

    return () => {
      active = false;
    };
  }, [item]);

  const resolvedMonsters = useMemo(() => {
    if (!detail) return [];
    return detail.monsters.map((monster) => ({
      ...monster,
      resolved: monsterLookup.get(slugify(monster.name)) ?? null,
    }));
  }, [detail, monsterLookup]);

  if (!item) return null;

  return (
    <div className="item-details map-details" role="dialog" aria-modal="true" aria-labelledby="map-details-title">
      <button aria-label="Close map details" className="item-details__backdrop" type="button" onClick={onClose} />
      <div className="item-details__panel map-details__panel">
        <button className="item-details__close" type="button" onClick={onClose}>
          Close
        </button>

        <div className="map-details__header">
          <div className="map-details__visual">
            <img alt={item.name} src={detail?.map.imageLarge ?? item.imageLarge} />
          </div>

          <div className="item-details__summary">
            <span className="item-details__eyebrow">{detail?.map.region ?? item.region}</span>
            <h2 id="map-details-title">{detail?.map.name ?? item.name}</h2>
            <p>{detail?.map.streetName ?? item.streetName}</p>

            <div className="item-details__stats map-details__stats">
              <div>
                <span>Average Level</span>
                <strong>{detail?.map.avgLevel ? `Lv. ${detail.map.avgLevel}` : "Mixed"}</strong>
              </div>
              <div>
                <span>Spawn Points</span>
                <strong>{detail?.map.spawnPoints || "Unknown"}</strong>
              </div>
              <div>
                <span>Cap / Gen</span>
                <strong>{detail?.map.capacityPerGen || "Unknown"}</strong>
              </div>
              <div>
                <span>Monsters</span>
                <strong>{detail?.meta.monsterCount || 0}</strong>
              </div>
            </div>

          </div>
        </div>

        <section className="item-details__section">
          <span>Monsters in this map</span>
          {loading ? <p>Loading map monsters...</p> : null}
          {!loading && !resolvedMonsters.length ? <p>No monster entries were returned for this map.</p> : null}

          {resolvedMonsters.length ? (
            <div className="map-details__monster-grid">
              {resolvedMonsters.map((monster) => (
                <button
                  className="map-details__monster-tile"
                  key={monster.id}
                  type="button"
                  onClick={() => monster.resolved && onOpenMonster(monster.resolved)}
                >
                  {monster.image ? (
                    <img alt={monster.name} loading="lazy" src={monster.image} />
                  ) : (
                    <span className="map-details__monster-fallback">{monster.portrait}</span>
                  )}
                  <strong>{monster.name}</strong>
                  <span>
                    Lv. {monster.level}
                    {monster.hp ? ` · HP ${monster.hp.toLocaleString("en-US")}` : ""}
                  </span>
                </button>
              ))}
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
