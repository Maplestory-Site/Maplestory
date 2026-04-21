import type { IdleGameState } from "./gameEngine";

export type OnlineUser = {
  id: string;
  username: string;
  email: string;
  createdAt: string;
};

export type Guild = {
  id: string;
  name: string;
  ownerId: string;
  members: Array<{ userId: string; username: string }>;
};

export type ChatMessage = {
  id: string;
  userId: string;
  username: string;
  message: string;
  createdAt: string;
};

export type IdleCloudSave = {
  gameId: "idlestory-world";
  state: IdleGameState;
  score: number;
  updatedAt?: string;
};

export async function loadIdleCloudSave(userId: string): Promise<IdleCloudSave | null> {
  const response = await fetch(`/api/progress?userId=${encodeURIComponent(getIdleUserKey(userId))}`);
  if (!response.ok) return null;
  const payload = await response.json() as { progress?: IdleCloudSave | null };
  return payload.progress ?? null;
}

export async function saveIdleCloudSave(userId: string, state: IdleGameState, score: number): Promise<boolean> {
  if (typeof navigator !== "undefined" && !navigator.onLine) return false;
  const response = await fetch("/api/progress", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId: getIdleUserKey(userId),
      progress: { gameId: "idlestory-world", state, score }
    })
  });
  return response.ok;
}

export async function submitIdleLeaderboard(userId: string, username: string, score: number): Promise<boolean> {
  const response = await fetch("/api/leaderboard", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, username, gameId: "idlestory-world", score })
  });
  return response.ok;
}

export async function fetchGuilds(): Promise<Guild[]> {
  const response = await fetch("/api/guilds");
  if (!response.ok) return [];
  const payload = await response.json() as { guilds?: Guild[] };
  return payload.guilds ?? [];
}

export async function createGuild(userId: string, username: string, name: string): Promise<Guild | null> {
  const response = await fetch("/api/guilds", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "create", userId, username, name })
  });
  if (!response.ok) return null;
  const payload = await response.json() as { guild?: Guild };
  return payload.guild ?? null;
}

export async function joinGuild(userId: string, username: string, guildId: string): Promise<Guild | null> {
  const response = await fetch("/api/guilds", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "join", userId, username, guildId })
  });
  if (!response.ok) return null;
  const payload = await response.json() as { guild?: Guild };
  return payload.guild ?? null;
}

export async function fetchGlobalChat(): Promise<ChatMessage[]> {
  const response = await fetch("/api/chat");
  if (!response.ok) return [];
  const payload = await response.json() as { messages?: ChatMessage[] };
  return payload.messages ?? [];
}

export async function sendGlobalChat(userId: string, username: string, message: string): Promise<boolean> {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, username, message })
  });
  return response.ok;
}

function getIdleUserKey(userId: string): string {
  return `idlestory-world:${userId}`;
}
