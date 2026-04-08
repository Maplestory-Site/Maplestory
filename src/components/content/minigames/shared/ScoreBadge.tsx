type ScoreBadgeProps = {
  label: string;
  value: string | number;
  tone?: "default" | "success" | "danger";
};

export function ScoreBadge({ label, value, tone = "default" }: ScoreBadgeProps) {
  return (
    <div className={`score-badge score-badge--${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
