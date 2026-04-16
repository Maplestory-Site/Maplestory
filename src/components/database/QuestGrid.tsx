import type { QuestEntry } from "../../data/quests";
import { useI18n } from "../../i18n/I18nProvider";

type QuestGridProps = {
  items: QuestEntry[];
  onOpen: (item: QuestEntry) => void;
};

export function QuestGrid({ items, onOpen }: QuestGridProps) {
  const { t, td } = useI18n();

  if (!items.length) {
    return (
      <section className="item-grid item-grid--empty reveal-on-scroll">
        <div className="database-empty">
          <span>{t("No quests found")}</span>
          <p>{t("Try a different quest name or category.")}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="item-grid reveal-on-scroll">
      <div className="item-grid__tiles quest-grid__tiles">
        {items.map((item) => (
          <button className="item-tile quest-tile" key={item.id} type="button" onClick={() => onOpen(item)}>
            <span className="item-tile__rarity item-tile__rarity--common">{td(item.category)}</span>
            <div className="item-tile__media quest-tile__media">
              {item.image ? (
                <img alt={td(item.name)} loading="lazy" src={item.image} />
              ) : (
                <span className="item-tile__fallback">{item.name.slice(0, 2).toUpperCase()}</span>
              )}
            </div>
            <span className="item-tile__name">{td(item.name)}</span>
            <span className="item-tile__meta">{item.levelBracket ? td(`Lv. ${item.levelBracket}`) : td(item.category)}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
