import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";

type HeroBlockProps = {
  eyebrow: string;
  title: string;
  description: string;
  primaryCta: { label: string; href: string };
  secondaryCta: { label: string; href: string };
  supportLink: { label: string; href: string };
  statusLabel: string;
  featuredTitle: string;
  featuredDescription: string;
};

export function HeroBlock({
  eyebrow,
  title,
  description,
  primaryCta,
  secondaryCta,
  supportLink,
  statusLabel,
  featuredTitle,
  featuredDescription
}: HeroBlockProps) {
  return (
    <section className="hero">
      <div className="container hero__grid">
        <div className="hero__copy">
          <div className="hero__brand">
            <span className="hero__brand-logo">
              <img alt="SNAILSLAYER logo" src="/snailslayer-logo.jpeg" />
            </span>
            <div className="hero__brand-copy">
              <strong>SNAILSLAYER</strong>
              <small>MapleStory Creator</small>
            </div>
          </div>
          <span className="hero__eyebrow">{eyebrow}</span>
          <h1>{title}</h1>
          <p>{description}</p>
          <div className="hero__actions">
            <Button href={primaryCta.href}>{primaryCta.label}</Button>
            <Button href={secondaryCta.href} variant="secondary">{secondaryCta.label}</Button>
          </div>
          <Button href={supportLink.href} variant="link">{supportLink.label}</Button>
        </div>

        <div className="hero__feature card">
          <div className="hero__feature-visual">
            <div className="hero__moon hero__moon--one" />
            <div className="hero__moon hero__moon--two" />
            <div className="hero__sparkles" />
            <div className="hero__avatar-shell">
              <div className="hero__avatar-glow" aria-hidden="true" />
              <img
                alt="Creator avatar"
                className="hero__avatar"
                loading="eager"
                src="/avatar.jpg"
              />
            </div>
          </div>
          <Badge label={statusLabel} tone="live" />
          <h2>{featuredTitle}</h2>
          <p>{featuredDescription}</p>
          <div className="hero__feature-metrics">
            <div>
              <span>Focus</span>
              <strong>Bossing + progression</strong>
            </div>
            <div>
              <span>Format</span>
              <strong>Video + live</strong>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
