import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { ShareActions } from "./ShareActions";
import { inferContentTags } from "../../lib/contentDiscovery";

type HighlightItem = {
  title: string;
  label: string;
  duration: string;
  href: string;
  thumbnail?: string;
  note?: string;
  ctaLabel?: string;
  featured?: boolean;
};

type HighlightCardProps = {
  item: HighlightItem;
};

export function HighlightCard({ item }: HighlightCardProps) {
  const tags = inferContentTags({
    category: item.label,
    title: item.title,
    description: item.note || "",
    tags: item.label ? [item.label] : undefined
  }).slice(0, 2);

  return (
    <article className={`card highlight-card ${item.featured ? "highlight-card--featured" : ""}`}>
      <div className="highlight-card__media" aria-hidden="true">
        {item.thumbnail ? (
          <img
            alt=""
            className="highlight-card__media-image"
            decoding="async"
            loading="lazy"
            src={item.thumbnail}
          />
        ) : null}
        <span className="highlight-card__play">Clip</span>
      </div>
      <div className="highlight-card__body">
        <Badge label={item.label} tone="new" />
        <h3>{item.title}</h3>
        {item.note ? <p>{item.note}</p> : null}
        {tags.length ? (
          <div className="content-tag-row" aria-label="Clip tags">
            {tags.map((tag) => (
              <span className="content-tag-row__tag" key={`${item.href}-${tag}`}>
                {tag}
              </span>
            ))}
          </div>
        ) : null}
        <div className="highlight-card__meta">
          <span>{item.duration}</span>
          <span>Clip</span>
        </div>
        <ShareActions href={item.href} title={item.title} />
        <Button href={item.href} variant={item.featured ? "secondary" : "ghost"}>{item.ctaLabel || "Play Clip"}</Button>
      </div>
    </article>
  );
}
