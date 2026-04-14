import { useI18n } from "../../i18n/I18nProvider";

type PageHeroProps = {
  title: string;
  subtitle: string;
  total: number;
};

export function PageHero({ title, subtitle, total }: PageHeroProps) {
  const { t } = useI18n();
  return (
    <section className="classes-hero reveal-on-scroll">
      <div className="classes-hero__copy">
        <span className="classes-hero__eyebrow">{t("Class Directory")}</span>
        <h1>{t(title)}</h1>
        <p>{t(subtitle)}</p>
        <div className="classes-hero__proof">
          <span>{total} {t("jobs")}</span>
          <span>{t("Premium discovery")}</span>
          <span>{t("Build-ready filters")}</span>
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
          <span>{t("Browse by faction")}</span>
          <strong>{t("Find your next main")}</strong>
        </div>
      </div>
    </section>
  );
}
