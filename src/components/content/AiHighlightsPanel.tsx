import { Button } from "../ui/Button";
import type { HighlightSuggestion } from "../../data/aiExperience";

type AiHighlightsPanelProps = {
  highlights: HighlightSuggestion[];
};

export function AiHighlightsPanel({ highlights }: AiHighlightsPanelProps) {
  const [lead, ...rest] = highlights;

  return (
    <section className="section" data-reveal>
      <div className="container ai-grid">
        <article className="card ai-highlights-panel">
          <span className="section-header__eyebrow">Auto highlights</span>
          <h2>Best moments today</h2>
          <p>AI picks the clips most likely to hit.</p>
          <div className="ai-highlights-panel__lead">
            <span className="ai-tag">{lead.category}</span>
            <strong>{lead.title}</strong>
            <p>{lead.reason}</p>
            <div className="ai-highlights-panel__meta">
              <span>{lead.confidence}</span>
              <Button href={lead.href}>{lead.ctaLabel}</Button>
            </div>
          </div>
        </article>
        <div className="ai-highlights-panel__stack">
          {rest.map((item) => (
            <article className="card ai-suggestion-card" key={item.id}>
              <div className="ai-suggestion-card__top">
                <span className="ai-tag">{item.category}</span>
                <span>{item.confidence}</span>
              </div>
              <strong>{item.title}</strong>
              <p>{item.reason}</p>
              <Button href={item.href} variant="secondary">{item.ctaLabel}</Button>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
