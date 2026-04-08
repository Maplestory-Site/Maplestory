import { useEffect, useMemo, useRef, type RefObject } from "react";
import { createPortal } from "react-dom";
import type { MiniGameDefinition, MiniGameId } from "../../data/miniGames";
import { miniGames } from "../../data/miniGames";
import { miniGamesRegistry } from "./minigames/miniGamesRegistry";
import { MiniGamesSoundProvider, useMiniGamesSound } from "./minigames/shared/MiniGamesSound";

type MiniGamesModalProps = {
  open: boolean;
  activeGameId: MiniGameId;
  onClose: () => void;
  onSelectGame: (gameId: MiniGameId) => void;
};

export function MiniGamesModal({ open, activeGameId, onClose, onSelectGame }: MiniGamesModalProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);

  const activeGame = useMemo(
    () => miniGames.find((game) => game.id === activeGameId) ?? miniGames[0],
    [activeGameId]
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  const modal = (
    <MiniGamesSoundProvider>
      <MiniGamesModalContent
        activeGame={activeGame}
        onClose={onClose}
        onSelectGame={onSelectGame}
        panelRef={panelRef}
      />
    </MiniGamesSoundProvider>
  );

  if (typeof document === "undefined") {
    return modal;
  }

  return createPortal(modal, document.body);
}

function MiniGamesModalContent({
  activeGame,
  onClose,
  onSelectGame,
  panelRef
}: {
  activeGame: MiniGameDefinition;
  onClose: () => void;
  onSelectGame: (gameId: MiniGameId) => void;
  panelRef: RefObject<HTMLDivElement | null>;
}) {
  const { muted, toggleMuted } = useMiniGamesSound();

  return (
    <div className="mini-games-modal" role="dialog" aria-modal="true" aria-labelledby="mini-games-title">
      <button aria-label="Close mini games" className="mini-games-modal__backdrop" onClick={onClose} type="button" />
      <div className="mini-games-modal__panel" ref={panelRef} tabIndex={-1}>
        <div className="mini-games-modal__header">
          <div className="mini-games-modal__header-copy">
            <span className="section-header__eyebrow">Train While Waiting</span>
            <h2 id="mini-games-title">Quick mini challenges while the stream is offline</h2>
            <p>Mini challenges for the community. Fast rounds. Clean UI. Back to stream in seconds.</p>
          </div>
          <div className="mini-games-modal__header-actions">
            <button
              aria-label={muted ? "Unmute mini games sounds" : "Mute mini games sounds"}
              aria-pressed={!muted}
              className="mini-games-modal__utility"
              onClick={toggleMuted}
              type="button"
            >
              {muted ? "Sound Off" : "Sound On"}
            </button>
            <button aria-label="Close mini games" className="mini-games-modal__close" onClick={onClose} type="button">
              Close
            </button>
          </div>
        </div>

        <div className="mini-games-modal__body">
          <aside className="mini-games-modal__sidebar" aria-label="Mini game selection">
            <div className="mini-games-modal__sidebar-head">
              <span className="mini-games-modal__sidebar-label">Game Library</span>
              <strong>Pick a quick challenge</strong>
              <span>Three compact games built for the wait between runs.</span>
            </div>

            <div className="mini-games-modal__sidebar-list" role="tablist" aria-label="Mini game library">
              {miniGames.map((game) => (
                <MiniGameCard
                  game={game}
                  isActive={game.id === activeGame.id}
                  key={game.id}
                  onSelect={() => onSelectGame(game.id)}
                />
              ))}
            </div>

            <div className="mini-games-modal__sidebar-foot">
              <span>Compact, fast, and built to stay inside the creator world.</span>
            </div>
          </aside>

          <section className="mini-games-modal__play">
            <div className="mini-games-modal__play-head">
              <div className="mini-games-modal__play-meta">
                <span className="mini-games-modal__play-icon">{activeGame.icon}</span>
                <div>
                  <strong>{activeGame.title}</strong>
                  <span>{activeGame.description}</span>
                </div>
              </div>
              <div className="mini-games-modal__play-tags">
                <span className="mini-games-modal__chip">{activeGame.type}</span>
                {activeGame.difficulty ? <span className="mini-games-modal__chip">{activeGame.difficulty}</span> : null}
                <span className="mini-games-modal__chip mini-games-modal__chip--live">Ready to Play</span>
              </div>
            </div>
            <div className="mini-games-modal__canvas">
              <div className="mini-games-modal__canvas-content" key={activeGame.id}>
                {renderGame(activeGame.id)}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function MiniGameCard({
  game,
  isActive,
  onSelect
}: {
  game: MiniGameDefinition;
  isActive: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      aria-pressed={isActive}
      aria-selected={isActive}
      className={`mini-game-card ${isActive ? "is-active" : ""}`}
      onClick={onSelect}
      role="tab"
      type="button"
    >
      <span className="mini-game-card__icon">{game.icon}</span>
      <div className="mini-game-card__copy">
        <strong>{game.title}</strong>
        <span>{game.description}</span>
        <div className="mini-game-card__meta">
          <span>{game.type}</span>
          {game.difficulty ? <span>{game.difficulty}</span> : null}
        </div>
      </div>
      <span className="mini-game-card__action">{isActive ? "Playing" : "Play"}</span>
    </button>
  );
}

function renderGame(gameId: MiniGameId) {
  const GameComponent = miniGamesRegistry[gameId] ?? miniGamesRegistry["reaction-test"];
  return <GameComponent />;
}
