import { useEffect, useRef, useState, type ReactNode } from "react";
import { useMiniGamesSound } from "./MiniGamesSound";

type GameShellProps = {
  title: string;
  subtitle: string;
  icon: string;
  badge?: string;
  stats?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  aspectRatio?: string;
};

export function GameShell({
  title,
  subtitle,
  icon,
  badge,
  stats,
  children,
  footer,
  aspectRatio = "16 / 9"
}: GameShellProps) {
  const shellRef = useRef<HTMLDivElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [canFullscreen, setCanFullscreen] = useState(false);
  const [feedback, setFeedback] = useState<"idle" | "success" | "fail">("idle");
  const feedbackTimer = useRef<number | null>(null);
  const { playFailure, playSuccess } = useMiniGamesSound();

  useEffect(() => {
    setCanFullscreen(typeof document !== "undefined" && !!document.documentElement.requestFullscreen);
    const handleChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleChange);
    return () => document.removeEventListener("fullscreenchange", handleChange);
  }, []);

  useEffect(() => {
    const handleFeedback = (event: Event) => {
      if (!(event instanceof CustomEvent) || !event.detail) return;
      if (event.detail.type === "fail") {
        setFeedback("fail");
        playFailure();
      } else if (event.detail.type === "success") {
        setFeedback("success");
        playSuccess();
      } else {
        setFeedback("idle");
        return;
      }
      if (feedbackTimer.current) {
        window.clearTimeout(feedbackTimer.current);
      }
      feedbackTimer.current = window.setTimeout(() => setFeedback("idle"), 420);
    };
    window.addEventListener("mini-game:feedback", handleFeedback);
    return () => {
      window.removeEventListener("mini-game:feedback", handleFeedback);
      if (feedbackTimer.current) {
        window.clearTimeout(feedbackTimer.current);
      }
    };
  }, [playFailure, playSuccess]);

  const toggleFullscreen = async () => {
    if (!canFullscreen || !shellRef.current) return;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await shellRef.current.requestFullscreen();
      }
    } catch {
      // ignore fullscreen failures
    }
  };

  return (
    <div className={`game-shell game-shell--${feedback}`} ref={shellRef}>
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
        <div className="game-shell__header-actions">
          {badge ? <span className="game-shell__badge">{badge}</span> : null}
          {canFullscreen ? (
            <button className="game-shell__fullscreen" type="button" onClick={toggleFullscreen}>
              {isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            </button>
          ) : null}
        </div>
      </header>

      {stats ? <div className="game-shell__stats">{stats}</div> : null}

      <div className="game-shell__body">
        <div className="game-shell__viewport" style={{ ["--game-aspect" as string]: aspectRatio }}>
          <div className="game-shell__viewport-inner">{children}</div>
        </div>
      </div>

      {footer ? <footer className="game-shell__footer">{footer}</footer> : null}
    </div>
  );
}
