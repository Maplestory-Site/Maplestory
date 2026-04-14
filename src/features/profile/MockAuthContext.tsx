import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { applyUserProgress, extractUserProgress, loadGameMeta, type UserProgress } from "../../components/content/minigames/shared/gameMeta";
import { flushOutbox, loadCloudProgress, saveCloudProgress, submitLeaderboardScore } from "../../components/content/minigames/shared/cloudProgress";
import { getActiveRoomId } from "../../components/content/minigames/shared/multiplayerSession";
import { updateRoom } from "../../components/content/minigames/shared/multiplayerApi";

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
  password: string;
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
  login: (payload: LoginPayload) => boolean;
  signup: (payload: { username: string; email: string; password: string }) => boolean;
  logout: () => void;
};

const STORAGE_KEY = "snailslayer-accounts";
const SESSION_KEY = "snailslayer-session";

const MockAuthContext = createContext<MockAuthContextValue | null>(null);

export function MockAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<MockUser | null>(null);
  const [authOpen, setAuthOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const session = window.localStorage.getItem(SESSION_KEY);
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved || !session) return;

    try {
      const parsed = JSON.parse(saved) as MockUser[];
      const sessionId = JSON.parse(session) as { userId: string };
      const currentUser = parsed.find((entry) => entry.id === sessionId.userId) || null;
      if (currentUser) {
        setUser(currentUser);
        applyUserProgress(extractUserProgress(currentUser));
      }
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
      window.localStorage.removeItem(SESSION_KEY);
    }
  }, []);

  function persistUser(nextUser: MockUser) {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    const parsed = stored ? (JSON.parse(stored) as MockUser[]) : [];
    const next = parsed.filter((entry) => entry.id !== nextUser.id).concat(nextUser);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.localStorage.setItem(SESSION_KEY, JSON.stringify({ userId: nextUser.id }));
  }

  function login({ email, password }: LoginPayload) {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return false;
    try {
      const parsed = JSON.parse(stored) as MockUser[];
      const match = parsed.find((entry) => entry.email === email.trim().toLowerCase() && entry.password === password);
      if (!match) return false;
      const withProgress = {
        ...match,
        ...extractUserProgress(match)
      };
      setUser(withProgress);
      setAuthOpen(false);
      persistUser(withProgress);
      applyUserProgress(extractUserProgress(withProgress));
      void loadCloudProgress(withProgress.id)
        .then((payload) => {
          if (payload.progress) {
            applyUserProgress(payload.progress);
          }
        })
        .finally(() => {
          void flushOutbox(withProgress.id);
        });
      return true;
    } catch {
      return false;
    }
  }

  function signup({ username, email, password }: { username: string; email: string; password: string }) {
    const safeName = username.trim() || "Maple Player";
    const safeEmail = email.trim().toLowerCase() || "player@maple.world";
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as MockUser[];
        if (parsed.some((entry) => entry.email === safeEmail)) {
          return false;
        }
      } catch {
        return false;
      }
    }
    const id = `${safeEmail}-${Date.now()}`;
    const progress = extractUserProgress({ xp: 0, level: 1, highScores: {} as UserProgress["highScores"] } as MockUser);
    const nextUser: MockUser = {
      id,
      username: safeName,
      name: safeName,
      email: safeEmail,
      avatarLabel: safeName.slice(0, 1).toUpperCase(),
      createdAt: new Date().toISOString(),
      xp: progress.xp,
      level: progress.level,
      coins: progress.coins,
      ownedItems: progress.ownedItems ?? [],
      highScores: progress.highScores,
      password
    };
    setUser(nextUser);
    setAuthOpen(false);
    persistUser(nextUser);
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

export function useMockAuth() {
  const context = useContext(MockAuthContext);

  if (!context) {
    throw new Error("useMockAuth must be used inside MockAuthProvider");
  }

  return context;
}
