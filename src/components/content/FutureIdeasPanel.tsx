import type { AiFutureIdea } from "../../data/aiExperience";

type FutureIdeasPanelProps = {
  items: AiFutureIdea[];
};

export function FutureIdeasPanel({ items }: FutureIdeasPanelProps) {
  return (
    <article className="card future-ideas-panel" data-reveal>
      <span className="section-header__eyebrow">Future AI</span>
      <h3>Ready for what comes next</h3>
      <div className="future-ideas-panel__list">
        {items.map((item) => (
          <article className="future-idea-card" key={item.id}>
            <span className="future-idea-card__badge">{item.badge}</span>
            <strong>{item.title}</strong>
            <p>{item.description}</p>
          </article>
        ))}
      </div>
    </article>
  );
}
