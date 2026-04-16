import { useEffect } from "react";
import type { ItemEntry } from "../../data/items";
import { useI18n } from "../../i18n/I18nProvider";

type ItemDetailsPanelProps = {
  item: ItemEntry | null;
  onClose: () => void;
};

function renderList(title: string, items: string[], translate: (text: string) => string) {
  if (!items.length) {
    return null;
  }

  return (
    <section className="item-details__section">
      <span>{translate(title)}</span>
      <div className="item-details__chips">
        {items.slice(0, 18).map((entry) => (
          <span className="item-details__chip" key={`${title}-${entry}`}>
            {translate(entry)}
          </span>
        ))}
      </div>
    </section>
  );
}

export function ItemDetailsPanel({ item, onClose }: ItemDetailsPanelProps) {
  const { t, td } = useI18n();

  useEffect(() => {
    if (!item) {
      return;
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [item, onClose]);

  if (!item) {
    return null;
  }

  return (
    <div className="item-details" role="dialog" aria-modal="true" aria-label={`${td(item.name)} ${t("item details")}`}>
      <button aria-label={t("Close item details")} className="item-details__backdrop" type="button" onClick={onClose} />
      <div className="item-details__panel">
        <button className="item-details__close" type="button" onClick={onClose}>
          {t("Close")}
        </button>

        <div className="item-details__header">
          <div className="item-details__visual">
            {item.image ? (
              <img alt={td(item.name)} src={item.image} />
            ) : (
              <span className="item-details__visual-fallback">{item.name.slice(0, 2).toUpperCase()}</span>
            )}
          </div>

          <div className="item-details__summary">
            <span className="item-details__eyebrow">{td(item.type)}</span>
            <h2>{td(item.name)}</h2>
            <p>{td(item.description)}</p>

            <div className="item-details__stats">
              <div>
                <span>{t("Category")}</span>
                <strong>{td(item.category)}</strong>
              </div>
              <div>
                <span>{t("Level")}</span>
                <strong>{item.level ? td(`Lv.${item.level}`) : t("None")}</strong>
              </div>
              <div>
                <span>{t("Rarity")}</span>
                <strong>{td(item.rarity)}</strong>
              </div>
              <div>
                <span>{t("Collections")}</span>
                <strong>{item.sourceCount}</strong>
              </div>
            </div>
          </div>
        </div>

        {item.effect ? (
          <section className="item-details__section">
            <span>{t("Effect")}</span>
            <p>{td(item.effect)}</p>
          </section>
        ) : null}

        {renderList("Dropped by", item.sourceMonsters, td)}
        {renderList("Quest / Rewards", item.rewardSources, td)}
        {renderList("NPC", item.npcSources, td)}
        {renderList("Crafting", item.craftSources, td)}
      </div>
    </div>
  );
}
