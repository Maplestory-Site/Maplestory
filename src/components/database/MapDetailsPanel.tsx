import { useEffect, useMemo, useState } from "react";
import type { MapDetail, MapEntry } from "../../data/maps";
import type { MonsterEntry } from "../../data/monsters";
import { useI18n } from "../../i18n/I18nProvider";

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
  const { t, td } = useI18n();
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
      <button aria-label={t("Close map details")} className="item-details__backdrop" type="button" onClick={onClose} />
      <div className="item-details__panel map-details__panel">
        <button className="item-details__close" type="button" onClick={onClose}>
          {t("Close")}
        </button>

        <div className="map-details__header">
          <div className="map-details__visual">
            <img alt={td(item.name)} src={detail?.map.imageLarge ?? item.imageLarge} />
          </div>

          <div className="item-details__summary">
            <span className="item-details__eyebrow">{td(detail?.map.region ?? item.region)}</span>
            <h2 id="map-details-title">{td(detail?.map.name ?? item.name)}</h2>
            <p>{td(detail?.map.streetName ?? item.streetName)}</p>

            <div className="item-details__stats map-details__stats">
              <div>
                <span>{t("Average Level")}</span>
                <strong>{detail?.map.avgLevel ? td(`Lv. ${detail.map.avgLevel}`) : t("Mixed")}</strong>
              </div>
              <div>
                <span>{t("Spawn Points")}</span>
                <strong>{detail?.map.spawnPoints ? td(String(detail.map.spawnPoints)) : t("Unknown")}</strong>
              </div>
              <div>
                <span>{t("Cap / Gen")}</span>
                <strong>{detail?.map.capacityPerGen ? td(String(detail.map.capacityPerGen)) : t("Unknown")}</strong>
              </div>
              <div>
                <span>{t("Monsters")}</span>
                <strong>{detail?.meta.monsterCount || 0}</strong>
              </div>
            </div>

          </div>
        </div>

        <section className="item-details__section">
          <span>{t("Monsters in this map")}</span>
          {loading ? <p>{t("Loading map monsters...")}</p> : null}
          {!loading && !resolvedMonsters.length ? <p>{t("No monster entries were returned for this map.")}</p> : null}

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
                    <img alt={td(monster.name)} loading="lazy" src={monster.image} />
                  ) : (
                    <span className="map-details__monster-fallback">{monster.portrait}</span>
                  )}
                  <strong>{td(monster.name)}</strong>
                  <span>
                    {td(`Lv. ${monster.level}`)}
                    {monster.hp ? ` · ${td(`HP ${monster.hp.toLocaleString("en-US")}`)}` : ""}
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
