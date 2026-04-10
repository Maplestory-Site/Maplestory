import type { MonsterEntry } from "../../data/monsters";
type BossSpotlightSectionProps = {
  items: MonsterEntry[];
  onOpen: (item: MonsterEntry) => void;
};

export function BossSpotlightSection({ items, onOpen }: BossSpotlightSectionProps) {
  return (
    <section className="boss-spotlight reveal-on-scroll">
      <header className="monster-section-heading">
        <div>
          <span>Boss spotlight</span>
          <h2>Hard targets worth tracking</h2>
        </div>
        <p>Big HP pools, harder patterns, and more pressure.</p>
      </header>

      <div className="boss-spotlight__grid">
        {items.map((item) => (
          <article key={item.id} className="monster-mini-tile is-boss">
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
                <span>BOSS</span>
              </div>
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
