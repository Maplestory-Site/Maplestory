import type { NewsItem } from "../../data/newsHub";
import { isRecentlyUpdated } from "../../data/newsHub";
import { formatNewsMetaDate } from "../../lib/newsHub";
import { Button } from "../ui/Button";

type NewsCardProps = {
  item: NewsItem;
  featured?: boolean;
};

export function NewsCard({ item, featured = false }: NewsCardProps) {
  const recentlyUpdated = isRecentlyUpdated(item.publishedAt);
  const published = formatNewsMetaDate(item.publishedAt);

  return (
    <article className={`card news-card ${featured ? "news-card--featured" : ""}`}>
      <div className="news-card__media" aria-hidden="true">
        {item.image ? <img alt="" className="news-card__image" decoding="async" loading="lazy" src={item.image} /> : null}
        <div className="news-card__media-overlay" />
        <div className="news-card__media-top">
          <span className="news-card__badge">{formatCategory(item.category)}</span>
          {recentlyUpdated ? <span className="news-card__badge news-card__badge--fresh">Updated Recently</span> : null}
        </div>
        <div className="news-card__media-bottom">
          <span>Official MapleStory</span>
        </div>
      </div>

      <div className="news-card__body">
        <div className="news-card__meta">
          <span>{published}</span>
          <span>{item.category.replace("-", " ")}</span>
        </div>
        <h3>{item.title}</h3>
        <p>{item.summary}</p>
        <div className="news-card__actions">
          <Button href={item.sourceUrl} variant={featured ? "primary" : "ghost"}>
            Read Original
          </Button>
        </div>
      </div>
    </article>
  );
}

function formatCategory(category: NewsItem["category"]) {
  switch (category) {
    case "patch-notes":
      return "Patch Notes";
    case "cash-shop":
      return "Cash Shop";
    case "notices":
      return "Notices";
    case "updates":
      return "Updates";
    case "events":
      return "Events";
    default:
      return category;
  }
}
