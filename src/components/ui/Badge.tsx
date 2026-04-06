type BadgeProps = {
  label: string;
  tone?: "default" | "live" | "offline" | "info" | "new";
};

export function Badge({ label, tone = "default" }: BadgeProps) {
  return <span className={`badge badge--${tone}`}>{label}</span>;
}
