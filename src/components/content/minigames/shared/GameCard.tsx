import type { HTMLAttributes, ReactNode } from "react";

type GameCardProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  tone?: "default" | "highlight" | "muted";
};

export function GameCard({
  children,
  className = "",
  tone = "default",
  ...props
}: GameCardProps) {
  return (
    <div className={`game-card game-card--${tone} ${className}`.trim()} {...props}>
      {children}
    </div>
  );
}
