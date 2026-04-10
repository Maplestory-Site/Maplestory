type MonsterStatBarProps = {
  label: string;
  value: number;
  max?: number;
  tone?: "hp" | "strength" | "difficulty" | "farm";
};

export function MonsterStatBar({ label, value, max = 100, tone = "strength" }: MonsterStatBarProps) {
  const width = Math.min(100, Math.max(8, (value / max) * 100));

  return (
    <div className="monster-stat-bar">
      <div className="monster-stat-bar__head">
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
      <div className="monster-stat-bar__track">
        <div className={`monster-stat-bar__fill monster-stat-bar__fill--${tone}`} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}
