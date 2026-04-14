const SESSION_KEY = "snailslayer-multiplayer-room";

export function getActiveRoomId() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(SESSION_KEY);
}

export function setActiveRoomId(roomId: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SESSION_KEY, roomId);
}

export function clearActiveRoomId() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SESSION_KEY);
}
