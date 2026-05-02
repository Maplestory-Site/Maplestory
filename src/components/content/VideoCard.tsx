import type { VideoItem } from "../../data/siteContent";
import { getVideoDisplayDescription, inferContentTags, inferDisplayCategory } from "../../lib/contentDiscovery";
import { ShareActions } from "./ShareActions";
import { Button } from "../ui/Button";
import { useI18n } from "../../i18n/I18nProvider";

type VideoCardProps = {
  item: VideoItem;
};

export function VideoCard({ item }: VideoCardProps) {
  const { t, td } = useI18n();
  const displayCategory = inferDisplayCategory(item);
  const displayDescription = getVideoDisplayDescription(item);
  const tags = inferContentTags({ ...item, category: displayCategory, description: displayDescription }).slice(0, 2);
  const durationLabel = item.duration?.trim();

  return (
    <article className={`card video-card ${item.featured ? "video-card--featured" : ""}`}>
      <div className="video-card__thumb" aria-hidden="true">
        {item.thumbnail ? <img alt="" className="video-card__thumb-image" decoding="async" loading="lazy" src={item.thumbnail} /> : null}
        <div className="video-card__thumb-top">
          <span className="video-card__thumb-tag">{td(displayCategory)}</span>
          {item.featured ? <span className="video-card__thumb-featured">{t("Featured")}</span> : null}
        </div>
        {durationLabel ? <span className="video-card__thumb-duration">⏱ {durationLabel}</span> : null}
        <span className="video-card__thumb-play">{t("Play")}</span>
      </div>
      <div className="video-card__body">
        <div className="video-card__eyebrow">
          <span>{td(displayCategory)}</span>
          <span>{item.published}</span>
        </div>
        <h3>{td(item.title)}</h3>
        <p>{td(displayDescription)}</p>
        {tags.length ? (
          <div className="content-tag-row" aria-label={t("Video tags")}>
            {tags.map((tag) => (
              <span className="content-tag-row__tag" key={`${item.id}-${tag}`}>
                {td(tag)}
              </span>
            ))}
          </div>
        ) : null}
        <div className="video-card__meta">
          {item.viewCount ? <span>{td(`${item.viewCount} views`)}</span> : null}
          <span>{t("Quick watch")}</span>
        </div>
        <ShareActions href={item.href} title={item.title} />
        <Button href={item.href} variant="ghost">{t("Watch Video")}</Button>
      </div>
    </article>
  );
}
