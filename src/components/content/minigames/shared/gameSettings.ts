import { useEffect, useState } from "react";

export type GameSettings = {
  vibration: boolean;
  reduceMotion: boolean;
  music: boolean;
};

const STORAGE_KEY = "snailslayer-game-settings";

const DEFAULT_SETTINGS: GameSettings = {
  vibration: true,
  reduceMotion: false,
  music: false
};

export function loadGameSettings(): GameSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<GameSettings>;
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveGameSettings(settings: GameSettings) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  window.dispatchEvent(new CustomEvent("mini-games-settings:update", { detail: settings }));
  document.body.classList.toggle("reduce-motion", !!settings.reduceMotion);
}

export function useGameSettings() {
  const [settings, setSettings] = useState<GameSettings>(() => loadGameSettings());

  useEffect(() => {
    const handleUpdate = (event: Event) => {
      if (event instanceof CustomEvent && event.detail) {
        setSettings(event.detail as GameSettings);
        return;
      }
      setSettings(loadGameSettings());
    };
    window.addEventListener("mini-games-settings:update", handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener("mini-games-settings:update", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  const update = (next: Partial<GameSettings>) => {
    const merged = { ...settings, ...next };
    setSettings(merged);
    saveGameSettings(merged);
  };

  return { settings, update };
}

export function shouldVibrate() {
  return loadGameSettings().vibration && typeof navigator !== "undefined" && !!navigator.vibrate;
}
