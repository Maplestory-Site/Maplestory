import { useEffect, useState } from "react";
import type { GameId } from "./gameMeta";

const STORAGE_KEY = "snailslayer-game-favorites";

function loadFavorites(): GameId[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as GameId[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveFavorites(next: GameId[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent("mini-games-favorites:update", { detail: next }));
}

export function useGameFavorites() {
  const [favorites, setFavorites] = useState<GameId[]>(() => loadFavorites());

  useEffect(() => {
    const handle = (event: Event) => {
      if (event instanceof CustomEvent && event.detail) {
        setFavorites(event.detail as GameId[]);
        return;
      }
      setFavorites(loadFavorites());
    };
    window.addEventListener("mini-games-favorites:update", handle);
    window.addEventListener("storage", handle);
    return () => {
      window.removeEventListener("mini-games-favorites:update", handle);
      window.removeEventListener("storage", handle);
    };
  }, []);

  const toggle = (id: GameId) => {
    setFavorites((current) => {
      const next = current.includes(id) ? current.filter((fav) => fav !== id) : current.concat(id);
      saveFavorites(next);
      return next;
    });
  };

  return { favorites, toggle };
}
