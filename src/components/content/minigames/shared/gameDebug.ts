type GameDebugPayload = Record<string, unknown>;

const DEBUG_KEY = "snailslayer-game-debug";

export function isGameDebugEnabled() {
  if (typeof window === "undefined") return false;
  return Boolean(import.meta.env.DEV && window.localStorage.getItem(DEBUG_KEY) === "1");
}

export function gameDebug(label: string, payload?: GameDebugPayload) {
  if (!isGameDebugEnabled()) return;
  const safePayload = payload ?? {};
  // eslint-disable-next-line no-console
  console.debug(`[GameDebug] ${label}`, safePayload);
}

