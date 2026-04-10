import { useEffect, useState } from "react";
import type { QuestDetail, QuestEntry } from "../../data/quests";

type QuestDetailsPanelProps = {
  item: QuestEntry | null;
  onClose: () => void;
};

function renderList(title: string, items: string[]) {
  if (!items.length) return null;

  return (
    <section className="item-details__section">
      <span>{title}</span>
      <div className="item-details__chips">
        {items.map((entry) => (
          <span className="item-details__chip" key={`${title}-${entry}`}>
            {entry}
          </span>
        ))}
      </div>
    </section>
  );
}

export function QuestDetailsPanel({ item, onClose }: QuestDetailsPanelProps) {
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
    <div className="item-details" role="dialog" aria-modal="true" aria-label={`${item.name} quest details`}>
      <button aria-label="Close quest details" className="item-details__backdrop" type="button" onClick={onClose} />
      <div className="item-details__panel">
        <button className="item-details__close" type="button" onClick={onClose}>
          Close
        </button>

        <div className="item-details__header">
          <div className="item-details__visual">
            {current.image ? (
              <img alt={current.name} src={current.image} />
            ) : (
              <span className="item-details__visual-fallback">{current.name.slice(0, 2).toUpperCase()}</span>
            )}
          </div>

          <div className="item-details__summary">
            <span className="item-details__eyebrow">{current.category}</span>
            <h2>{current.name}</h2>
            <p>{current.summary}</p>

            <div className="item-details__stats">
              <div>
                <span>Category</span>
                <strong>{current.category}</strong>
              </div>
              <div>
                <span>Level</span>
                <strong>{current.levelBracket ? `Lv.${current.levelBracket}` : "Mixed"}</strong>
              </div>
              <div>
                <span>Requirements</span>
                <strong>{detail?.requirements.length ?? 0}</strong>
              </div>
              <div>
                <span>Rewards</span>
                <strong>{detail?.rewards.length ?? 0}</strong>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <section className="item-details__section">
            <span>Loading</span>
            <p>Pulling quest requirements, rewards, NPCs, and map routes...</p>
          </section>
        ) : null}

        {sectionNotes.length ? (
          <section className="item-details__section">
            <span>Quest flow</span>
            <p>{sectionNotes.join(" ")}</p>
          </section>
        ) : null}

        {renderList("Requirements", detail?.requirements || [])}
        {renderList("Rewards", detail?.rewards || [])}
        {renderList("NPC / Contacts", detail?.npcs || [])}
        {renderList("Maps / Locations", detail?.maps || [])}
        {renderList("Steps", detail?.steps || [])}
        {renderList("Unlocked Quests", detail?.nextQuests || [])}
        {renderList("Quest tags", current.categories)}

      </div>
    </div>
  );
}
