import { Button } from "../ui/Button";

type CtaBannerProps = {
  title: string;
  description: string;
  primaryCta: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
};

export function CtaBanner({ title, description, primaryCta, secondaryCta }: CtaBannerProps) {
  return (
    <section className="cta-banner" data-reveal>
      <div className="container cta-banner__inner">
        <div>
          <span className="section-header__eyebrow">Next move</span>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        <div className="cta-banner__actions">
          <Button href={primaryCta.href}>{primaryCta.label}</Button>
          {secondaryCta ? <Button href={secondaryCta.href} variant="secondary">{secondaryCta.label}</Button> : null}
        </div>
      </div>
    </section>
  );
}
