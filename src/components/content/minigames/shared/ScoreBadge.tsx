import { useEffect, useState } from "react";

type ScoreBadgeProps = {
  label: string;
  value: string | number;
  tone?: "default" | "success" | "danger";
};

export function ScoreBadge({ label, value, tone = "default" }: ScoreBadgeProps) {
  const [isPop, setIsPop] = useState(false);

  useEffect(() => {
    if (value === null || value === undefined) return;
    setIsPop(true);
    const timer = window.setTimeout(() => setIsPop(false), 240);
    return () => window.clearTimeout(timer);
  }, [value]);

  return (
    <div className={`score-badge score-badge--${tone} ${isPop ? "score-badge--pop" : ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
