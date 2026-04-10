import {
  MONSTERS_CACHE_TTL_MINUTES,
  MONSTERS_FETCH_TIMEOUT_MS,
  MONSTERS_SOURCE_META,
  MONSTERS_SOURCE_URL,
} from "./config.mjs";
import { getSeedMonsterFeed, readMonsterCacheFeed, writeMonsterCacheFeed } from "./cache.mjs";
import { normalizeMonsterFeed } from "./normalize.mjs";

let memoryFeed = null;
let inFlightRefresh = null;

const monsterRowPattern =
  /<tr><td>([\s\S]*?)<\/td><td>(.*?)<\/td><td>(.*?)<\/td><td>(.*?)<\/td><td>(.*?)<\/td><td>(.*?)<\/td><td>([\s\S]*?)<\/td><\/tr>/g;

const knownBossIds = new Set([
  "mano",
  "stumpy",
  "king-slime",
  "deo",
  "crimson-balrog",
  "mushmom",
  "zombie-mushmom",
  "dyle",
  "timer",
  "jr-balrog",
  "papulatus",
  "zakum",
  "the-boss",
  "bigfoot",
  "ergoth",
  "leviathan",
  "manon",
  "griffey",
  "headless-horseman",
  "black-crow",
  "captain-latanica",
  "krexel",
  "scarlion",
  "targa",
  "bodyguard-a",
  "bodyguard-b",
  "lyka",
  "wu-yang",
  "niblungen",
  "dunas",
  "nameless-magic-monster",
  "aufheben",
  "castellan-toad",
  "pink-bean",
  "vergamot",
  "horntail",
  "hilla",
  "magnus",
  "lotus",
  "damien",
  "lucid",
  "will",
  "gloom",
  "darknell",
  "black-mage",
  "seren",
  "kaling"
]);

function decodeHtml(value = "") {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function stripTags(value = "") {
  return decodeHtml(value)
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function slugifyMonsterName(name = "") {
  return stripTags(name)
    .toLowerCase()
    .replace(/[\u2019']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parseImage(cell = "") {
  const match = cell.match(/data-original="([^"]+)"/i) || cell.match(/src="([^"]+)"/i);
  const raw = match?.[1]?.trim();
  if (!raw || raw === "https:None" || raw === "None") return null;
  if (raw.startsWith("//")) return `https:${raw}`;
  if (raw.startsWith("https:")) return raw;
  if (raw.startsWith("http")) return raw;
  return null;
}

function inferCategory(name, description) {
  const source = `${name} ${description}`.toLowerCase();
  if (/mushroom/.test(source)) return "Mushroom";
  if (/slime|jelly/.test(source)) return "Slime";
  if (/drake|dragon|wyvern|horntail|seruf|leviathan/.test(source)) return "Dragon";
  if (/zombie|skelegon|skeleton|mummy|ghoul|undead/.test(source)) return "Undead";
  if (/ghost|spirit|phantom|wraith|soul|specter|erda/.test(source)) return "Spirit";
  if (/robo|robot|machine|teddy|watch|viking|android|drone|mecha/.test(source)) return "Machine";
  if (/balrog|bean|magnus|hilla|zakum|demon|devil|darknell|gloom/.test(source)) return "Demon";
  return "Beast";
}

function inferType(id, name, description, level, hp) {
  const source = `${id} ${name} ${description}`.toLowerCase();
  if (knownBossIds.has(id) || /\bboss\b|commander|raid|chaos|guardian/.test(source)) {
    return { type: "Boss", isBoss: true, isElite: false };
  }

  if (/elite|captain|chief|master|dual ghost pirate|spirit viking|phantom watch/.test(source) || (level >= 120 && hp >= 1_000_000)) {
    return { type: "Elite", isBoss: false, isElite: true };
  }

  return { type: "Normal", isBoss: false, isElite: false };
}

function inferStrength(level, hp, rawPower) {
  const hpWeight = Math.log10(Math.max(hp, 10)) * 8.5;
  const powerWeight = Math.log10(Math.max(rawPower, 10)) * 12.5;
  return Math.max(5, Math.min(100, Math.round(level * 0.24 + hpWeight + powerWeight - 10)));
}

function inferDifficultyLabel(difficulty) {
  if (difficulty >= 76) return "Extreme";
  if (difficulty >= 56) return "High";
  if (difficulty >= 30) return "Moderate";
  return "Low";
}

function inferLocations(description) {
  const locations = [];
  const foundMatch = description.match(/Found\s+(?:in|at|on)\s+([^.;]+)/i);
  if (foundMatch?.[1]) {
    const text = foundMatch[1].trim();
    const parts = text.split(",").map((entry) => entry.trim()).filter(Boolean);
    locations.push({
      region: parts[0] || "Maple World",
      map: parts[1] || parts[0] || "Unknown Map",
      area: parts.slice(2).join(" · ") || undefined,
    });
  }

  if (!locations.length) {
    locations.push({
      region: "Maple World",
      map: "Unknown Route",
      area: undefined,
    });
  }

  return locations;
}

function inferWeaknesses(description, category) {
  const source = description.toLowerCase();
  const weaknesses = [];
  if (/holy/.test(source)) weaknesses.push("Holy Weak");
  if (/fire/.test(source)) weaknesses.push("Fire Weak");
  if (/ice/.test(source)) weaknesses.push("Ice Weak");
  if (/lightning/.test(source)) weaknesses.push("Lightning Weak");
  if (/poison/.test(source)) weaknesses.push("Poison Weak");
  if (/slow|sluggish|low mobility/.test(source)) weaknesses.push("Low Mobility");
  if (/short range|close range/.test(source)) weaknesses.push("Close-range pressure");
  if (!weaknesses.length && category === "Dragon") weaknesses.push("Burst windows");
  if (!weaknesses.length && category === "Undead") weaknesses.push("Holy Weak");
  if (!weaknesses.length) weaknesses.push("Pattern punishable");
  return weaknesses.slice(0, 3);
}

function inferFarmingScore(type, level, hp, description) {
  const easyKill = 100 - Math.min(100, Math.log10(Math.max(hp, 10)) * 16 + level * 0.22);
  const routeBoost = /dense|packed|flat|route|lane|star force|clock tower|field/i.test(description) ? 18 : 6;
  const bossPenalty = type === "Boss" ? 40 : type === "Elite" ? 10 : 0;
  return Math.max(8, Math.min(98, Math.round(easyKill + routeBoost - bossPenalty)));
}

function inferFarmingTier(score) {
  if (score >= 80) return "Top";
  if (score >= 60) return "Strong";
  if (score >= 36) return "Solid";
  return "Low";
}

function inferFarmingTags(type, category, description, score) {
  const tags = [];
  if (type === "Boss") tags.push("Boss route");
  if (score >= 75) tags.push("Best easy farm");
  if (/material|drop/.test(description)) tags.push("Material drops");
  if (/star force|packed|dense|flat/.test(description)) tags.push("Dense spawn");
  if (category === "Machine") tags.push("Efficient route");
  return [...new Set(tags)].slice(0, 3);
}

function isFresh(updatedAt) {
  if (!updatedAt) return false;
  const timestamp = new Date(updatedAt).getTime();
  if (Number.isNaN(timestamp)) return false;
  return Date.now() - timestamp <= MONSTERS_CACHE_TTL_MINUTES * 60 * 1000;
}

function withMeta(feed, overrides = {}) {
  return normalizeMonsterFeed({
    ...feed,
    meta: {
      ...MONSTERS_SOURCE_META,
      ...feed.meta,
      ...overrides,
      updatedAt: overrides.updatedAt || feed.meta?.updatedAt || new Date().toISOString(),
    },
  });
}

async function fetchSourceHtml() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), MONSTERS_FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(MONSTERS_SOURCE_URL, {
      headers: {
        "user-agent": "Mozilla/5.0 (compatible; SnailslayerBot/1.0; +https://www.snailslayer.eu.cc)",
        accept: "text/html,application/xhtml+xml",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Source fetch failed with status ${response.status}`);
    }

    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

function extractMonsterRows(_html) {
  const items = [];

  for (const match of _html.matchAll(monsterRowPattern)) {
    const [, rawCell, rawLevel, rawHp, rawCol4, rawCol5, rawCol6, rawDescription] = match;
    const name = stripTags(rawCell).replace(/^\[\*\]\s*/, "");
    if (!name) continue;

    const id = slugifyMonsterName(name);
    const level = Number(rawLevel.replace(/[^\d]+/g, "")) || 1;
    const hp = Number(rawHp.replace(/[^\d]+/g, "")) || 0;
    const rawPower = Number(rawCol6.replace(/[^\d]+/g, "")) || Number(rawCol5.replace(/[^\d]+/g, "")) || Number(rawCol4.replace(/[^\d]+/g, "")) || level;
    const description = stripTags(rawDescription) || `${name} monster entry from MapleStory.`;
    const { type, isBoss, isElite } = inferType(id, name, description, level, hp);
    const strength = inferStrength(level, hp, rawPower);
    const difficulty = Math.max(
      6,
      Math.min(
        100,
        Math.round(strength * 0.72 + Math.log10(Math.max(hp, 10)) * 6 + (isBoss ? 18 : isElite ? 8 : 0))
      )
    );
    const farmingScore = inferFarmingScore(type, level, hp, description);

    items.push({
      id,
      name,
      image: parseImage(rawCell),
      portrait: name
        .split(/\s+/)
        .slice(0, 2)
        .map((entry) => entry[0])
        .join("")
        .toUpperCase(),
      type,
      category: inferCategory(name, description),
      level,
      hp,
      strength,
      difficulty,
      difficultyLabel: inferDifficultyLabel(difficulty),
      description,
      shortDescription: description.split(".")[0]?.trim() || `${name} monster entry.`,
      weaknesses: inferWeaknesses(description, inferCategory(name, description)),
      drops: [],
      locations: inferLocations(description),
      isBoss,
      isElite,
      farmingScore,
      farmingTier: inferFarmingTier(farmingScore),
      farmingTags: inferFarmingTags(type, inferCategory(name, description), description, farmingScore),
      farmingReason:
        type === "Boss"
          ? "Built more for challenge and progression than repeat farming."
          : farmingScore >= 75
            ? "Strong route density and manageable pressure make this a strong farm target."
            : farmingScore >= 50
              ? "Solid route if the map and level band fit your run."
              : "More situational for farming than top route picks.",
    });
  }

  const deduped = new Map();
  for (const item of items) {
    if (!deduped.has(item.id)) {
      deduped.set(item.id, item);
    }
  }

  return [...deduped.values()];
}

async function refreshFromSource() {
  const html = await fetchSourceHtml();
  const items = extractMonsterRows(html);

  if (!items.length) {
    throw new Error("No monster rows could be parsed from source");
  }

  const existing = (await readMonsterCacheFeed()) || getSeedMonsterFeed();
  const previousIds = new Set((existing.items || []).map((item) => item.id));
  const freshItemCount = items.reduce(
    (count, item) => count + (previousIds.has(item.id) ? 0 : 1),
    0,
  );

  const feed = normalizeMonsterFeed({
    items,
    meta: {
      ...MONSTERS_SOURCE_META,
      sourceStatus: "ok",
      syncState: "synced",
      canAutoSync: true,
      cacheTtlMinutes: MONSTERS_CACHE_TTL_MINUTES,
      freshItemCount,
      updatedAt: new Date().toISOString(),
      fetchedAt: new Date().toISOString(),
      itemCount: items.length,
    },
  });

  await writeMonsterCacheFeed(feed);
  memoryFeed = feed;
  return feed;
}

export async function getMonsterFeed({ forceRefresh = false } = {}) {
  if (!forceRefresh && memoryFeed && isFresh(memoryFeed.meta?.updatedAt)) {
    return memoryFeed;
  }

  const cachedFeed = await readMonsterCacheFeed();
  if (!forceRefresh && cachedFeed && isFresh(cachedFeed.meta?.updatedAt)) {
    memoryFeed = withMeta(cachedFeed, {
      sourceStatus: cachedFeed.meta?.sourceStatus || "cached",
      syncState: cachedFeed.meta?.syncState || "cached",
      cacheTtlMinutes: MONSTERS_CACHE_TTL_MINUTES,
    });
    return memoryFeed;
  }

  if (inFlightRefresh) {
    return inFlightRefresh;
  }

  inFlightRefresh = (async () => {
    try {
      return await refreshFromSource();
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Unknown monster sync error";
      console.warn("[monsters] Falling back to cached/seeded monster feed:", reason);

      if (cachedFeed) {
        const fallback = withMeta(cachedFeed, {
          sourceStatus: "stale",
          syncState: "cached",
          cacheTtlMinutes: MONSTERS_CACHE_TTL_MINUTES,
          error: reason,
        });
        memoryFeed = fallback;
        return fallback;
      }

      const seeded = withMeta(getSeedMonsterFeed(), {
        sourceStatus: "seeded",
        syncState: "seeded",
        canAutoSync: true,
        cacheTtlMinutes: MONSTERS_CACHE_TTL_MINUTES,
        error: reason,
      });
      memoryFeed = seeded;
      return seeded;
    } finally {
      inFlightRefresh = null;
    }
  })();

  return inFlightRefresh;
}
