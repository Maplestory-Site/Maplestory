export type CloudAccount = {
  id: string;
  username: string;
  email: string;
  createdAt: string;
};

export type CloudAuthResult = {
  user: CloudAccount;
  token: string;
};

export function readCloudSessionToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem("snailslayer-session");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { token?: unknown };
    return typeof parsed.token === "string" && parsed.token.length > 0 ? parsed.token : null;
  } catch {
    return null;
  }
}

export function authHeaders(extra: HeadersInit = {}): HeadersInit {
  const token = readCloudSessionToken();
  return token ? { ...extra, Authorization: `Bearer ${token}` } : extra;
}

export async function signupCloudAccount(payload: {
  username: string;
  email: string;
  password: string;
}): Promise<CloudAuthResult | null> {
  const response = await fetch("/api/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "signup", ...payload })
  });
  if (!response.ok) return null;
  const data = await response.json() as { user?: CloudAccount; token?: string };
  return data.user && data.token ? { user: data.user, token: data.token } : null;
}

export async function loginCloudAccount(payload: {
  email: string;
  password: string;
}): Promise<CloudAuthResult | null> {
  const response = await fetch("/api/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "login", ...payload })
  });
  if (!response.ok) return null;
  const data = await response.json() as { user?: CloudAccount; token?: string };
  return data.user && data.token ? { user: data.user, token: data.token } : null;
}
