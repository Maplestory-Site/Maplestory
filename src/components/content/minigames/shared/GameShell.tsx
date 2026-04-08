import type { ReactNode } from "react";

type GameShellProps = {
  title: string;
  subtitle: string;
  icon: string;
  badge?: string;
  stats?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
};

export function GameShell({ title, subtitle, icon, badge, stats, children, footer }: GameShellProps) {
  return (
    <div className="game-shell">
      <header className="game-shell__header">
        <div className="game-shell__title">
          <span className="game-shell__icon" aria-hidden="true">
            {icon}
          </span>
          <div>
            <strong>{title}</strong>
            <span>{subtitle}</span>
          </div>
        </div>
        {badge ? <span className="game-shell__badge">{badge}</span> : null}
      </header>

      {stats ? <div className="game-shell__stats">{stats}</div> : null}

      <div className="game-shell__body">{children}</div>

      {footer ? <footer className="game-shell__footer">{footer}</footer> : null}
    </div>
  );
}
