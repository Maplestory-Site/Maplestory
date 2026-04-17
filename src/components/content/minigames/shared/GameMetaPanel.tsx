import { getAchievementLabel, getProgressSnapshot } from "./gameMeta";
import { useGameMeta } from "./useGameMeta";
import { ProgressBar } from "./ProgressBar";
import { useEffect, useMemo, useState } from "react";

const GAME_LABELS: Record<string, string> = {
  "reaction-test": "Reaction Test",
  "maple-training": "Maple Training",
  "boss-dodge": "Boss Dodge"
};

export function GameMetaPanel() {
  const meta = useGameMeta();
  const [showXpGain, setShowXpGain] = useState(false);
  const progress = useMemo(() => getProgressSnapshot(meta), [meta]);

  useEffect(() => {
    if (!meta.lastXpAt || meta.lastXpGain <= 0) return;
    const timeAgo = Date.now() - new Date(meta.lastXpAt).getTime();
    if (timeAgo > 8000) return;
    const showTimer = window.setTimeout(() => setShowXpGain(true), 0);
    const hideTimer = window.setTimeout(() => setShowXpGain(false), 2600);
    return () => {
      window.clearTimeout(showTimer);
      window.clearTimeout(hideTimer);
    };
  }, [meta.lastXpAt, meta.lastXpGain]);

  return (
    <div className="game-meta">
      <div className="game-meta__progress">
        <div className="game-meta__progress-head">
          <span>Player level</span>
          <strong>Level {progress.level}</strong>
          {showXpGain ? <em className="game-meta__xp-gain">+{meta.lastXpGain} XP</em> : null}
        </div>
        <ProgressBar
          label={`XP to level ${progress.level + 1}`}
          value={`${progress.xpForNext} XP`}
          progress={progress.progress}
          accent="gold"
        />
      </div>
      <div className="game-meta__row">
        <div>
          <span>Total plays</span>
          <strong>{meta.totalPlays}</strong>
        </div>
        <div>
          <span>Total score</span>
          <strong>{meta.totalScore}</strong>
        </div>
        <div>
          <span>Best overall</span>
          <strong>{meta.bestScore || 0}</strong>
        </div>
        <div>
          <span>Favorite</span>
          <strong>{meta.favoriteGameId ? GAME_LABELS[meta.favoriteGameId] : "--"}</strong>
        </div>
      </div>
      <div className="game-meta__row game-meta__row--sub">
        <div>
          <span>Last played</span>
          <strong>{meta.lastPlayedGameId ? GAME_LABELS[meta.lastPlayedGameId] : "--"}</strong>
        </div>
        <div>
          <span>Recent</span>
          <strong>{meta.recent.slice(0, 3).map((entry) => GAME_LABELS[entry.gameId]).join(" - ") || "--"}</strong>
        </div>
      </div>
      <div className="game-meta__badges">
        {meta.achievements.length ? (
          meta.achievements.slice(0, 6).map((id) => (
            <span className="game-meta__badge" key={id}>
              {getAchievementLabel(id)}
            </span>
          ))
        ) : (
          <span className="game-meta__badge game-meta__badge--muted">No achievements yet</span>
        )}
      </div>
      {meta.rewardBadges.length || meta.rewardTitles.length || meta.rewardEffects.length ? (
        <div className="game-meta__rewards">
          <span>Unlocked rewards</span>
          <div>
            {meta.rewardBadges.slice(0, 3).map((reward) => (
              <span className="game-meta__badge" key={`badge-${reward}`}>
                {reward}
              </span>
            ))}
            {meta.rewardTitles.slice(0, 2).map((reward) => (
              <span className="game-meta__badge game-meta__badge--title" key={`title-${reward}`}>
                {reward}
              </span>
            ))}
            {meta.rewardEffects.slice(0, 1).map((reward) => (
              <span className="game-meta__badge game-meta__badge--effect" key={`effect-${reward}`}>
                {reward}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
