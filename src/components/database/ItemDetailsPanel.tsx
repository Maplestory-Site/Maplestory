import { useEffect } from "react";
import type { ItemEntry } from "../../data/items";

type ItemDetailsPanelProps = {
  item: ItemEntry | null;
  onClose: () => void;
};

function renderList(title: string, items: string[]) {
  if (!items.length) {
    return null;
  }

  return (
    <section className="item-details__section">
      <span>{title}</span>
      <div className="item-details__chips">
        {items.slice(0, 18).map((entry) => (
          <span className="item-details__chip" key={`${title}-${entry}`}>
            {entry}
          </span>
        ))}
      </div>
    </section>
  );
}

export function ItemDetailsPanel({ item, onClose }: ItemDetailsPanelProps) {
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
    <div className="item-details" role="dialog" aria-modal="true" aria-label={`${item.name} item details`}>
      <button aria-label="Close item details" className="item-details__backdrop" type="button" onClick={onClose} />
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
            <span className="item-details__eyebrow">{item.type}</span>
            <h2>{item.name}</h2>
            <p>{item.description}</p>

            <div className="item-details__stats">
              <div>
                <span>Category</span>
                <strong>{item.category}</strong>
              </div>
              <div>
                <span>Level</span>
                <strong>{item.level ? `Lv.${item.level}` : "None"}</strong>
              </div>
              <div>
                <span>Rarity</span>
                <strong>{item.rarity}</strong>
              </div>
              <div>
                <span>Collections</span>
                <strong>{item.sourceCount}</strong>
              </div>
            </div>
          </div>
        </div>

        {item.effect ? (
          <section className="item-details__section">
            <span>Effect</span>
            <p>{item.effect}</p>
          </section>
        ) : null}

        {renderList("Dropped by", item.sourceMonsters)}
        {renderList("Quest / Rewards", item.rewardSources)}
        {renderList("NPC", item.npcSources)}
        {renderList("Crafting", item.craftSources)}
      </div>
    </div>
  );
}
