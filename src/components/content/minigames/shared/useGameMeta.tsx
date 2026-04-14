import { useEffect, useState } from "react";
import { loadGameMeta, type GameMetaState } from "./gameMeta";

export function useGameMeta() {
  const [meta, setMeta] = useState<GameMetaState>(() => loadGameMeta());

  useEffect(() => {
    const handleUpdate = (event: Event) => {
      if (event instanceof CustomEvent && event.detail) {
        setMeta(event.detail as GameMetaState);
        return;
      }
      setMeta(loadGameMeta());
    };

    window.addEventListener("mini-games-meta:update", handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener("mini-games-meta:update", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  return meta;
}
