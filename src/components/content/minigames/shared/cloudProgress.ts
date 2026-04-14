import type { UserProgress } from "./gameMeta";

const OUTBOX_KEY = "snailslayer-progress-outbox";

type OutboxPayload = {
  userId: string;
  progress: UserProgress;
  at: string;
};

function readOutbox(): OutboxPayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(OUTBOX_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as OutboxPayload;
  } catch {
    return null;
  }
}

function writeOutbox(payload: OutboxPayload | null) {
  if (typeof window === "undefined") return;
  if (!payload) {
    window.localStorage.removeItem(OUTBOX_KEY);
    return;
  }
  window.localStorage.setItem(OUTBOX_KEY, JSON.stringify(payload));
}

export async function loadCloudProgress(userId: string) {
  const response = await fetch(`/api/progress?userId=${encodeURIComponent(userId)}`, {
    method: "GET"
  });

  if (!response.ok) {
    throw new Error("Cloud progress unavailable");
  }

  return (await response.json()) as { progress: UserProgress | null };
}

export async function saveCloudProgress(userId: string, progress: UserProgress) {
  if (typeof window !== "undefined" && !navigator.onLine) {
    writeOutbox({ userId, progress, at: new Date().toISOString() });
    return false;
  }

  try {
    const response = await fetch("/api/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, progress })
    });
    if (!response.ok) {
      writeOutbox({ userId, progress, at: new Date().toISOString() });
      return false;
    }
    writeOutbox(null);
    return true;
  } catch {
    writeOutbox({ userId, progress, at: new Date().toISOString() });
    return false;
  }
}

export async function flushOutbox(userId: string) {
  const pending = readOutbox();
  if (!pending || pending.userId !== userId) return false;
  return saveCloudProgress(userId, pending.progress);
}

export async function submitLeaderboardScore(payload: { userId: string; username: string; gameId: string; score: number }) {
  if (typeof window !== "undefined" && !navigator.onLine) {
    return false;
  }
  try {
    const response = await fetch("/api/leaderboard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    return response.ok;
  } catch {
    return false;
  }
}
