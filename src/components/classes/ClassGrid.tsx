import type { ClassJob } from "../../data/classesJobs";
import { ClassCard } from "./ClassCard";

type ClassGridProps = {
  items: ClassJob[];
  onSelect: (item: ClassJob) => void;
};

export function ClassGrid({ items, onSelect }: ClassGridProps) {
  return (
    <section className="class-grid">
      {items.map((item) => (
        <ClassCard key={item.id} item={item} onSelect={onSelect} />
      ))}
    </section>
  );
}
