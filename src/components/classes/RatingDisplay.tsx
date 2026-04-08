type RatingDisplayProps = {
  label: string;
  value: number;
};

export function RatingDisplay({ label, value }: RatingDisplayProps) {
  return (
    <div className="rating-display">
      <div className="rating-display__row">
        <span>{label}</span>
        <strong>{value}/5</strong>
      </div>
      <div className="rating-display__track">
        <div className="rating-display__fill" style={{ width: `${(value / 5) * 100}%` }} />
      </div>
    </div>
  );
}
