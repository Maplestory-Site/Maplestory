import type { CategoryItem } from "../../data/siteContent";
import { Button } from "../ui/Button";

type CategoryCardProps = {
  item: CategoryItem;
};

export function CategoryCard({ item }: CategoryCardProps) {
  return (
    <article className={`card category-card category-card--${item.accent}`}>
      <span className="category-card__marker" />
      <h3>{item.title}</h3>
      <p>{item.description}</p>
      <Button href={item.href} variant="ghost">Explore</Button>
    </article>
  );
}
