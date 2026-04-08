import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

type MockUser = {
  name: string;
  email: string;
  avatarLabel: string;
};

type LoginPayload = {
  name: string;
  email: string;
};

type MockAuthContextValue = {
  user: MockUser | null;
  isAuthenticated: boolean;
  authOpen: boolean;
  openAuth: () => void;
  closeAuth: () => void;
  login: (payload: LoginPayload) => void;
  logout: () => void;
};

const STORAGE_KEY = "snailslayer-mock-user";

const MockAuthContext = createContext<MockAuthContextValue | null>(null);

export function MockAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<MockUser | null>(null);
  const [authOpen, setAuthOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      return;
    }

    try {
      const parsed = JSON.parse(saved) as MockUser;
      setUser(parsed);
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  function login({ name, email }: LoginPayload) {
    const safeName = name.trim() || "Maple Player";
    const safeEmail = email.trim() || "player@maple.world";
    const nextUser = {
      name: safeName,
      email: safeEmail,
      avatarLabel: safeName.slice(0, 1).toUpperCase()
    };

    setUser(nextUser);
    setAuthOpen(false);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextUser));
  }

  function logout() {
    setUser(null);
    window.localStorage.removeItem(STORAGE_KEY);
  }

  const value = useMemo<MockAuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      authOpen,
      openAuth: () => setAuthOpen(true),
      closeAuth: () => setAuthOpen(false),
      login,
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
