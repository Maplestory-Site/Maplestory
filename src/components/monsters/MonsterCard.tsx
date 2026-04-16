import type { MonsterEntry } from "../../data/monsters";
import { useI18n } from "../../i18n/I18nProvider";
type MonsterCardProps = {
  item: MonsterEntry;
  compared: boolean;
  onOpen: (item: MonsterEntry) => void;
  onToggleCompare: (item: MonsterEntry) => void;
};

export function MonsterCard({ item, compared, onOpen, onToggleCompare }: MonsterCardProps) {
  const { t, td } = useI18n();

  return (
    <article className={`monster-mini-tile ${item.isBoss ? "is-boss" : ""}`}>
      <button className="monster-mini-tile__open" type="button" onClick={() => onOpen(item)}>
        <div className="monster-mini-tile__frame">
          <div className="monster-mini-tile__art">
            {item.image ? <img alt={td(item.name)} loading="lazy" src={item.image} /> : <span className="monster-mini-tile__glyph">{item.portrait}</span>}
          </div>
        </div>

        <div className="monster-mini-tile__copy">
          <strong>{td(item.name)}</strong>
          <span>{td(`Lv. ${item.level}`)}</span>
        </div>

        <div className="monster-mini-tile__flags">
          {item.isBoss ? <span>{t("BOSS")}</span> : null}
          {item.isElite ? <span>{t("ELITE")}</span> : null}
        </div>
      </button>

      <div className="monster-mini-tile__actions">
        <button
          className={`monster-mini-tile__compare ${compared ? "is-active" : ""}`}
          type="button"
          onClick={() => onToggleCompare(item)}
        >
          {compared ? t("Added") : t("Compare")}
        </button>
      </div>
    </article>
  );
}
