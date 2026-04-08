import { useState } from "react";
import type { MiniGameId } from "../../data/miniGames";
import { MiniGamesModal } from "./MiniGamesModal";

export function MiniGamesLauncher() {
  const [open, setOpen] = useState(false);
  const [activeGameId, setActiveGameId] = useState<MiniGameId>("reaction-test");

  return (
    <>
      <div className="mini-games-launcher card" data-reveal>
        <div className="mini-games-launcher__copy">
          <span className="section-header__eyebrow">Train While Waiting</span>
          <h2>A clean bonus while the stream is quiet</h2>
          <p>Quick skill tests for the community. Jump in, play fast, and get back to the next run.</p>
        </div>
        <div className="mini-games-launcher__actions">
          <button
            className="button button--ghost mini-games-launcher__button"
            onClick={() => setOpen(true)}
            type="button"
          >
            Open Mini Games
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
