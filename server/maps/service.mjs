import {
  MAPS_CACHE_TTL_MINUTES,
  MAPS_FETCH_TIMEOUT_MS,
  MAPS_FETCH_URL,
  MAPS_IMAGE_BASE_URL,
  MAPS_SOURCE_META,
} from "./config.mjs";
import { getSeedMapFeed, readMapCacheFeed, writeMapCacheFeed } from "./cache.mjs";
import { getMonsterFeed } from "../monsters/service.mjs";

let memoryFeed = null;
let feedRefreshPromise = null;
const detailCache = new Map();
const detailRefresh = new Map();

function normalizeLabel(value = "") {
  return value
    .replace(/_/g, " ")
    .replace(/\b([a-z])/g, (match) => match.toUpperCase())
    .trim();
}

function slugify(value = "") {
  return String(value)
    .toLowerCase()
    .replace(/[\u2019']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function fetchMaplemaps(body) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), MAPS_FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(MAPS_FETCH_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "accept-encoding": "br, gzip",
        "user-agent": "SNAILSLAYER maps sync bot/1.0",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Maplemaps request failed (${response.status})`);
    }

    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

function createImageSet(mapId) {
  return {
    small: `${MAPS_IMAGE_BASE_URL}/maps/sm/${mapId}.webp?tmp=1`,
    medium: `${MAPS_IMAGE_BASE_URL}/maps/md/${mapId}.webp?tmp=1`,
    large: `${MAPS_IMAGE_BASE_URL}/maps/lg/${mapId}.webp?tmp=1`,
  };
}

function normalizeMapEntry(entry) {
  const mapId = Number(entry.map_id);
  const regionCode = String(entry.region || "");
  const normalizedRegion = normalizeLabel(regionCode);
  const images = createImageSet(mapId);

  return {
    id: String(mapId),
    mapId,
    name: String(entry.name || "").trim(),
    streetName: String(entry.streetName || "").trim(),
    region: normalizedRegion || "Unknown Region",
    regionCode,
    image: images.small,
    imageMedium: images.medium,
    imageLarge: images.large,
    sourceUrl: `${MAPS_SOURCE_META.sourceUrl}map/${mapId}`,
  };
}

async function buildMapFeed() {
  const payload = await fetchMaplemaps({ reqType: "searchData" });
  const entries = Array.isArray(payload) ? payload : Array.isArray(payload?.value) ? payload.value : [];
  const items = Array.isArray(entries)
    ? entries
        .map((entry) => normalizeMapEntry(entry))
        .filter((entry) => entry.mapId && entry.name)
        .sort((left, right) => left.name.localeCompare(right.name))
    : [];

  return {
    items,
    meta: {
      ...MAPS_SOURCE_META,
      updatedAt: new Date().toISOString(),
      syncState: "synced",
      itemCount: items.length,
    },
  };
}

function isFeedFresh(feed) {
  const updatedAt = new Date(feed?.meta?.updatedAt || 0).getTime();
  if (!updatedAt) return false;
  return Date.now() - updatedAt < MAPS_CACHE_TTL_MINUTES * 60 * 1000;
}

export async function getMapFeed({ forceRefresh = false } = {}) {
  if (!forceRefresh && memoryFeed && isFeedFresh(memoryFeed)) {
    return memoryFeed;
  }

  if (!forceRefresh) {
    const cached = await readMapCacheFeed();
    if (cached?.items?.length && isFeedFresh(cached)) {
      memoryFeed = cached;
      return cached;
    }
  }

  if (!feedRefreshPromise) {
    feedRefreshPromise = (async () => {
      try {
        const feed = await buildMapFeed();
        memoryFeed = feed;
        await writeMapCacheFeed(feed);
        return feed;
      } catch (error) {
        const cached = await readMapCacheFeed();
        if (cached?.items?.length) {
          memoryFeed = cached;
          return cached;
        }
        const seed = getSeedMapFeed();
        memoryFeed = seed;
        return seed;
      } finally {
        feedRefreshPromise = null;
      }
    })();
  }

  return feedRefreshPromise;
}

function buildMonsterImageIndex(monsterFeed) {
  const index = new Map();

  for (const item of monsterFeed.items) {
    const key = slugify(item.name);
    if (!index.has(key)) {
      index.set(key, item);
    }
  }

  return index;
}

function normalizeMapDetail(payload, monsterImageIndex) {
  const mapData = payload?.mapData || {};
  const images = createImageSet(mapData.map_id);

  const monsters = Array.isArray(payload?.mobsData)
    ? payload.mobsData.map((monster) => {
        const lookup = monsterImageIndex.get(slugify(monster.name));
        return {
          id: String(monster.mob_id),
          monsterId: Number(monster.mob_id),
          name: String(monster.name || "").trim(),
          level: Number(monster.level || 0),
          hp: Number(monster.maxHP || 0),
          image: lookup?.image || null,
          portrait: lookup?.portrait || String(monster.name || "?").slice(0, 2).toUpperCase(),
        };
      })
    : [];

  return {
    map: {
      id: String(mapData.map_id),
      mapId: Number(mapData.map_id),
      name: String(mapData.name || "").trim(),
      streetName: String(mapData.streetName || "").trim(),
      region: normalizeLabel(String(mapData.region || "")) || "Unknown Region",
      regionCode: String(mapData.region || ""),
      worldMapName: String(mapData.worldMapName || ""),
      parentWorld: String(mapData.parentWorld || ""),
      avgLevel: Number(mapData.avgLevel || 0),
      capacityPerGen: Number(mapData.capacityPerGen || 0),
      spawnPoints: Number(mapData.numMobs || 0),
      image: images.small,
      imageMedium: images.medium,
      imageLarge: images.large,
      sourceUrl: `${MAPS_SOURCE_META.sourceUrl}map/${mapData.map_id}`,
    },
    monsters,
    meta: {
      ...MAPS_SOURCE_META,
      updatedAt: new Date().toISOString(),
      monsterCount: monsters.length,
    },
  };
}

export async function getMapDetail(mapId, { forceRefresh = false } = {}) {
  const key = String(mapId);
  const cached = detailCache.get(key);
  if (!forceRefresh && cached) {
    return cached;
  }

  if (!detailRefresh.has(key)) {
    detailRefresh.set(
      key,
      (async () => {
        try {
          const [payload, monsterFeed] = await Promise.all([
            fetchMaplemaps({ reqType: "singleMapMobData", mapId: Number(mapId) }),
            getMonsterFeed(),
          ]);
          const detail = normalizeMapDetail(payload, buildMonsterImageIndex(monsterFeed));
          detailCache.set(key, detail);
          return detail;
        } finally {
          detailRefresh.delete(key);
        }
      })(),
    );
  }

  return detailRefresh.get(key);
}
