import { Badge } from "../ui/Badge";
import heroPhoto from "../../assets/hero-photo.jpg";
import { useI18n } from "../../i18n/I18nProvider";

type HeroBlockProps = {
  eyebrow: string;
  title: string;
  valueLine?: string;
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
  valueLine,
  description,
  urgencyText,
  statusLabel,
  statusTone = "live",
  featuredTitle,
  featuredDescription
}: HeroBlockProps) {
  const { t, td } = useI18n();
  const statusCopy = statusTone === "live" ? t("Live now on Twitch") : t("Live, clips, and alerts");

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
              <small>{t("MapleStory Creator")}</small>
            </div>
          </div>
          <span className="hero__eyebrow">{td(eyebrow)}</span>
          <div className="hero__status-row">
            <Badge label={t(statusLabel)} tone={statusTone} />
            <span>{statusCopy}</span>
          </div>
          <h1>{td(title)}</h1>
          {valueLine ? <strong className="hero__value-line">{td(valueLine)}</strong> : null}
          <p>{td(description)}</p>
          {urgencyText ? <strong className="hero__hook">{td(urgencyText)}</strong> : null}
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
                src={heroPhoto}
                width="740"
              />
            </div>
          </div>
          <h2>{td(featuredTitle)}</h2>
          <p>{td(featuredDescription)}</p>
        </div>
      </div>
    </section>
  );
}
