type PageHeroProps = {
  title: string;
  subtitle: string;
  total: number;
};

export function PageHero({ title, subtitle, total }: PageHeroProps) {
  return (
    <section className="classes-hero reveal-on-scroll">
      <div className="classes-hero__copy">
        <span className="classes-hero__eyebrow">Class Directory</span>
        <h1>{title}</h1>
        <p>{subtitle}</p>
        <div className="classes-hero__proof">
          <span>{total} jobs</span>
          <span>Premium discovery</span>
          <span>Build-ready filters</span>
        </div>
      </div>
      <div className="classes-hero__visual" aria-hidden="true">
        <img
          className="classes-hero__visual-image"
          src="/classes-hero-art.avif"
          alt=""
        />
        <div className="classes-hero__orb" />
        <div className="classes-hero__visual-card">
          <span>Browse by faction</span>
          <strong>Find your next main</strong>
        </div>
      </div>
    </section>
  );
}
