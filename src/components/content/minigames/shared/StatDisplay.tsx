type StatDisplayProps = {
  label: string;
  value: string | number;
  hint?: string;
};

export function StatDisplay({ label, value, hint }: StatDisplayProps) {
  return (
    <div className="game-stat">
      <span>{label}</span>
      <strong>{value}</strong>
      {hint ? <small>{hint}</small> : null}
    </div>
  );
}
