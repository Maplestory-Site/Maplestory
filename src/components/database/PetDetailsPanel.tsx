import { useEffect } from "react";
import type { PetEntry } from "../../data/pets";
import { useI18n } from "../../i18n/I18nProvider";

type PetDetailsPanelProps = {
  item: PetEntry | null;
  onClose: () => void;
};

export function PetDetailsPanel({ item, onClose }: PetDetailsPanelProps) {
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
    <div className="item-details" role="dialog" aria-modal="true" aria-label={td(`${item.name} pet details`)}>
      <button aria-label={t("Close pet details")} className="item-details__backdrop" type="button" onClick={onClose} />
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
            <span className="item-details__eyebrow">{t("Pet")}</span>
            <h2>{td(item.name)}</h2>
            <p>{td(item.summary)}</p>

            <div className="item-details__stats">
              <div>
                <span>{t("Category")}</span>
                <strong>{td(item.category)}</strong>
              </div>
              <div>
                <span>{t("Theme")}</span>
                <strong>{td(item.tags[1] || "Companion")}</strong>
              </div>
              <div>
                <span>{t("Collection")}</span>
                <strong>{t("Pet Index")}</strong>
              </div>
              <div>
                <span>{t("Tags")}</span>
                <strong>{item.tags.length}</strong>
              </div>
            </div>
          </div>
        </div>

        <section className="item-details__section">
          <span>{t("Overview")}</span>
          <p>{td(item.summary)}</p>
        </section>

        <section className="item-details__section">
          <span>{t("Tags")}</span>
          <div className="item-details__chips">
            {item.tags.map((tag) => (
              <span className="item-details__chip" key={tag}>
                {td(tag)}
              </span>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}
