import type {
  AchievementItem,
  BossClearItem,
  ProgressBarItem
} from "../../data/progressionDashboard";

type ProgressionDashboardProps = {
  achievements: AchievementItem[];
  bossClears: BossClearItem[];
  description: string;
  progressBars: ProgressBarItem[];
  stats: { label: string; value: string }[];
  title: string;
};

export function ProgressionDashboard({
  achievements,
  bossClears,
  description,
  progressBars,
  stats,
  title
}: ProgressionDashboardProps) {
  return (
    <section className="section" data-reveal>
      <div className="container">
        <section className="progression-dashboard">
          <div className="progression-dashboard__intro">
            <span className="section-header__eyebrow">Progression</span>
            <h2>{title}</h2>
            <p>{description}</p>
          </div>

          <div className="progression-dashboard__stats" aria-label="Progress summary">
            {stats.map((item) => (
              <article className="progression-stat" key={item.label}>
                <strong>{item.value}</strong>
                <span>{item.label}</span>
              </article>
            ))}
          </div>

          <div className="progression-dashboard__grid">
            <article className="progression-panel">
              <div className="progression-panel__head">
                <span className="section-header__eyebrow">Boss Clears</span>
                <strong>This week</strong>
              </div>
              <div className="boss-clear-list">
                {bossClears.map((item) => (
                  <article
                    className={`boss-clear-card ${item.status === "cleared" ? "is-cleared" : "is-pushing"}`}
                    key={`${item.name}-${item.difficulty}`}
                  >
                    <div className="boss-clear-card__top">
                      <div>
                        <strong>{item.name}</strong>
                        <span>{item.difficulty}</span>
                      </div>
                      <span className="boss-clear-card__status">
                        {item.status === "cleared" ? "Cleared" : "In Progress"}
                      </span>
                    </div>
                    <p>{item.detail}</p>
                    <div className="progress-meter" aria-hidden="true">
                      <span style={{ width: `${item.progress}%` }} />
                    </div>
                  </article>
                ))}
              </div>
            </article>

            <article className="progression-panel progression-panel--bars">
              <div className="progression-panel__head">
                <span className="section-header__eyebrow">Account Push</span>
                <strong>Core progress</strong>
              </div>
              <div className="progress-bars">
                {progressBars.map((item) => (
                  <article className="progress-bar" key={item.label}>
                    <div className="progress-bar__meta">
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                    </div>
                    <div className="progress-meter" aria-hidden="true">
                      <span
                        className={item.tone === "accent" ? "is-accent" : undefined}
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                  </article>
                ))}
              </div>
            </article>

            <article className="progression-panel progression-panel--achievements">
              <div className="progression-panel__head">
                <span className="section-header__eyebrow">Recent Wins</span>
                <strong>Latest achievements</strong>
              </div>
              <div className="achievement-list">
                {achievements.map((item) => (
                  <article className="achievement-item" key={`${item.title}-${item.stamp}`}>
                    <div className="achievement-item__stamp">{item.stamp}</div>
                    <div className="achievement-item__body">
                      <strong>{item.title}</strong>
                      <p>{item.detail}</p>
                    </div>
                  </article>
                ))}
              </div>
            </article>
          </div>
        </section>
      </div>
    </section>
  );
}
