import { Button } from "../ui/Button";
import { useI18n } from "../../i18n/I18nProvider";

type CategoryItem = {
  title: string;
  description: string;
  href: string;
  accent: string;
};

type CategoryCardProps = {
  item: CategoryItem;
};

export function CategoryCard({ item }: CategoryCardProps) {
  const { t, td } = useI18n();

  return (
    <article className={`card category-card category-card--${item.accent}`}>
      <span className="category-card__marker" />
      <h3>{td(item.title)}</h3>
      <p>{td(item.description)}</p>
      <Button href={item.href} variant="ghost">{t("Explore")}</Button>
    </article>
  );
}
