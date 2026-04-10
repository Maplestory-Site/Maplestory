import type { FarmingPreset, MonsterEntry } from "../../data/monsters";
type FarmingTargetsSectionProps = {
  items: MonsterEntry[];
  activePreset: FarmingPreset;
  onPresetChange: (preset: FarmingPreset) => void;
  onOpen: (item: MonsterEntry) => void;
};

const presets: FarmingPreset[] = ["All", "Best meso farming", "Best easy farm", "Best material drops"];

export function FarmingTargetsSection({ items, activePreset, onPresetChange, onOpen }: FarmingTargetsSectionProps) {
  return (
    <section className="farming-targets reveal-on-scroll">
      <header className="monster-section-heading">
        <div>
          <span>Best farming monsters</span>
          <h2>Fast picks for farming routes</h2>
        </div>
        <p>Quick recommendations for value, easy clears, and material farming.</p>
      </header>

      <div className="farming-targets__pills">
        {presets.map((preset) => (
          <button
            key={preset}
            className={`farming-targets__pill ${activePreset === preset ? "is-active" : ""}`}
            type="button"
            onClick={() => onPresetChange(preset)}
          >
            {preset}
          </button>
        ))}
      </div>

      <div className="farming-targets__grid">
        {items.map((item) => (
          <article key={item.id} className="monster-mini-tile">
            <button className="monster-mini-tile__open" type="button" onClick={() => onOpen(item)}>
              <div className="monster-mini-tile__frame">
                <div className="monster-mini-tile__art">
                  {item.image ? <img alt={item.name} loading="lazy" src={item.image} /> : <span className="monster-mini-tile__glyph">{item.portrait}</span>}
                </div>
              </div>

              <div className="monster-mini-tile__copy">
                <strong>{item.name}</strong>
                <span>Lv. {item.level}</span>
              </div>

              <div className="monster-mini-tile__flags">
                <span>{item.farmingTier} FARM</span>
              </div>
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
