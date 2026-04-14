import type { GameId } from "./gameMeta";

export type RoomPlayer = {
  userId: string;
  username: string;
  score: number | null;
  ready: boolean;
};

export type GameRoom = {
  id: string;
  gameId: GameId;
  status: "lobby" | "running" | "finished";
  players: RoomPlayer[];
};

export async function createRoom(gameId: GameId, userId: string, username: string) {
  const response = await fetch("/api/rooms", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "create", gameId, userId, username })
  });
  if (!response.ok) throw new Error("Failed to create room");
  return (await response.json()) as { room: GameRoom };
}

export async function joinRoom(roomId: string, userId: string, username: string) {
  const response = await fetch("/api/rooms", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "join", roomId, userId, username })
  });
  if (!response.ok) throw new Error("Failed to join room");
  return (await response.json()) as { room: GameRoom };
}

export async function startRoom(roomId: string) {
  const response = await fetch("/api/rooms", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "start", roomId })
  });
  if (!response.ok) throw new Error("Failed to start room");
  return (await response.json()) as { room: GameRoom };
}

export async function updateRoom(roomId: string, userId: string, payload: { score?: number; ready?: boolean }) {
  const response = await fetch("/api/rooms", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "update", roomId, userId, ...payload })
  });
  if (!response.ok) throw new Error("Failed to update room");
  return (await response.json()) as { room: GameRoom };
}

export async function leaveRoom(roomId: string, userId: string) {
  const response = await fetch("/api/rooms", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "leave", roomId, userId })
  });
  if (!response.ok) throw new Error("Failed to leave room");
  return (await response.json()) as { room: GameRoom | null };
}

export async function fetchRoom(roomId: string) {
  const response = await fetch(`/api/rooms?roomId=${encodeURIComponent(roomId)}`);
  if (!response.ok) throw new Error("Failed to fetch room");
  return (await response.json()) as { room: GameRoom | null };
}
