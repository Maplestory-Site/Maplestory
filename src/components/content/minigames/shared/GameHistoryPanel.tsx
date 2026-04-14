import { useMemo } from "react";
import { useGameMeta } from "./useGameMeta";

const GAME_LABELS: Record<string, string> = {
  "reaction-test": "Reaction Test",
  "maple-training": "Maple Training",
  "boss-dodge": "Boss Dodge"
};

export function GameHistoryPanel() {
  const meta = useGameMeta();

  const topRuns = useMemo(
    () =>
      meta.runs
        .slice()
        .sort((a, b) => b.score - a.score)
        .slice(0, 5),
    [meta.runs]
  );

  return (
    <div className="game-history">
      <div className="game-history__section">
        <span>Top runs</span>
        <div className="game-history__list">
          {topRuns.length ? (
            topRuns.map((run, index) => (
              <div className="game-history__item" key={`${run.gameId}-${run.at}-${index}`}>
                <strong>{GAME_LABELS[run.gameId]}</strong>
                <span>{run.score}</span>
              </div>
            ))
          ) : (
            <div className="game-history__empty">No runs yet</div>
          )}
        </div>
      </div>
      <div className="game-history__section">
        <span>Recent runs</span>
        <div className="game-history__list">
          {meta.recent.length ? (
            meta.recent.map((run, index) => (
              <div className="game-history__item" key={`${run.gameId}-${run.at}-${index}`}>
                <strong>{GAME_LABELS[run.gameId]}</strong>
                <span>{run.score}</span>
              </div>
            ))
          ) : (
            <div className="game-history__empty">Play a game to log history</div>
          )}
        </div>
      </div>
      <div className="game-history__section game-history__section--best">
        <span>Best by game</span>
        <div className="game-history__list">
          {Object.entries(meta.gameBest).map(([gameId, score]) => (
            <div className="game-history__item" key={gameId}>
              <strong>{GAME_LABELS[gameId]}</strong>
              <span>{score}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
