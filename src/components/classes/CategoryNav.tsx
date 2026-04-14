import { useI18n } from "../../i18n/I18nProvider";

type CategoryNavProps = {
  categories: Array<{ label: string; count: number }>;
  selected: string;
  onSelect: (category: string) => void;
};

export function CategoryNav({ categories, selected, onSelect }: CategoryNavProps) {
  const { t } = useI18n();
  return (
    <section className="classes-category-nav reveal-on-scroll">
      {categories.map((category) => (
        <button
          key={category.label}
          type="button"
          className={`classes-category-nav__button${selected === category.label ? " is-active" : ""}`}
          onClick={() => onSelect(category.label)}
        >
          <span className="classes-category-nav__label">{t(category.label)}</span>
          <strong className="classes-category-nav__count">{category.count}</strong>
        </button>
      ))}
    </section>
  );
}
