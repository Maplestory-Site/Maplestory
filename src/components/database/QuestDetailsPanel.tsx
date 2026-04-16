import { useEffect, useState } from "react";
import type { QuestDetail, QuestEntry } from "../../data/quests";
import { useI18n } from "../../i18n/I18nProvider";

type QuestDetailsPanelProps = {
  item: QuestEntry | null;
  onClose: () => void;
};

function renderList(title: string, items: string[], t: (value: string) => string, td: (value: string) => string) {
  if (!items.length) return null;

  return (
    <section className="item-details__section">
      <span>{t(title)}</span>
      <div className="item-details__chips">
        {items.map((entry) => (
          <span className="item-details__chip" key={`${title}-${entry}`}>
            {td(entry)}
          </span>
        ))}
      </div>
    </section>
  );
}

export function QuestDetailsPanel({ item, onClose }: QuestDetailsPanelProps) {
  const { t, td } = useI18n();
  const [detail, setDetail] = useState<QuestDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!item) return;

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [item, onClose]);

  useEffect(() => {
    let active = true;

    async function loadDetail() {
      if (!item) {
        setDetail(null);
        return;
      }

      setLoading(true);
      try {
        const response = await fetch(`/api/quests/${item.id}`);
        if (!response.ok) {
          throw new Error("Unable to load quest detail.");
        }
        const payload = (await response.json()) as QuestDetail;
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

  if (!item) return null;

  const current = detail?.quest ?? item;
  const sectionNotes = detail?.notes?.length ? detail.notes : item.notes;

  return (
    <div className="item-details" role="dialog" aria-modal="true" aria-label={td(`${item.name} quest details`)}>
      <button aria-label={t("Close quest details")} className="item-details__backdrop" type="button" onClick={onClose} />
      <div className="item-details__panel">
        <button className="item-details__close" type="button" onClick={onClose}>
          {t("Close")}
        </button>

        <div className="item-details__header">
          <div className="item-details__visual">
            {current.image ? (
              <img alt={td(current.name)} src={current.image} />
            ) : (
              <span className="item-details__visual-fallback">{current.name.slice(0, 2).toUpperCase()}</span>
            )}
          </div>

          <div className="item-details__summary">
            <span className="item-details__eyebrow">{td(current.category)}</span>
            <h2>{td(current.name)}</h2>
            <p>{td(current.summary)}</p>

            <div className="item-details__stats">
              <div>
                <span>{t("Category")}</span>
                <strong>{td(current.category)}</strong>
              </div>
              <div>
                <span>{t("Level")}</span>
                <strong>{current.levelBracket ? td(`Lv.${current.levelBracket}`) : t("Mixed")}</strong>
              </div>
              <div>
                <span>{t("Requirements")}</span>
                <strong>{detail?.requirements.length ?? 0}</strong>
              </div>
              <div>
                <span>{t("Rewards")}</span>
                <strong>{detail?.rewards.length ?? 0}</strong>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <section className="item-details__section">
            <span>{t("Loading")}</span>
            <p>{t("Pulling quest requirements, rewards, NPCs, and map routes...")}</p>
          </section>
        ) : null}

        {sectionNotes.length ? (
          <section className="item-details__section">
            <span>{t("Quest flow")}</span>
            <p>{td(sectionNotes.join(" "))}</p>
          </section>
        ) : null}

        {renderList("Requirements", detail?.requirements || [], t, td)}
        {renderList("Rewards", detail?.rewards || [], t, td)}
        {renderList("NPC / Contacts", detail?.npcs || [], t, td)}
        {renderList("Maps / Locations", detail?.maps || [], t, td)}
        {renderList("Steps", detail?.steps || [], t, td)}
        {renderList("Unlocked Quests", detail?.nextQuests || [], t, td)}
        {renderList("Quest tags", current.categories, t, td)}

      </div>
    </div>
  );
}
