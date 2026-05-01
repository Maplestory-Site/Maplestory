import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import {
  calculateOfflineGains,
  saveGameState,
  type DatabaseItem,
  type DatabaseMap,
  type DatabaseMonster,
  type IdleGameState
} from "../gameEngine";
import { getCurrentMonster, getFeaturedLoot } from "../progressionSystem";
import { getFullZoneOrFirst } from "../zoneSystem";
import { sanitizeGameText, sanitizeMonsterPortrait } from "../textSanitizer";

const MAX_GAME_ITEMS = 120;
const MAX_GAME_LEVEL = 250;
const MONSTER_FALLBACK_PORTRAITS = ["👾", "🟢", "🍄", "🐺", "🦇", "🪨", "🔥", "❄️", "🦎", "🦂", "👻", "🤖"] as const;

function normalizeImageSource(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const normalized = sanitizeGameText(trimmed, "");
  if (!normalized) return null;
  if (normalized.startsWith("data:image/")) return normalized;
  if (/^https?:\/\/\S+$/i.test(normalized)) return normalized;
  if (/^\/[^?#]+\.(png|jpe?g|webp|gif|avif|svg)(?:[?#].*)?$/i.test(normalized)) return normalized;
  return null;
}

function getStablePortraitFallback(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  }
  const index = Math.abs(hash) % MONSTER_FALLBACK_PORTRAITS.length;
  return MONSTER_FALLBACK_PORTRAITS[index];
}

async function fetchDatabase<T>(url: string, signal?: AbortSignal): Promise<T[]> {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Failed ${url}`);
  const payload = await res.json();
  if (Array.isArray(payload)) return payload as T[];
  const data = payload as { data?: T[]; items?: T[]; maps?: T[]; monsters?: T[] };
  return data.items ?? data.data ?? data.maps ?? data.monsters ?? [];
}

function limitMonsters(items: DatabaseMonster[]) {
  return items
    .map((monster) => {
      const safeName = sanitizeGameText(monster.name, "Unknown Monster");
      const safeFallbackPortrait = getStablePortraitFallback(`${safeName}-${monster.level ?? 0}`);
      return {
        ...monster,
        name: safeName,
        portrait: sanitizeMonsterPortrait(monster.portrait, safeFallbackPortrait),
        image: normalizeImageSource(monster.image),
        drops: monster.drops?.map((drop) => ({
          ...drop,
          name: sanitizeGameText(drop.name, "Drop"),
          rarity: sanitizeGameText(drop.rarity, "common"),
          kind: sanitizeGameText(drop.kind, "material")
        })),
        dropTable: monster.dropTable?.map((drop) => ({
          ...drop,
          name: sanitizeGameText(drop.name, "Drop"),
          rarity: sanitizeGameText(drop.rarity, "common"),
          kind: sanitizeGameText(drop.kind, "material")
        })),
        locations: monster.locations?.map((location) => ({
          region: sanitizeGameText(location.region, "Unknown"),
          map: sanitizeGameText(location.map, "Unknown")
        }))
      };
    })
    .sort((a, b) => a.level - b.level);
}

function limitItems(items: DatabaseItem[]) {
  return items
    .map((item) => ({
      ...item,
      name: sanitizeGameText(item.name, "Item"),
      type: sanitizeGameText(item.type, "misc"),
      rarity: sanitizeGameText(item.rarity, "common"),
      image: normalizeImageSource(item.image),
      sourceMonsters: item.sourceMonsters.map((source) => sanitizeGameText(source, "Unknown"))
    }))
    .filter((item) => item.level === null || item.level <= MAX_GAME_LEVEL)
    .sort((a, b) => (a.level ?? 0) - (b.level ?? 0))
    .slice(0, MAX_GAME_ITEMS);
}

function sanitizeMaps(items: DatabaseMap[]) {
  return items.map((map) => ({
    ...map,
    id: sanitizeGameText(map.id, "unknown-map"),
    name: sanitizeGameText(map.name, "Unknown Map"),
    streetName: sanitizeGameText(map.streetName ?? "", ""),
    region: sanitizeGameText(map.region ?? "", ""),
    image: normalizeImageSource(map.image) ?? "",
    imageMedium: normalizeImageSource(map.imageMedium) ?? "",
    imageLarge: normalizeImageSource(map.imageLarge) ?? ""
  }));
}

export function normalizeLoadedZoneIdForGame(zoneId: string): string {
  return getFullZoneOrFirst(zoneId).id;
}

type UseIdleStoryDataLoaderParams = {
  currentZoneName: string;
  setToast: (message: string) => void;
  setState: Dispatch<SetStateAction<IdleGameState>>;
};

export function useIdleStoryDataLoader({
  setToast,
  setState
}: UseIdleStoryDataLoaderParams) {
  const [maps, setMaps] = useState<DatabaseMap[]>([]);
  const [monsters, setMonsters] = useState<DatabaseMonster[]>([]);
  const [items, setItems] = useState<DatabaseItem[]>([]);

  const requestIdRef = useRef(0);
  const monstersRef = useRef(monsters);
  const itemsRef = useRef(items);
  const isMountedRef = useRef(true);
  const offlineGainsAppliedRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    monstersRef.current = monsters;
    itemsRef.current = items;
  }, [monsters, items]);

  useEffect(() => {
    const requestId = ++requestIdRef.current;
    const controller = new AbortController();

    const loadData = async () => {
      try {
        const nextMapsRaw = await fetchDatabase<DatabaseMap>("/api/maps", controller.signal);
        const nextMaps = sanitizeMaps(nextMapsRaw);
        if (!isMountedRef.current || requestId !== requestIdRef.current || controller.signal.aborted) return;
        setMaps(nextMaps);
        setState((cur) => {
          const safeZoneId = normalizeLoadedZoneIdForGame(cur.zone);
          return safeZoneId === cur.zone ? cur : { ...cur, zone: safeZoneId };
        });

        const nextMonsters = await fetchDatabase<DatabaseMonster>("/api/monsters", controller.signal);
        if (!isMountedRef.current || requestId !== requestIdRef.current || controller.signal.aborted) return;
        setMonsters(limitMonsters(nextMonsters));

        const nextItems = await fetchDatabase<DatabaseItem>("/api/items", controller.signal);
        if (!isMountedRef.current || requestId !== requestIdRef.current || controller.signal.aborted) return;
        setItems(limitItems(nextItems));

        setToast("Zone data ready.");
      } catch {
        if (!isMountedRef.current || requestId !== requestIdRef.current || controller.signal.aborted) return;
        setToast("Offline mode - zone data loaded from cache.");
      }
    };

    void loadData();

    return () => {
      requestIdRef.current += 1;
      controller.abort();
    };
  }, [setState, setToast]);

  useEffect(() => {
    if (offlineGainsAppliedRef.current) return;
    offlineGainsAppliedRef.current = true;
    if (!isMountedRef.current) return;
    setState((cur) => {
      const zone = getFullZoneOrFirst(cur.zone);
      const monster = getCurrentMonster(cur, zone, monstersRef.current);
      const featuredLoot = getFeaturedLoot(monster, itemsRef.current);
      const next = calculateOfflineGains(cur, { zone, monster, lootCount: featuredLoot.length });
      saveGameState(next);
      return next;
    });
  }, [setState]);

  return {
    maps,
    monsters,
    items
  };
}
