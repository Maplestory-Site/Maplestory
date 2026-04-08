import type { ClassJob } from "../../data/classesJobs";

type ClassCardProps = {
  item: ClassJob;
  onSelect: (item: ClassJob) => void;
};

export function ClassCard({ item, onSelect }: ClassCardProps) {
  return (
    <button type="button" className="class-card reveal-on-scroll" onClick={() => onSelect(item)}>
      <div className="class-card__media">
        <span className="class-card__category">{item.category}</span>
        <div className="class-card__crest">{item.name.slice(0, 2).toUpperCase()}</div>
      </div>
      <div className="class-card__content">
        <div className="class-card__heading">
          <h3>{item.name}</h3>
          <span>{item.difficulty}</span>
        </div>
        <p>{item.shortDescription}</p>
        <div className="class-card__meta">
          <span>{item.playstyle}</span>
          <span>{item.beginnerFriendly ? "Beginner Friendly" : "Higher Skill Ceiling"}</span>
        </div>
        <div className="class-card__tags">
          {item.tags.slice(0, 3).map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
      </div>
    </button>
  );
}
