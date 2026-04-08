import type { ClassCategory } from "../../data/classesJobs";

type CategoryNavProps = {
  categories: Array<{ label: "All" | ClassCategory; count: number }>;
  selected: "All" | ClassCategory;
  onSelect: (category: "All" | ClassCategory) => void;
};

export function CategoryNav({ categories, selected, onSelect }: CategoryNavProps) {
  return (
    <section className="classes-category-nav reveal-on-scroll">
      {categories.map((category) => (
        <button
          key={category.label}
          type="button"
          className={`classes-category-nav__button${selected === category.label ? " is-active" : ""}`}
          onClick={() => onSelect(category.label)}
        >
          <span>{category.label}</span>
          <strong>{category.count}</strong>
        </button>
      ))}
    </section>
  );
}
