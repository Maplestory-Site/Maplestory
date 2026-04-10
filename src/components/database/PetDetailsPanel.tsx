import { useEffect } from "react";
import type { PetEntry } from "../../data/pets";

type PetDetailsPanelProps = {
  item: PetEntry | null;
  onClose: () => void;
};

export function PetDetailsPanel({ item, onClose }: PetDetailsPanelProps) {
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
    <div className="item-details" role="dialog" aria-modal="true" aria-label={`${item.name} pet details`}>
      <button aria-label="Close pet details" className="item-details__backdrop" type="button" onClick={onClose} />
      <div className="item-details__panel">
        <button className="item-details__close" type="button" onClick={onClose}>
          Close
        </button>

        <div className="item-details__header">
          <div className="item-details__visual">
            {item.image ? (
              <img alt={item.name} src={item.image} />
            ) : (
              <span className="item-details__visual-fallback">{item.name.slice(0, 2).toUpperCase()}</span>
            )}
          </div>

          <div className="item-details__summary">
            <span className="item-details__eyebrow">Pet</span>
            <h2>{item.name}</h2>
            <p>{item.summary}</p>

            <div className="item-details__stats">
              <div>
                <span>Category</span>
                <strong>{item.category}</strong>
              </div>
              <div>
                <span>Theme</span>
                <strong>{item.tags[1] || "Companion"}</strong>
              </div>
              <div>
                <span>Collection</span>
                <strong>Pet Index</strong>
              </div>
              <div>
                <span>Tags</span>
                <strong>{item.tags.length}</strong>
              </div>
            </div>
          </div>
        </div>

        <section className="item-details__section">
          <span>Overview</span>
          <p>{item.summary}</p>
        </section>

        <section className="item-details__section">
          <span>Tags</span>
          <div className="item-details__chips">
            {item.tags.map((tag) => (
              <span className="item-details__chip" key={tag}>
                {tag}
              </span>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}
