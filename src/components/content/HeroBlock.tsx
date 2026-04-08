import { Badge } from "../ui/Badge";

type HeroBlockProps = {
  eyebrow: string;
  title: string;
  description: string;
  urgencyText?: string;
  statusLabel: string;
  statusTone?: "live" | "offline";
  featuredTitle: string;
  featuredDescription: string;
};

export function HeroBlock({
  eyebrow,
  title,
  description,
  urgencyText,
  statusLabel,
  statusTone = "live",
  featuredTitle,
  featuredDescription
}: HeroBlockProps) {
  const statusCopy = statusTone === "live" ? "Live now on Twitch" : "Live, clips, and alerts";

  return (
    <section className="hero" data-reveal>
      <div className="container hero__grid">
        <div className="hero__copy">
          <div className="hero__brand">
            <span className="hero__brand-logo">
              <img alt="SNAILSLAYER logo" decoding="async" fetchPriority="high" height="72" src="/snailslayer-logo.jpeg" width="72" />
            </span>
            <div className="hero__brand-copy">
              <strong>SNAILSLAYER</strong>
              <small>MapleStory Creator</small>
            </div>
          </div>
          <span className="hero__eyebrow">{eyebrow}</span>
          <div className="hero__status-row">
            <Badge label={statusLabel} tone={statusTone} />
            <span>{statusCopy}</span>
          </div>
          <h1>{title}</h1>
          <p>{description}</p>
          {urgencyText ? <strong className="hero__hook">{urgencyText}</strong> : null}
        </div>

        <div className="hero__feature card">
          <div className="hero__feature-visual">
            <div className="hero__feature-ring" aria-hidden="true" />
            <div className="hero__feature-shine" aria-hidden="true" />
            <div className="hero__avatar-shell">
              <div className="hero__avatar-glow" aria-hidden="true" />
              <img
                alt="Creator avatar"
                className="hero__avatar"
                decoding="async"
                fetchPriority="high"
                height="740"
                loading="eager"
                src="/hero-photo.jpg"
                width="740"
              />
            </div>
          </div>
          <h2>{featuredTitle}</h2>
          <p>{featuredDescription}</p>
        </div>
      </div>
    </section>
  );
}
