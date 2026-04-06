import { Button } from "./Button";

type SectionHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: { label: string; href: string };
  centered?: boolean;
};

export function SectionHeader({ eyebrow, title, description, action, centered = false }: SectionHeaderProps) {
  return (
    <div className={`section-header ${centered ? "section-header--centered" : ""}`}>
      <div>
        {eyebrow ? <span className="section-header__eyebrow">{eyebrow}</span> : null}
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
      </div>
      {action ? <Button href={action.href} variant="ghost">{action.label}</Button> : null}
    </div>
  );
}
