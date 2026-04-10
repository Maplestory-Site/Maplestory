type MonstersHeroProps = {
  total: number;
  bosses: number;
  farmingTargets: number;
};

export function MonstersHero({ total, bosses, farmingTargets }: MonstersHeroProps) {
  return (
    <section className="monsters-hero reveal-on-scroll">
      <div className="monsters-hero__copy">
        <span className="monsters-hero__eyebrow">Monster index</span>
        <h1>Monsters</h1>
        <p>Browse monsters, bosses, drops, and maps fast.</p>

        <div className="monsters-hero__stats">
          <div>
            <strong>{total}</strong>
            <span>Total entries</span>
          </div>
          <div>
            <strong>{bosses}</strong>
            <span>Boss hunts</span>
          </div>
          <div>
            <strong>{farmingTargets}</strong>
            <span>Top farm picks</span>
          </div>
        </div>
      </div>
    </section>
  );
}
