type MonstersHeroProps = {
  total: number;
  bosses: number;
  farmingTargets: number;
  title?: string;
  eyebrow?: string;
  subtitle?: string;
};

export function MonstersHero({
  total,
  bosses,
  farmingTargets,
  title = "Monster",
  eyebrow = "Database",
  subtitle = "Browse monsters, bosses, drops, and maps fast."
}: MonstersHeroProps) {
  return (
    <section className="monsters-hero reveal-on-scroll">
      <div className="monsters-hero__copy">
        <span className="monsters-hero__eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{subtitle}</p>

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
