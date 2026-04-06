type LoadingStateProps = {
  label?: string;
};

export function LoadingState({ label = "Loading section" }: LoadingStateProps) {
  return (
    <div aria-busy="true" className="loading-card">
      <div className="loading-card__bar" />
      <div className="loading-card__bar loading-card__bar--short" />
      <span>{label}</span>
    </div>
  );
}
