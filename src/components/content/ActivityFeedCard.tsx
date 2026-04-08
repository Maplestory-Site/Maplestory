import type { SyncedContentItem } from "../../data/contentAutomation";

type ActivityFeedCardProps = {
  items: SyncedContentItem[];
};

const toneMap: Record<SyncedContentItem["type"], string> = {
  upload: "U",
  clip: "C",
  stream: "L",
  telegram: "T"
};

export function ActivityFeedCard({ items }: ActivityFeedCardProps) {
  return (
    <article className="card activity-feed-card">
      <span className="section-header__eyebrow">Auto updates</span>
      <h3>Sync activity</h3>
      <div className="activity-feed-card__list">
        {items.map((item) => (
          <div className="activity-feed-card__item" key={item.id}>
            <span className="activity-feed-card__icon" aria-hidden="true">{toneMap[item.type]}</span>
            <div>
              <strong>{item.title}</strong>
              <p>{item.detail}</p>
            </div>
            <span className="activity-feed-card__time">{item.published}</span>
          </div>
        ))}
      </div>
    </article>
  );
}

