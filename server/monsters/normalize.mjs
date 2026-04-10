import { MONSTERS_SOURCE_META } from "./config.mjs";

function cleanText(value, fallback = "") {
  const text = typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
  return text || fallback;
}

function asNumber(value, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value !== "string") {
    return fallback;
  }

  const numeric = Number(value.replace(/[^\d.]+/g, ""));
  return Number.isFinite(numeric) ? numeric : fallback;
}

export function normalizeMonsterItem(item, index = 0) {
  const name = cleanText(item.name, `Unknown Monster ${index + 1}`);

  return {
    id: cleanText(item.id, `monster-${index + 1}`),
    name,
    image: cleanText(item.image) || null,
    portrait: cleanText(item.portrait, name.slice(0, 2).toUpperCase()),
    type: cleanText(item.type, item.isBoss ? "Boss" : "Normal"),
    category: cleanText(item.category, "Beast"),
    level: asNumber(item.level, 1),
    hp: asNumber(item.hp, 0),
    strength: asNumber(item.strength, 0),
    difficulty: asNumber(item.difficulty, 0),
    difficultyLabel: cleanText(item.difficultyLabel, "Moderate"),
    description: cleanText(item.description, "MapleStory monster entry."),
    shortDescription: cleanText(
      item.shortDescription,
      cleanText(item.description, "MapleStory monster entry."),
    ),
    weaknesses: Array.isArray(item.weaknesses)
      ? item.weaknesses.map((entry) => cleanText(entry)).filter(Boolean)
      : [],
    drops: Array.isArray(item.drops)
      ? item.drops
          .map((drop) => ({
            name: cleanText(drop.name, "Unknown Drop"),
            rarity: cleanText(drop.rarity, "Common"),
            kind: cleanText(drop.kind, "Material"),
          }))
          .filter((drop) => drop.name)
      : [],
    locations: Array.isArray(item.locations)
      ? item.locations
          .map((location) => ({
            region: cleanText(location.region, "Unknown Region"),
            map: cleanText(location.map, "Unknown Map"),
            area: cleanText(location.area),
          }))
          .filter((location) => location.map)
      : [],
    isBoss: Boolean(item.isBoss || cleanText(item.type) === "Boss"),
    isElite: Boolean(item.isElite || cleanText(item.type) === "Elite"),
    farmingScore: asNumber(item.farmingScore, 0),
    farmingTier: cleanText(item.farmingTier, "Low"),
    farmingTags: Array.isArray(item.farmingTags)
      ? item.farmingTags.map((entry) => cleanText(entry)).filter(Boolean)
      : [],
    farmingReason: cleanText(item.farmingReason, "Steady farming route."),
  };
}

export function normalizeMonsterFeed(payload) {
  const items = Array.isArray(payload?.items)
    ? payload.items.map((item, index) => normalizeMonsterItem(item, index))
    : [];
  const updatedAt = cleanText(payload?.meta?.updatedAt, new Date().toISOString());

  return {
    items,
    meta: {
      ...MONSTERS_SOURCE_META,
      sourceStatus: cleanText(payload?.meta?.sourceStatus, items.length ? "ok" : "empty"),
      syncState: cleanText(payload?.meta?.syncState, items.length ? "synced" : "seeded"),
      updatedAt,
      fetchedAt: cleanText(payload?.meta?.fetchedAt, updatedAt),
      itemCount:
        typeof payload?.meta?.itemCount === "number" && Number.isFinite(payload.meta.itemCount)
          ? payload.meta.itemCount
          : items.length,
      freshItemCount:
        typeof payload?.meta?.freshItemCount === "number" &&
        Number.isFinite(payload.meta.freshItemCount)
          ? payload.meta.freshItemCount
          : 0,
      canAutoSync:
        typeof payload?.meta?.canAutoSync === "boolean" ? payload.meta.canAutoSync : true,
      cacheTtlMinutes:
        typeof payload?.meta?.cacheTtlMinutes === "number" &&
        Number.isFinite(payload.meta.cacheTtlMinutes)
          ? payload.meta.cacheTtlMinutes
          : null,
      error: cleanText(payload?.meta?.error),
    },
  };
}
