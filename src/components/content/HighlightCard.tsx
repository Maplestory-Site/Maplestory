import type { HighlightItem } from "../../data/siteContent";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";

type HighlightCardProps = {
  item: HighlightItem;
};

export function HighlightCard({ item }: HighlightCardProps) {
  return (
    <article className={`card highlight-card ${item.featured ? "highlight-card--featured" : ""}`}>
      <div className="highlight-card__media" aria-hidden="true" />
      <div className="highlight-card__body">
        <Badge label={item.label} tone="new" />
        <h3>{item.title}</h3>
        <div className="highlight-card__meta">
          <span>{item.duration}</span>
          <span>Clip</span>
        </div>
        <Button href={item.href} variant="ghost">Play Clip</Button>
      </div>
    </article>
  );
}
