import { Button } from "../ui/Button";
import type { RecommendationCardData, RecommendationSectionData } from "../../lib/aiExperience";
import { useI18n } from "../../i18n/I18nProvider";

type RecommendationPanelProps = {
  items?: RecommendationCardData[];
  sections?: RecommendationSectionData[];
};

export function RecommendationPanel({ items = [], sections = [] }: RecommendationPanelProps) {
  const { t, td } = useI18n();
  const normalizedSections =
    sections.length > 0
      ? sections
      : [
          {
            id: "default-recommendations",
            eyebrow: "For you",
            title: "You may like",
            description: "Fast picks worth opening next.",
            items
          }
        ];

  return (
    <article className="card recommendation-panel" data-reveal>
      <div className="recommendation-panel__top">
        <div>
          <span className="section-header__eyebrow">{t("Recommendations")}</span>
          <h3>{t("Watch next")}</h3>
          <p>{t("Smart picks built from tags, clips, and recent watch patterns.")}</p>
        </div>
        <Button href="/videos" variant="ghost">{t("See all")}</Button>
      </div>

      <div className="recommendation-panel__groups">
        {normalizedSections.map((section) => (
          <section className="recommendation-panel__group" key={section.id}>
            <div className="recommendation-panel__group-head">
              <div>
                <span className="section-header__eyebrow">{td(section.eyebrow)}</span>
                <h4>{td(section.title)}</h4>
              </div>
              <small>{td(section.description)}</small>
            </div>

            <div className="recommendation-panel__shelf">
              {section.items.map((item) => (
                <article className="recommendation-card" key={item.id}>
                  <a className="recommendation-card__media" href={item.href}>
                    {item.thumbnail ? <img alt="" decoding="async" loading="lazy" src={item.thumbnail} /> : null}
                    <span className="recommendation-card__badge">{td(item.badge)}</span>
                    {item.duration ? <strong className="recommendation-card__duration">{td(item.duration)}</strong> : null}
                  </a>
                  <div className="recommendation-card__body">
                    <span className="ai-tag">{td(item.category)}</span>
                    <strong>{td(item.title)}</strong>
                    <p>{td(item.note)}</p>
                    <a className="recommendation-card__link" href={item.href}>{t("Open pick")}</a>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </article>
  );
}
