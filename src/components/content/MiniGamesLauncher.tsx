import { useMemo, useState } from "react";
import type { MiniGameId } from "../../data/miniGames";
import { miniGames } from "../../data/miniGames";
import { MiniGamesModal } from "./MiniGamesModal";
import { useGameFavorites } from "./minigames/shared/gameFavorites";
import { useI18n } from "../../i18n/I18nProvider";

export function MiniGamesLauncher() {
  const { t, td } = useI18n();
  const [open, setOpen] = useState(false);
  const [activeGameId, setActiveGameId] = useState<MiniGameId>("reaction-test");
  const { favorites } = useGameFavorites();
  const featuredGame = useMemo(() => miniGames.find((game) => game.id === "boss-dodge") ?? miniGames[0], []);
  const favoriteGames = useMemo(() => favorites.map((id) => miniGames.find((game) => game.id === id)).filter(Boolean), [favorites]);

  const openGame = (gameId: MiniGameId) => {
    setActiveGameId(gameId);
    setOpen(true);
  };

  return (
    <>
      <div className="mini-games-launcher card" data-reveal>
        <div className="mini-games-launcher__copy">
          <span className="section-header__eyebrow">{t("Mini Games Hub")}</span>
          <h2>{t("Fast rounds. Clear rules.")}</h2>
          <p>{t("Pick a game and play immediately.")}</p>
        </div>
        <div className="mini-games-launcher__grid">
          <div className="mini-games-launcher__featured">
            <span className="mini-games-launcher__eyebrow">{t("Featured Game")}</span>
            <div className="mini-games-launcher__featured-card">
              <div>
                <strong>{td(featuredGame.title)}</strong>
                <span>{td(featuredGame.description)}</span>
              </div>
              <button className="button button--primary" type="button" onClick={() => openGame(featuredGame.id)}>
                {t("Play Now")}
              </button>
            </div>
          </div>
        </div>

        <div className="mini-games-launcher__sections">
          {favoriteGames.length ? (
            <div className="mini-games-launcher__section">
              <span>{t("Favorites")}</span>
              <div className="mini-games-launcher__section-list">
                {favoriteGames.slice(0, 4).map((game) => (
                  <button key={game!.id} type="button" onClick={() => openGame(game!.id)}>
                    <strong>{td(game!.title)}</strong>
                    <span>{t("Play")}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="mini-games-launcher__cards">
          {miniGames.map((game) => (
            <button key={game.id} type="button" onClick={() => openGame(game.id)}>
              <span className="mini-games-launcher__card-icon">{game.icon}</span>
              <strong>{td(game.title)}</strong>
              <span>{t("Play")}</span>
            </button>
          ))}
        </div>

        <div className="mini-games-launcher__actions">
          <button
            className="button button--ghost mini-games-launcher__button"
            onClick={() => setOpen(true)}
            type="button"
          >
            {t("Open Mini Games")}
          </button>
        </div>
      </div>
      <MiniGamesModal
        activeGameId={activeGameId}
        onClose={() => setOpen(false)}
        onSelectGame={setActiveGameId}
        open={open}
      />
    </>
  );
}
