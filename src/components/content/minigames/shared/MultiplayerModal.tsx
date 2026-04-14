import { useEffect, useMemo, useState } from "react";
import type { GameId } from "./gameMeta";
import { useMockAuth } from "../../../../features/profile/MockAuthContext";
import { createRoom, fetchRoom, joinRoom, leaveRoom, startRoom, updateRoom, type GameRoom } from "./multiplayerApi";
import { clearActiveRoomId, getActiveRoomId, setActiveRoomId } from "./multiplayerSession";

type MultiplayerModalProps = {
  open: boolean;
  gameId: GameId;
  onClose: () => void;
};

export function MultiplayerModal({ open, gameId, onClose }: MultiplayerModalProps) {
  const { user, openAuth, isAuthenticated } = useMockAuth();
  const [roomId, setRoomId] = useState("");
  const [room, setRoom] = useState<GameRoom | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isHost = useMemo(() => room?.players?.[0]?.userId === user?.id, [room, user?.id]);
  const self = room?.players.find((player) => player.userId === user?.id);
  const ready = Boolean(self?.ready);

  useEffect(() => {
    if (!open) return;
    const existing = getActiveRoomId();
    if (existing) {
      setRoomId(existing);
      void fetchRoom(existing)
        .then((payload) => setRoom(payload.room))
        .catch(() => undefined);
    }
  }, [open]);

  useEffect(() => {
    if (!open || !roomId) return;
    const interval = window.setInterval(() => {
      void fetchRoom(roomId)
        .then((payload) => {
          if (payload.room) setRoom(payload.room);
        })
        .catch(() => undefined);
    }, 2000);
    return () => window.clearInterval(interval);
  }, [open, roomId]);

  const handleCreate = async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      const payload = await createRoom(gameId, user.id, user.username);
      setRoom(payload.room);
      setRoomId(payload.room.id);
      setActiveRoomId(payload.room.id);
    } catch (err) {
      setError("Failed to create room.");
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!user) return;
    if (!roomId.trim()) {
      setError("Enter a room code.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const payload = await joinRoom(roomId.trim().toUpperCase(), user.id, user.username);
      setRoom(payload.room);
      setRoomId(payload.room.id);
      setActiveRoomId(payload.room.id);
    } catch {
      setError("Room not found or full.");
    } finally {
      setLoading(false);
    }
  };

  const handleReady = async () => {
    if (!room || !user) return;
    await updateRoom(room.id, user.id, { ready: !ready });
  };

  const handleStart = async () => {
    if (!room) return;
    await startRoom(room.id);
  };

  const handleLeave = async () => {
    if (!room || !user) return;
    await leaveRoom(room.id, user.id);
    clearActiveRoomId();
    setRoom(null);
    setRoomId("");
  };

  if (!open) return null;

  if (!isAuthenticated || !user) {
    return (
      <div className="multiplayer-modal" role="dialog" aria-modal="true">
        <button className="multiplayer-modal__backdrop" aria-label="Close multiplayer" onClick={onClose} type="button" />
        <div className="multiplayer-modal__panel">
          <div>
            <span className="section-header__eyebrow">Multiplayer</span>
            <h3>Log in to play together</h3>
            <p>Create a room, invite a friend, and compare scores in real time.</p>
          </div>
          <button className="button button--primary" type="button" onClick={openAuth}>
            Login / Sign up
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="multiplayer-modal" role="dialog" aria-modal="true">
      <button className="multiplayer-modal__backdrop" aria-label="Close multiplayer" onClick={onClose} type="button" />
      <div className="multiplayer-modal__panel">
        <div className="multiplayer-modal__head">
          <div>
            <span className="section-header__eyebrow">Multiplayer</span>
            <h3>1v1 Score Race</h3>
            <p>Create or join a room, then play the same game and compare scores.</p>
          </div>
          <button className="multiplayer-modal__close" onClick={onClose} type="button">
            Close
          </button>
        </div>

        {!room ? (
          <div className="multiplayer-modal__actions">
            <button className="button button--primary" onClick={handleCreate} type="button" disabled={loading}>
              Create Room
            </button>
            <div className="multiplayer-modal__join">
              <input
                placeholder="Room Code"
                value={roomId}
                onChange={(event) => setRoomId(event.target.value)}
                maxLength={6}
              />
              <button className="button button--ghost" onClick={handleJoin} type="button" disabled={loading}>
                Join
              </button>
            </div>
            {error ? <div className="multiplayer-modal__error">{error}</div> : null}
          </div>
        ) : (
          <div className="multiplayer-modal__room">
            <div className="multiplayer-modal__room-head">
              <div>
                <strong>Room Code</strong>
                <span>{room.id}</span>
              </div>
              <div>
                <strong>Status</strong>
                <span>{room.status}</span>
              </div>
            </div>
            <div className="multiplayer-modal__players">
              {room.players.map((player) => (
                <div className={`multiplayer-modal__player ${player.userId === user.id ? "is-self" : ""}`} key={player.userId}>
                  <strong>{player.username}</strong>
                  <span>{player.score ?? "—"} pts</span>
                  <span>{player.ready ? "Ready" : "Not ready"}</span>
                </div>
              ))}
            </div>
            <div className="multiplayer-modal__room-actions">
              <button className="button button--ghost" onClick={handleReady} type="button">
                {ready ? "Unready" : "Ready"}
              </button>
              {isHost ? (
                <button className="button button--primary" onClick={handleStart} type="button" disabled={room.players.length < 2}>
                  Start Match
                </button>
              ) : null}
              <button className="button button--ghost" onClick={handleLeave} type="button">
                Leave
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
