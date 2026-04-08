import type { LeaderboardColumn } from "../../data/leaderboards";

type LeaderboardPanelProps = {
  columns: LeaderboardColumn[];
};

export function LeaderboardPanel({ columns }: LeaderboardPanelProps) {
  return (
    <section className="leaderboard-panel card">
      <div className="leaderboard-panel__top">
        <div>
          <span className="section-header__eyebrow">Leaderboard</span>
          <h3>Community heat</h3>
          <p>Top viewers, sharpest supporters, and the clips people keep replaying.</p>
        </div>
        <span className="leaderboard-panel__live-tag">Live rankings</span>
      </div>

      <div className="leaderboard-panel__grid">
        {columns.map((column) => (
          <article className={`leaderboard-column leaderboard-column--${column.accent}`} key={column.id}>
            <div className="leaderboard-column__head">
              <strong>{column.title}</strong>
              <p>{column.subtitle}</p>
            </div>

            <div className="leaderboard-column__list">
              {column.entries.map((entry, index) => (
                <div className="leaderboard-entry" key={entry.id}>
                  <span className={`leaderboard-entry__rank ${index === 0 ? "is-top" : ""}`}>#{index + 1}</span>
                  <div className="leaderboard-entry__copy">
                    <strong>{entry.name}</strong>
                    <small>{entry.value}</small>
                  </div>
                  {entry.badge ? <span className="leaderboard-entry__badge">{entry.badge}</span> : null}
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
