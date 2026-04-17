import { Button } from "../ui/Button";
import type { HighlightSuggestion } from "../../data/aiExperience";
import { useI18n } from "../../i18n/I18nProvider";

type AiHighlightsPanelProps = {
  highlights: HighlightSuggestion[];
};

export function AiHighlightsPanel({ highlights }: AiHighlightsPanelProps) {
  const { t, td } = useI18n();
  const [lead, ...rest] = highlights;

  return (
    <section className="section" data-reveal>
      <div className="container ai-grid">
        <article className="card ai-highlights-panel">
          <span className="section-header__eyebrow">{t("Auto highlights")}</span>
          <h2>{t("Best moments today")}</h2>
          <p>{t("AI picks the clips most likely to hit.")}</p>
          <div className="ai-highlights-panel__lead">
            <span className="ai-tag">{td(lead.category)}</span>
            <strong>{td(lead.title)}</strong>
            <p>{td(lead.reason)}</p>
            <div className="ai-highlights-panel__meta">
              <span>{td(lead.confidence)}</span>
              <Button href={lead.href}>{td(lead.ctaLabel)}</Button>
            </div>
          </div>
        </article>
        <div className="ai-highlights-panel__stack">
          {rest.map((item) => (
            <article className="card ai-suggestion-card" key={item.id}>
              <div className="ai-suggestion-card__top">
                <span className="ai-tag">{td(item.category)}</span>
                <span>{td(item.confidence)}</span>
              </div>
              <strong>{td(item.title)}</strong>
              <p>{td(item.reason)}</p>
              <Button href={item.href} variant="secondary">{td(item.ctaLabel)}</Button>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
