import type { VideoItem } from "../../data/siteContent";
import { inferContentTags } from "../../lib/contentDiscovery";
import { ShareActions } from "./ShareActions";
import { Button } from "../ui/Button";

type VideoCardProps = {
  item: VideoItem;
};

export function VideoCard({ item }: VideoCardProps) {
  const tags = inferContentTags(item).slice(0, 2);

  return (
    <article className={`card video-card ${item.featured ? "video-card--featured" : ""}`}>
      <div className="video-card__thumb" aria-hidden="true">
        {item.thumbnail ? <img alt="" className="video-card__thumb-image" decoding="async" loading="lazy" src={item.thumbnail} /> : null}
        <div className="video-card__thumb-top">
          <span className="video-card__thumb-tag">{item.category}</span>
          {item.featured ? <span className="video-card__thumb-featured">Featured</span> : null}
        </div>
        <span className="video-card__thumb-duration">{item.duration}</span>
        <span className="video-card__thumb-play">Play</span>
      </div>
      <div className="video-card__body">
        <div className="video-card__eyebrow">
          <span>{item.category}</span>
          <span>{item.published}</span>
        </div>
        <h3>{item.title}</h3>
        <p>{item.description}</p>
        {tags.length ? (
          <div className="content-tag-row" aria-label="Video tags">
            {tags.map((tag) => (
              <span className="content-tag-row__tag" key={`${item.id}-${tag}`}>
                {tag}
              </span>
            ))}
          </div>
        ) : null}
        <div className="video-card__meta">
          {item.viewCount ? <span>{item.viewCount} views</span> : null}
          <span>Quick watch</span>
        </div>
        <ShareActions href={item.href} title={item.title} />
        <Button href={item.href} variant="ghost">Watch Video</Button>
      </div>
    </article>
  );
}
