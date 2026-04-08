type ProgressBarProps = {
  label: string;
  value: string;
  progress: number;
  accent?: "ember" | "gold" | "violet";
};

export function ProgressBar({ label, value, progress, accent = "ember" }: ProgressBarProps) {
  const width = Math.max(0, Math.min(progress, 100));

  return (
    <div className="game-progress">
      <div className="game-progress__meta">
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
      <div className="game-progress__track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={width}>
        <span className={`game-progress__fill game-progress__fill--${accent}`} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}
