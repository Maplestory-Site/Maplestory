import type { StreamSummary } from "../../data/aiExperience";

type StreamSummaryCardProps = {
  summary: StreamSummary;
};

export function StreamSummaryCard({ summary }: StreamSummaryCardProps) {
  return (
    <article className="card stream-summary-card" data-reveal>
      <span className="section-header__eyebrow">AI stream summary</span>
      <h3>{summary.title}</h3>
      <p>{summary.description}</p>
      <div className="stream-summary-card__list">
        {summary.points.map((point) => (
          <div className="stream-summary-card__item" key={point.id}>
            <span>{point.label}</span>
            <strong>{point.value}</strong>
          </div>
        ))}
      </div>
    </article>
  );
}
