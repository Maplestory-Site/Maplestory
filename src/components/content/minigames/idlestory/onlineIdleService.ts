import type {
  IdleGameState,
  LeaderboardCategory,
  LeaderboardEntry,
  ShadowSnapshot,
  WeeklyRankingEntry
} from "./gameEngine";

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

export type SocialGuildMember = {
  userId: string;
  username: string;
  role: "leader" | "member";
  power: number;
  level: number;
  contribution: number;
};

export type SocialGuildRaid = {
  bossName: string;
  maxHp: number;
  hp: number;
  resetAt: string;
  contributors: Array<{ userId: string; username: string; damage: number }>;
};

export type SocialGuild = {
  id: string;
  name: string;
  icon: string;
  level: number;
  xp: number;
  buffs: string[];
  members: SocialGuildMember[];
  raid: SocialGuildRaid;
};

export type SocialSnapshot = {
  leaderboards: Partial<Record<LeaderboardCategory, LeaderboardEntry[]>>;
  currentRanks: Partial<Record<LeaderboardCategory, number | null>>;
  weeklyRanking: WeeklyRankingEntry[];
  weeklyRank: number | null;
  guilds: SocialGuild[];
  currentGuild: SocialGuild | null;
  shadowOpponents: ShadowSnapshot[];
};

const DEFAULT_REQUEST_TIMEOUT_MS = 7000;
const API_WARNING_CACHE = new Set<string>();

type SafeFetchJsonOptions<T> = {
  fallback: T;
  timeoutMs?: number;
} & RequestInit;

type SafeFetchResponse<T> = {
  ok: boolean;
  status: number;
  data: T;
  error: string | null;
};

type ParsedJsonResult<T> = {
  ok: boolean;
  data: T;
  error: string | null;
};

function normalizeNetworkError(error: unknown): string {
  if (error instanceof DOMException && error.name === "AbortError") {
    return "Request timeout";
  }
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }
  return "Network request failed";
}

function isDevRuntime(): boolean {
  return Boolean(import.meta.env?.DEV);
}

function reportApiWarning(url: string, method: string, status: number, error: string) {
  const cacheKey = `${method}:${url}:${status}:${error}`;
  if (API_WARNING_CACHE.has(cacheKey)) return;
  API_WARNING_CACHE.add(cacheKey);

  if (isDevRuntime()) {
    console.warn(`[IdleStory API] ${method} ${url} failed (${status || "network"}): ${error}`);
  }

  if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") {
    window.dispatchEvent(
      new CustomEvent("idlestory:api-warning", {
        detail: { url, method, status, error }
      })
    );
  }
}

async function safeParseJson<T>(response: Response, fallback: T): Promise<ParsedJsonResult<T>> {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return {
      ok: false,
      data: fallback,
      error: `Expected JSON response but received "${contentType || "unknown"}"`
    };
  }
  try {
    return {
      ok: true,
      data: await response.json() as T,
      error: null
    };
  } catch {
    return {
      ok: false,
      data: fallback,
      error: "Failed to parse JSON response"
    };
  }
}

async function safeFetchJson<T>(url: string, options: SafeFetchJsonOptions<T>): Promise<SafeFetchResponse<T>> {
  const {
    fallback,
    timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS,
    signal,
    ...requestInit
  } = options;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const onAbort = () => controller.abort();
  const method = (requestInit.method ?? "GET").toUpperCase();
  if (signal) {
    signal.addEventListener("abort", onAbort, { once: true });
  }

  try {
    const response = await fetch(url, {
      ...requestInit,
      signal: controller.signal
    });
    const parsed = await safeParseJson<T>(response, fallback);
    if (!parsed.ok) {
      const parseError = parsed.error ?? `HTTP ${response.status}`;
      reportApiWarning(url, method, response.status, parseError);
      return {
        ok: false,
        status: response.status,
        data: fallback,
        error: parseError
      };
    }
    if (!response.ok) {
      const statusError = `HTTP ${response.status}`;
      reportApiWarning(url, method, response.status, statusError);
      return {
        ok: false,
        status: response.status,
        data: parsed.data,
        error: statusError
      };
    }
    return {
      ok: true,
      status: response.status,
      data: parsed.data,
      error: null
    };
  } catch (error) {
    const message = normalizeNetworkError(error);
    reportApiWarning(url, method, 0, message);
    return {
      ok: false,
      status: 0,
      data: fallback,
      error: message
    };
  } finally {
    clearTimeout(timeout);
    if (signal) {
      signal.removeEventListener("abort", onAbort);
    }
  }
}

export async function loadIdleCloudSave(userId: string): Promise<IdleCloudSave | null> {
  const response = await safeFetchJson<{ progress?: IdleCloudSave | null }>(
    `/api/progress?userId=${encodeURIComponent(getIdleUserKey(userId))}`,
    { fallback: {} }
  );
  if (!response.ok) return null;
  return response.data.progress ?? null;
}

export async function saveIdleCloudSave(userId: string, state: IdleGameState, score: number): Promise<boolean> {
  if (typeof navigator !== "undefined" && !navigator.onLine) return false;
  const response = await safeFetchJson<Record<string, never>>("/api/progress", {
    fallback: {},
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
  const response = await safeFetchJson<Record<string, never>>("/api/leaderboard", {
    fallback: {},
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, username, gameId: "idlestory-world", score })
  });
  return response.ok;
}

export async function fetchGuilds(): Promise<Guild[]> {
  const response = await safeFetchJson<{ guilds?: Guild[] }>("/api/guilds", { fallback: {} });
  if (!response.ok) return [];
  return response.data.guilds ?? [];
}

export async function createGuild(userId: string, username: string, name: string): Promise<Guild | null> {
  const response = await safeFetchJson<{ guild?: Guild }>("/api/guilds", {
    fallback: {},
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "create", userId, username, name })
  });
  if (!response.ok) return null;
  return response.data.guild ?? null;
}

export async function joinGuild(userId: string, username: string, guildId: string): Promise<Guild | null> {
  const response = await safeFetchJson<{ guild?: Guild }>("/api/guilds", {
    fallback: {},
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "join", userId, username, guildId })
  });
  if (!response.ok) return null;
  return response.data.guild ?? null;
}

export async function fetchGlobalChat(): Promise<ChatMessage[]> {
  const response = await safeFetchJson<{ messages?: ChatMessage[] }>("/api/chat", { fallback: {} });
  if (!response.ok) return [];
  return response.data.messages ?? [];
}

export async function sendGlobalChat(userId: string, username: string, message: string): Promise<boolean> {
  const response = await safeFetchJson<Record<string, never>>("/api/chat", {
    fallback: {},
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, username, message })
  });
  return response.ok;
}

export async function fetchIdleSocialSnapshot(userId: string): Promise<SocialSnapshot | null> {
  const response = await safeFetchJson<SocialSnapshot | null>(
    `/api/social?userId=${encodeURIComponent(userId)}`,
    { fallback: null }
  );
  if (!response.ok) return null;
  return response.data;
}

export async function syncIdleSocialProfile(
  userId: string,
  username: string,
  payload: {
    level: number;
    power: number;
    stage: number;
    bossKills: number;
    goldEarned: number;
    weeklyStage: number;
    weeklyBossClears: number;
    guildId?: string | null;
    guildName?: string | null;
    pvp: { rating: number; wins: number; losses: number };
    shadow: Pick<ShadowSnapshot, "dps" | "hp" | "defense" | "attackSpeed" | "critChance" | "critDamage">;
  }
): Promise<boolean> {
  const response = await safeFetchJson<Record<string, never>>("/api/social", {
    fallback: {},
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "sync",
      userId,
      username,
      profile: payload,
      pvp: payload.pvp,
      shadow: payload.shadow
    })
  });
  return response.ok;
}

export async function createIdleGuild(
  userId: string,
  username: string,
  payload: { name: string; icon: string; power: number; level: number }
): Promise<SocialGuild | null> {
  const response = await safeFetchJson<{ guild?: SocialGuild }>("/api/social", {
    fallback: {},
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "guild-create",
      userId,
      username,
      ...payload
    })
  });
  if (!response.ok) return null;
  return response.data.guild ?? null;
}

export async function joinIdleGuild(
  userId: string,
  username: string,
  payload: { guildId: string; power: number; level: number }
): Promise<SocialGuild | null> {
  const response = await safeFetchJson<{ guild?: SocialGuild }>("/api/social", {
    fallback: {},
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "guild-join",
      userId,
      username,
      ...payload
    })
  });
  if (!response.ok) return null;
  return response.data.guild ?? null;
}

export async function leaveIdleGuild(userId: string, username: string): Promise<boolean> {
  const response = await safeFetchJson<Record<string, never>>("/api/social", {
    fallback: {},
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "guild-leave",
      userId,
      username
    })
  });
  return response.ok;
}

export async function contributeIdleGuildRaid(
  userId: string,
  username: string,
  payload: { guildId: string; damage: number }
): Promise<SocialGuild | null> {
  const response = await safeFetchJson<{ guild?: SocialGuild }>("/api/social", {
    fallback: {},
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "guild-raid",
      userId,
      username,
      ...payload
    })
  });
  if (!response.ok) return null;
  return response.data.guild ?? null;
}

export async function submitIdleShadowBattle(
  userId: string,
  username: string,
  pvp: { rating: number; wins: number; losses: number }
): Promise<boolean> {
  const response = await safeFetchJson<Record<string, never>>("/api/social", {
    fallback: {},
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "shadow-battle",
      userId,
      username,
      pvp
    })
  });
  return response.ok;
}

function getIdleUserKey(userId: string): string {
  return `idlestory-world:${userId}`;
}
