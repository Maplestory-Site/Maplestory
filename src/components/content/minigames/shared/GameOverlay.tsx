import type { ReactNode } from "react";

type GameOverlayProps = {
  title: string;
  description?: string;
  helper?: string;
  actions?: ReactNode;
  tone?: "default" | "danger" | "success";
  visible: boolean;
};

export function GameOverlay({ title, description, helper, actions, tone = "default", visible }: GameOverlayProps) {
  if (!visible) {
    return null;
  }

  return (
    <div className="game-overlay" role="presentation">
      <div className={`game-overlay__panel game-overlay__panel--${tone}`}>
        <h3 className="game-overlay__title">{title}</h3>
        {description ? <p>{description}</p> : null}
        {helper ? <span className="game-overlay__helper">{helper}</span> : null}
        {actions ? <div className="game-overlay__actions">{actions}</div> : null}
      </div>
    </div>
  );
}
