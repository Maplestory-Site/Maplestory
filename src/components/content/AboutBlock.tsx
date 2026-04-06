import { Button } from "../ui/Button";

type AboutBlockProps = {
  title: string;
  description: string;
  points: string[];
  cta: { label: string; href: string };
};

export function AboutBlock({ title, description, points, cta }: AboutBlockProps) {
  return (
    <section className="section about-block">
      <div className="container about-block__grid">
        <div className="card about-block__intro">
          <span className="section-header__eyebrow">About</span>
          <h2>{title}</h2>
          <p>{description}</p>
          <Button href={cta.href} variant="secondary">{cta.label}</Button>
        </div>
        <div className="about-block__points">
          {points.map((point) => (
            <article className="card about-point" key={point}>
              <strong>{point}</strong>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
