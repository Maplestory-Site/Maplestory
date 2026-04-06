import type { VideoItem } from "../../data/siteContent";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";

type VideoCardProps = {
  item: VideoItem;
};

export function VideoCard({ item }: VideoCardProps) {
  return (
    <article className={`card video-card ${item.featured ? "video-card--featured" : ""}`}>
      <div
        className="video-card__thumb"
        aria-hidden="true"
        style={item.thumbnail ? { backgroundImage: `linear-gradient(180deg, rgba(33, 42, 58, 0.08), rgba(33, 42, 58, 0.26)), url("${item.thumbnail}")` } : undefined}
      >
        <span>{item.category}</span>
      </div>
      <div className="video-card__body">
        <Badge label={item.category} tone="info" />
        <h3>{item.title}</h3>
        <p>{item.description}</p>
        <div className="video-card__meta">
          <span>{item.duration}</span>
          <span>{item.published}</span>
          {item.viewCount ? <span>{item.viewCount} views</span> : null}
        </div>
        <Button href={item.href} variant="ghost">Watch on YouTube</Button>
      </div>
    </article>
  );
}
