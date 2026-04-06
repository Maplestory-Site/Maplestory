import type { SocialItem } from "../../data/siteContent";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";

type SocialLinkCardProps = {
  item: SocialItem;
};

export function SocialLinkCard({ item }: SocialLinkCardProps) {
  return (
    <article className="card social-card">
      <div className="social-card__top">
        <div className="social-card__icon" aria-hidden="true">{item.platform.slice(0, 1)}</div>
        {item.badge ? <Badge label={item.badge} tone="info" /> : null}
      </div>
      <h3>{item.title}</h3>
      <p>{item.description}</p>
      <Button href={item.href} variant={item.platform === "Discord" ? "primary" : "secondary"}>{item.ctaLabel}</Button>
    </article>
  );
}
