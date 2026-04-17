import type { SyncedContentItem } from "../../data/contentAutomation";
import { useI18n } from "../../i18n/I18nProvider";

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
  const { t, td } = useI18n();

  return (
    <article className="card activity-feed-card">
      <span className="section-header__eyebrow">{t("Auto updates")}</span>
      <h3>{t("Sync activity")}</h3>
      <div className="activity-feed-card__list">
        {items.map((item) => (
          <div className="activity-feed-card__item" key={item.id}>
            <span className="activity-feed-card__icon" aria-hidden="true">{toneMap[item.type]}</span>
            <div>
              <strong>{td(item.title)}</strong>
              <p>{td(item.detail)}</p>
            </div>
            <span className="activity-feed-card__time">{td(item.published)}</span>
          </div>
        ))}
      </div>
    </article>
  );
}
