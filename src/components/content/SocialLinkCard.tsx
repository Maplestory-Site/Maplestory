import type { SocialItem } from "../../data/siteContent";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { useI18n } from "../../i18n/I18nProvider";

type SocialLinkCardProps = {
  item: SocialItem;
};

export function SocialLinkCard({ item }: SocialLinkCardProps) {
  const { td } = useI18n();

  return (
    <article className="card social-card">
      <div className="social-card__top">
        <div className="social-card__icon" aria-hidden="true">{item.platform.slice(0, 1)}</div>
        {item.badge ? <Badge label={td(item.badge)} tone="info" /> : null}
      </div>
      <h3>{td(item.title)}</h3>
      <p>{td(item.description)}</p>
      <Button href={item.href} variant={item.platform === "Discord" ? "primary" : "secondary"}>{td(item.ctaLabel)}</Button>
    </article>
  );
}
