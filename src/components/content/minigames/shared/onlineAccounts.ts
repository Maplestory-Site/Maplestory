export type CloudAccount = {
  id: string;
  username: string;
  email: string;
  createdAt: string;
};

export async function signupCloudAccount(payload: {
  username: string;
  email: string;
  password: string;
}): Promise<CloudAccount | null> {
  const response = await fetch("/api/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "signup", ...payload })
  });
  if (!response.ok) return null;
  const data = await response.json() as { user?: CloudAccount };
  return data.user ?? null;
}

export async function loginCloudAccount(payload: {
  email: string;
  password: string;
}): Promise<CloudAccount | null> {
  const response = await fetch("/api/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "login", ...payload })
  });
  if (!response.ok) return null;
  const data = await response.json() as { user?: CloudAccount };
  return data.user ?? null;
}
