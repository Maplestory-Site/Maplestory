import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { applyUserProgress, extractUserProgress, loadGameMeta, type UserProgress } from "../../components/content/minigames/shared/gameMeta";
import { flushOutbox, loadCloudProgress, saveCloudProgress, submitLeaderboardScore } from "../../components/content/minigames/shared/cloudProgress";
import { getActiveRoomId } from "../../components/content/minigames/shared/multiplayerSession";
import { updateRoom } from "../../components/content/minigames/shared/multiplayerApi";
import { loginCloudAccount, signupCloudAccount } from "../../components/content/minigames/shared/onlineAccounts";

/**
 * MockAuthContext — demo / offline auth surface.
 *
 * Security note: this context NEVER stores plaintext passwords in
 * `localStorage`. The cached profile only carries metadata + an opaque
 * session token (when the cloud signs one). Authentication is delegated to
 * the cloud handler at /api/auth, which now uses scrypt + HMAC session
 * tokens — see `server/security/passwords.mjs` and
 * `server/security/sessionToken.mjs`.
 */
type MockUser = {
  id: string;
  username: string;
  name: string;
  email: string;
  avatarLabel: string;
  createdAt: string;
  xp: number;
  level: number;
  coins: number;
  ownedItems: string[];
  highScores: UserProgress["highScores"];
};

type LoginPayload = {
  email: string;
  password: string;
};

type MockAuthContextValue = {
  user: MockUser | null;
  isAuthenticated: boolean;
  authOpen: boolean;
  openAuth: () => void;
  closeAuth: () => void;
  login: (payload: LoginPayload) => Promise<boolean>;
  signup: (payload: { username: string; email: string; password: string }) => Promise<boolean>;
  logout: () => void;
};

type StoredSession = {
  userId: string;
  token?: string;
};

const STORAGE_KEY = "snailslayer-accounts";
const SESSION_KEY = "snailslayer-session";

const MockAuthContext = createContext<MockAuthContextValue | null>(null);

/**
 * Strip any password-shaped fields from a stored record. Migrates old saves
 * that may still carry a `password` field from the previous implementation.
 */
function sanitizeStoredUser(value: unknown): MockUser | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (typeof record.id !== "string" || typeof record.username !== "string") return null;
  return {
    id: record.id,
    username: record.username,
    name: typeof record.name === "string" ? record.name : record.username,
    email: typeof record.email === "string" ? record.email : "",
    avatarLabel: typeof record.avatarLabel === "string" ? record.avatarLabel : record.username.slice(0, 1).toUpperCase(),
    createdAt: typeof record.createdAt === "string" ? record.createdAt : new Date().toISOString(),
    xp: typeof record.xp === "number" ? record.xp : 0,
    level: typeof record.level === "number" ? record.level : 1,
    coins: typeof record.coins === "number" ? record.coins : 0,
    ownedItems: Array.isArray(record.ownedItems) ? (record.ownedItems as string[]) : [],
    highScores: (record.highScores as UserProgress["highScores"]) ?? ({} as UserProgress["highScores"])
  };
}

function readInitialUser(): MockUser | null {
  if (typeof window === "undefined") return null;
  try {
    const session = window.localStorage.getItem(SESSION_KEY);
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved || !session) return null;
    const parsed = JSON.parse(saved) as unknown[];
    const sessionId = JSON.parse(session) as StoredSession;
    const list = (Array.isArray(parsed) ? parsed : [])
      .map(sanitizeStoredUser)
      .filter((entry): entry is MockUser => entry !== null);
    return list.find((entry) => entry.id === sessionId.userId) || null;
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    window.localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

export function MockAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<MockUser | null>(readInitialUser);
  const [authOpen, setAuthOpen] = useState(false);

  // Apply persisted progress on initial mount
  useEffect(() => {
    if (user) {
      applyUserProgress(extractUserProgress(user));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function persistUser(nextUser: MockUser, token?: string) {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    let parsed: unknown[] = [];
    try {
      parsed = stored ? (JSON.parse(stored) as unknown[]) : [];
    } catch {
      parsed = [];
    }
    const list = (Array.isArray(parsed) ? parsed : [])
      .map(sanitizeStoredUser)
      .filter((entry): entry is MockUser => entry !== null && entry.id !== nextUser.id);
    list.push(nextUser);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    const existing = (() => {
      try {
        const raw = window.localStorage.getItem(SESSION_KEY);
        return raw ? (JSON.parse(raw) as StoredSession) : null;
      } catch {
        return null;
      }
    })();
    window.localStorage.setItem(SESSION_KEY, JSON.stringify({ userId: nextUser.id, token: token ?? existing?.token }));
  }

  async function login({ email, password }: LoginPayload) {
    // The local profile cache no longer stores passwords, so authentication
    // is always delegated to the cloud handler. If cloud rejects the
    // credentials we fail closed.
    try {
      const auth = await loginCloudAccount({ email, password });
      if (!auth) return false;
      const cloudUser = auth.user;
      const stored = window.localStorage.getItem(STORAGE_KEY);
      let cachedProfile: MockUser | null = null;
      try {
        const parsed = stored ? (JSON.parse(stored) as unknown[]) : [];
        cachedProfile = (Array.isArray(parsed) ? parsed : [])
          .map(sanitizeStoredUser)
          .find((entry): entry is MockUser => entry !== null && entry.id === cloudUser.id) ?? null;
      } catch {
        cachedProfile = null;
      }
      const progress = cachedProfile
        ? extractUserProgress(cachedProfile)
        : extractUserProgress({ xp: 0, level: 1, highScores: {} as UserProgress["highScores"] } as MockUser);
      const nextUser: MockUser = {
        id: cloudUser.id,
        username: cloudUser.username,
        name: cloudUser.username,
        email: cloudUser.email,
        avatarLabel: cloudUser.username.slice(0, 1).toUpperCase(),
        createdAt: cloudUser.createdAt,
        xp: progress.xp,
        level: progress.level,
        coins: progress.coins,
        ownedItems: progress.ownedItems ?? [],
        highScores: progress.highScores
      };
      setUser(nextUser);
      setAuthOpen(false);
      persistUser(nextUser, auth.token);
      applyUserProgress(progress);
      void loadCloudProgress(nextUser.id)
        .then((payload) => {
          if (payload.progress) {
            applyUserProgress(payload.progress);
          }
        })
        .finally(() => {
          void flushOutbox(nextUser.id);
        });
      return true;
    } catch {
      return false;
    }
  }

  async function signup({ username, email, password }: { username: string; email: string; password: string }) {
    const safeName = username.trim() || "Maple Player";
    const safeEmail = email.trim().toLowerCase() || "player@maple.world";
    const auth = await signupCloudAccount({ username: safeName, email: safeEmail, password });
    if (!auth) return false;
    const cloudUser = auth.user;
    const progress = extractUserProgress({ xp: 0, level: 1, highScores: {} as UserProgress["highScores"] } as MockUser);
    const nextUser: MockUser = {
      id: cloudUser.id,
      username: safeName,
      name: safeName,
      email: safeEmail,
      avatarLabel: safeName.slice(0, 1).toUpperCase(),
      createdAt: cloudUser.createdAt ?? new Date().toISOString(),
      xp: progress.xp,
      level: progress.level,
      coins: progress.coins,
      ownedItems: progress.ownedItems ?? [],
      highScores: progress.highScores
    };
    setUser(nextUser);
    setAuthOpen(false);
    persistUser(nextUser, auth.token);
    applyUserProgress(progress);
    void saveCloudProgress(nextUser.id, progress);
    return true;
  }

  function logout() {
    setUser(null);
    window.localStorage.removeItem(SESSION_KEY);
  }

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!user) return;
    const handleUpdate = () => {
      const progress = extractUserProgress(loadGameMeta());
      const updatedUser = {
        ...user,
        xp: progress.xp,
        level: progress.level,
        coins: progress.coins,
        ownedItems: progress.ownedItems ?? [],
        highScores: progress.highScores
      };
      setUser(updatedUser);
      persistUser(updatedUser);
      void saveCloudProgress(updatedUser.id, progress);
    };
    window.addEventListener("mini-games-meta:update", handleUpdate);
    return () => window.removeEventListener("mini-games-meta:update", handleUpdate);
  }, [user]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!user) return;
    const handleResult = (event: Event) => {
      if (!(event instanceof CustomEvent) || !event.detail) return;
      const { gameId, score } = event.detail as { gameId: string; score: number };
      if (!gameId || score === undefined) return;
      void submitLeaderboardScore({ userId: user.id, username: user.username, gameId, score });
      const roomId = getActiveRoomId();
      if (roomId) {
        void updateRoom(roomId, user.id, { score });
      }
    };
    window.addEventListener("mini-game:result", handleResult);
    return () => window.removeEventListener("mini-game:result", handleResult);
  }, [user]);

  const value = useMemo<MockAuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      authOpen,
      openAuth: () => setAuthOpen(true),
      closeAuth: () => setAuthOpen(false),
      login,
      signup,
      logout
    }),
    [authOpen, user]
  );

  return <MockAuthContext.Provider value={value}>{children}</MockAuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useMockAuth() {
  const context = useContext(MockAuthContext);

  if (!context) {
    throw new Error("useMockAuth must be used inside MockAuthProvider");
  }

  return context;
}
