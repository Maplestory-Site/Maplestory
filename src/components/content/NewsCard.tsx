import type { NewsItem } from "../../data/newsHub";
import { isRecentlyUpdated } from "../../data/newsHub";
import { formatNewsMetaDate } from "../../lib/newsHub";
import { Button } from "../ui/Button";
import { useI18n } from "../../i18n/I18nProvider";

type NewsCardProps = {
  item: NewsItem;
  featured?: boolean;
  onSelect?: (item: NewsItem) => void;
};

export function NewsCard({ item, featured = false, onSelect }: NewsCardProps) {
  const { t, td } = useI18n();
  const recentlyUpdated = isRecentlyUpdated(item.publishedAt);
  const published = formatNewsMetaDate(item.publishedAt);
  const kmsBrief = item.region === "kms" ? buildKmsBrief(item) : null;
  const imageSrc = item.image || item.kmsBreakdown?.heroImage || item.gmsBreakdown?.heroImage || "";

  return (
    <article className={`card news-card ${featured ? "news-card--featured" : ""}`}>
      <div className="news-card__media" aria-hidden="true">
        {imageSrc ? <img alt="" className="news-card__image" decoding="async" loading="lazy" src={imageSrc} /> : null}
        <div className="news-card__media-overlay" />
        <div className="news-card__media-top">
          <span className="news-card__badge">{t(formatCategory(item.category))}</span>
          {recentlyUpdated ? <span className="news-card__badge news-card__badge--fresh">{t("Updated Recently")}</span> : null}
        </div>
        <div className="news-card__media-bottom">
          <span>{item.region === "kms" ? t("KMS Update") : t("Official MapleStory")}</span>
        </div>
      </div>

      <div className="news-card__body">
        <div className="news-card__meta">
          <span>{published}</span>
          <span>{t(item.category.replace("-", " "))}</span>
        </div>
        <h3>{td(item.title)}</h3>
        {kmsBrief ? (
          <>
            <p>{td(kmsBrief.summary)}</p>
            <p className="news-card__impact">{td(kmsBrief.impact)}</p>
          </>
        ) : (
          <p>{td(item.summary)}</p>
        )}
        <div className="news-card__actions">
          {onSelect ? (
            <Button onClick={() => onSelect(item)} variant={featured ? "primary" : "ghost"}>
              {t("Read Breakdown")}
            </Button>
          ) : (
            <Button href={item.sourceUrl} variant={featured ? "primary" : "ghost"}>
              {t("Read Original")}
            </Button>
          )}
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

function buildKmsBrief(item: NewsItem) {
  const title = item.title.toLowerCase();
  const summary = shortenKmsText(item.summary);

  if (title.includes("maintenance") || title.includes("patch") || title.includes("update")) {
    return {
      summary,
      impact: "Player impact: expect balance or system changes; review notes before your next run."
    };
  }

  if (title.includes("event")) {
    return {
      summary,
      impact: "Player impact: new rewards or missions likely incoming; plan your weekly routine."
    };
  }

  if (title.includes("cash") || title.includes("shop")) {
    return {
      summary,
      impact: "Player impact: cosmetic or cash-shop changes; check if any limited items fit your build."
    };
  }

  return {
    summary,
    impact: "Player impact: early look at upcoming changes; treat as a preview until GMS release."
  };
}

function shortenKmsText(text: string) {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) {
    return "KMST preview update summarized for quick scanning.";
  }
  if (cleaned.length <= 120) {
    return cleaned;
  }
  return `${cleaned.slice(0, 117).trimEnd()}...`;
}
