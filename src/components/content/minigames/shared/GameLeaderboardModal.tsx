import { useEffect, useState } from "react";
import { useMockAuth } from "../../../../features/profile/MockAuthContext";

type LeaderboardEntry = {
  userId: string;
  username: string;
  score: number;
};

type LeaderboardPayload = {
  entries: LeaderboardEntry[];
  userRank?: number;
};

export function GameLeaderboardModal({
  gameId,
  open,
  onClose
}: {
  gameId: string;
  open: boolean;
  onClose: () => void;
}) {
  const { user } = useMockAuth();
  const [payload, setPayload] = useState<LeaderboardPayload | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    const loadingTimer = window.setTimeout(() => setLoading(true), 0);
    fetch(`/api/leaderboard?gameId=${encodeURIComponent(gameId)}&userId=${encodeURIComponent(user?.id ?? "")}`)
      .then((res) => res.json())
      .then((data) => setPayload(data))
      .catch(() => setPayload({ entries: [], userRank: undefined }))
      .finally(() => {
        window.clearTimeout(loadingTimer);
        setLoading(false);
      });
    return () => window.clearTimeout(loadingTimer);
  }, [gameId, open, user?.id]);

  if (!open) return null;

  return (
    <div className="leaderboard-modal" role="dialog" aria-modal="true" aria-labelledby="leaderboard-title">
      <button className="leaderboard-modal__backdrop" aria-label="Close leaderboard" onClick={onClose} type="button" />
      <div className="leaderboard-modal__panel">
        <div className="leaderboard-modal__head">
          <div>
            <span className="section-header__eyebrow">Global Leaderboard</span>
            <h3 id="leaderboard-title">Top scores</h3>
            <p>Best runs from the entire Snailslayer arcade.</p>
          </div>
          <button className="leaderboard-modal__close" onClick={onClose} type="button">
            Close
          </button>
        </div>

        <div className="leaderboard-modal__body">
          {loading ? <div className="leaderboard-modal__empty">Loading leaderboard…</div> : null}
          {!loading && payload?.entries.length ? (
            <div className="leaderboard-modal__list">
              {payload.entries.map((entry, index) => (
                <div
                  className={`leaderboard-modal__row ${entry.userId === user?.id ? "is-self" : ""}`}
                  key={`${entry.userId}-${index}`}
                >
                  <span className="leaderboard-modal__rank">#{index + 1}</span>
                  <div className="leaderboard-modal__copy">
                    <strong>{entry.username}</strong>
                    <small>{entry.score} pts</small>
                  </div>
                  {index < 3 ? <span className="leaderboard-modal__trophy">★</span> : null}
                </div>
              ))}
            </div>
          ) : null}
          {!loading && !payload?.entries.length ? (
            <div className="leaderboard-modal__empty">No scores yet. Be the first to set a record.</div>
          ) : null}
        </div>

        <div className="leaderboard-modal__foot">
          {user ? (
            <span>Your rank: {payload?.userRank ? `#${payload.userRank}` : "Unranked"}</span>
          ) : (
            <span>Log in to see your rank.</span>
          )}
        </div>
      </div>
    </div>
  );
}
