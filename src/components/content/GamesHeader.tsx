import { useMemo } from "react";
import { getProgressSnapshot } from "./minigames/shared/gameMeta";
import { useGameMeta } from "./minigames/shared/useGameMeta";

type GamesHeaderProps = {
  compact?: boolean;
  className?: string;
};

export function GamesHeader({ compact = false, className = "" }: GamesHeaderProps) {
  const meta = useGameMeta();
  const progress = useMemo(() => getProgressSnapshot(meta), [meta]);

  return (
    <section className={`games-header ${compact ? "games-header--compact" : ""} ${className}`.trim()} aria-label="Player status">
      <div className="games-header__identity">
        <div className="games-header__avatar" aria-hidden="true">
          <img alt="" src="/snailslayer-logo.jpeg" loading="lazy" />
        </div>
        <div className="games-header__identity-copy">
          <span className="games-header__eyebrow">Player Status</span>
          <strong>Level {progress.level}</strong>
        </div>
      </div>

      <div className="games-header__progress">
        <div className="games-header__progress-copy">
          <span>XP Progress</span>
          <strong>{progress.xpForNext} XP to next level</strong>
        </div>
        <div className="games-header__progress-bar" aria-hidden="true">
          <span style={{ width: `${progress.progress}%` }} />
        </div>
      </div>

      <div className="games-header__coins">
        <span className="games-header__coins-icon" aria-hidden="true">
          ●
        </span>
        <div>
          <span>Coins</span>
          <strong>{meta.coins}</strong>
        </div>
      </div>
    </section>
  );
}
