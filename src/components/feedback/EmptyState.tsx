import { Button } from "../ui/Button";

type EmptyStateProps = {
  title: string;
  description: string;
  action?: { label: string; href: string };
};

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="feedback-card">
      <strong>{title}</strong>
      <p>{description}</p>
      {action ? <Button href={action.href} variant="secondary">{action.label}</Button> : null}
    </div>
  );
}
