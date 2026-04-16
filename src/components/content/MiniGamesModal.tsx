import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import type { MiniGameDefinition, MiniGameId } from "../../data/miniGames";
import { miniGames } from "../../data/miniGames";
import { miniGamesRegistry } from "./minigames/miniGamesRegistry";
import { GamesHeader } from "./GamesHeader";
import { MiniGamesSoundProvider } from "./minigames/shared/MiniGamesSound";
import { useGameFavorites } from "./minigames/shared/gameFavorites";
import { useGameMeta } from "./minigames/shared/useGameMeta";
import { useI18n } from "../../i18n/I18nProvider";

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
  const { t, td } = useI18n();
  const [isLoading, setIsLoading] = useState(true);
  const meta = useGameMeta();
  const { favorites } = useGameFavorites();
  const featuredGame = useMemo(() => miniGames.find((game) => game.id === "boss-dodge") ?? miniGames[0], []);
  const favoriteGames = useMemo(
    () => favorites.map((id) => miniGames.find((game) => game.id === id)).filter(Boolean) as MiniGameDefinition[],
    [favorites]
  );
  const recentGames = useMemo(
    () =>
      meta.recent
        .map((entry) => miniGames.find((game) => game.id === entry.gameId))
        .filter(Boolean) as MiniGameDefinition[],
    [meta.recent]
  );

  useEffect(() => {
    setIsLoading(true);
    const timer = window.setTimeout(() => setIsLoading(false), 260);
    return () => window.clearTimeout(timer);
  }, [activeGame.id]);

  return (
    <div className="mini-games-modal" role="dialog" aria-modal="true" aria-labelledby="mini-games-title">
      <button aria-label={t("Close mini games")} className="mini-games-modal__backdrop" onClick={onClose} type="button" />
      <div className="mini-games-modal__panel" ref={panelRef} tabIndex={-1}>
        <div className="mini-games-modal__header">
          <div className="mini-games-modal__header-copy">
            <span className="section-header__eyebrow">{t("Mini Games")}</span>
            <h2 id="mini-games-title">{t("Pick a game. Play.")}</h2>
          </div>
          <div className="mini-games-modal__header-actions">
            <button aria-label={t("Close mini games")} className="mini-games-modal__close" onClick={onClose} type="button">
              {t("Close")}
            </button>
          </div>
        </div>

        <div className="mini-games-modal__body">
          <aside className="mini-games-modal__sidebar" aria-label={t("Mini game selection")}>
            <div className="mini-games-modal__sidebar-head">
              <span className="mini-games-modal__sidebar-label">{t("Game Library")}</span>
              <strong>{t("All games")}</strong>
            </div>

            <div className="mini-games-modal__sidebar-section">
              <span>{t("Featured")}</span>
              <div className="mini-games-modal__sidebar-list" role="tablist" aria-label={t("Featured game")}>
                <MiniGameCard
                  game={featuredGame}
                  isActive={featuredGame.id === activeGame.id}
                  key={featuredGame.id}
                  onSelect={() => onSelectGame(featuredGame.id)}
                />
              </div>
            </div>

            {favoriteGames.length ? (
              <div className="mini-games-modal__sidebar-section">
                <span>{t("Favorites")}</span>
                <div className="mini-games-modal__sidebar-list" role="tablist" aria-label={t("Favorite games")}>
                  {favoriteGames.map((game) => (
                    <MiniGameCard
                      game={game}
                      isActive={game.id === activeGame.id}
                      key={game.id}
                      onSelect={() => onSelectGame(game.id)}
                    />
                  ))}
                </div>
              </div>
            ) : null}

            {recentGames.length ? (
              <div className="mini-games-modal__sidebar-section">
                <span>{t("Recently Played")}</span>
                <div className="mini-games-modal__sidebar-list" role="tablist" aria-label={t("Recently played games")}>
                  {recentGames.map((game) => (
                    <MiniGameCard
                      game={game}
                      isActive={game.id === activeGame.id}
                      key={game.id}
                      onSelect={() => onSelectGame(game.id)}
                    />
                  ))}
                </div>
              </div>
            ) : null}

            <div className="mini-games-modal__sidebar-section">
              <span>{t("All Games")}</span>
              <div className="mini-games-modal__sidebar-list" role="tablist" aria-label={t("Mini game library")}>
                {miniGames.map((game) => (
                  <MiniGameCard
                    game={game}
                    isActive={game.id === activeGame.id}
                    key={game.id}
                    onSelect={() => onSelectGame(game.id)}
                  />
                ))}
              </div>
            </div>

          </aside>

          <section className="mini-games-modal__play">
            <div className="mini-games-modal__play-head">
              <div className="mini-games-modal__play-meta">
                <span className="mini-games-modal__play-icon">{activeGame.icon}</span>
                <div>
                  <strong>{td(activeGame.title)}</strong>
                  <span>{td(activeGame.description)}</span>
                </div>
              </div>
            </div>
            <GamesHeader compact className="mini-games-modal__games-header" />
            <div className={`mini-games-modal__canvas ${isLoading ? "is-loading" : ""}`}>
              <div className="mini-games-modal__canvas-content" key={activeGame.id}>
                {renderGame(activeGame.id)}
              </div>
              {isLoading ? <div className="mini-games-modal__canvas-loading" aria-hidden="true" /> : null}
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
  const { t, td } = useI18n();

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
        <strong>{td(game.title)}</strong>
      </div>
      <span className="mini-game-card__action">{isActive ? t("Playing") : t("Play")}</span>
    </button>
  );
}

function renderGame(gameId: MiniGameId) {
  const GameComponent = miniGamesRegistry[gameId] ?? miniGamesRegistry["reaction-test"];
  return <GameComponent />;
}
