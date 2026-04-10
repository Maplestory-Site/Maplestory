import {
  MONSTERS_CACHE_TTL_MINUTES,
  MONSTERS_FETCH_TIMEOUT_MS,
  MONSTERS_SOURCE_META,
  MONSTERS_SOURCE_URL,
} from "./config.mjs";
import { getSeedMonsterFeed, readMonsterCacheFeed, writeMonsterCacheFeed } from "./cache.mjs";
import { normalizeMonsterFeed } from "./normalize.mjs";

const FANDOM_API_URL = "https://maplestory.fandom.com/api.php";
const PAGE_BATCH_SIZE = 50;
const IMAGE_BATCH_SIZE = 25;
const MONSTER_TEMPLATE = "Template:Mob";
const BOSS_TEMPLATE = "Template:BossInfobox";

let memoryFeed = null;
let inFlightRefresh = null;

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

function stripMarkup(value = "") {
  return decodeHtml(
    value
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/'''?/g, "")
      .replace(/\[\[(?:[^|\]]*\|)?([^\]]+)\]\]/g, "$1")
      .replace(/\{\{[^{}]*\}\}/g, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  );
}

function normalizeMonsterName(name = "") {
  return stripMarkup(name)
    .replace(/\/Monster$/i, "")
    .replace(/\s*\(Monster\)$/i, "")
    .trim();
}

function slugifyMonsterName(name = "") {
  return normalizeMonsterName(name)
    .toLowerCase()
    .replace(/[\u2019']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function toNumber(value, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value !== "string") {
    return fallback;
  }

  const normalized = value.replace(/,/g, "");
  const match = normalized.match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : fallback;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function inferCategory(name, description, categories = []) {
  const source = `${name} ${description} ${categories.join(" ")}`.toLowerCase();
  if (/mushroom/.test(source)) return "Mushroom";
  if (/slime|jelly/.test(source)) return "Slime";
  if (/drake|dragon|wyvern|horntail|seruf|leviathan|dragonic/.test(source)) return "Dragon";
  if (/zombie|skelegon|skeleton|mummy|ghoul|undead/.test(source)) return "Undead";
  if (/ghost|spirit|phantom|wraith|soul|specter|erda/.test(source)) return "Spirit";
  if (/robo|robot|machine|teddy|watch|viking|android|drone|mecha/.test(source)) return "Machine";
  if (/balrog|bean|magnus|hilla|zakum|demon|devil|darknell|gloom|lucid|will|seren|lotus|damien/.test(source)) {
    return "Demon";
  }
  return "Beast";
}

function inferDifficultyLabel(difficulty) {
  if (difficulty >= 76) return "Extreme";
  if (difficulty >= 56) return "High";
  if (difficulty >= 30) return "Moderate";
  return "Low";
}

function inferStrength(level, hp, pad, pdr, mdr, isBoss, isElite) {
  const hpWeight = Math.log10(Math.max(hp, 10)) * 11;
  const attackWeight = Math.log10(Math.max(pad, 10)) * 18;
  const defenseWeight = (pdr + mdr) * 0.35;
  const roleWeight = isBoss ? 18 : isElite ? 8 : 0;
  return clamp(Math.round(level * 0.24 + hpWeight + attackWeight + defenseWeight + roleWeight), 5, 100);
}

function inferDifficulty(level, hp, strength, isBoss, isElite) {
  const hpPressure = Math.log10(Math.max(hp, 10)) * 7.2;
  const roleWeight = isBoss ? 16 : isElite ? 8 : 0;
  return clamp(Math.round(strength * 0.62 + level * 0.08 + hpPressure + roleWeight), 6, 100);
}

function inferFarmingScore({ type, level, hp, description, dropCount, locationCount }) {
  const easyKill = 100 - Math.min(100, Math.log10(Math.max(hp, 10)) * 15 + level * 0.18);
  const routeBoost = /dense|packed|flat|lane|route|field|corridor|hall|forest|tower|ship/i.test(description) ? 14 : 6;
  const locationBoost = Math.max(0, 16 - locationCount * 2);
  const dropBoost = Math.min(18, dropCount * 3);
  const bossPenalty = type === "Boss" ? 42 : type === "Elite" ? 10 : 0;
  return clamp(Math.round(easyKill + routeBoost + locationBoost + dropBoost - bossPenalty), 8, 98);
}

function inferFarmingTier(score) {
  if (score >= 80) return "Top";
  if (score >= 60) return "Strong";
  if (score >= 36) return "Solid";
  return "Low";
}

function inferFarmingReason(type, score, description) {
  if (type === "Boss") {
    return "Built more for challenge and progression than repeat farming.";
  }
  if (score >= 78) {
    return "Strong route density, manageable pressure, and useful drops make this a top farm target.";
  }
  if (score >= 58) {
    return "Solid farming route if the map and level band fit your run.";
  }
  if (/rare|material|quest/i.test(description)) {
    return "More useful for targeted drops than for raw farming speed.";
  }
  return "More situational for farming than top route picks.";
}

function inferFarmingTags(type, category, description, score, drops) {
  const tags = [];
  const source = `${description} ${drops.map((drop) => drop.name).join(" ")}`.toLowerCase();
  if (type === "Boss") tags.push("Boss route");
  if (score >= 75) tags.push("Best easy farm");
  if (/material|ore|crystal|piece|fragment|shard/.test(source)) tags.push("Material drops");
  if (/coin|meso|crystal/.test(source)) tags.push("Best meso farming");
  if (/flat|dense|lane|corridor|packed|field|forest/.test(source)) tags.push("Dense spawn");
  if (category === "Machine") tags.push("Efficient route");
  return [...new Set(tags)].slice(0, 3);
}

function normalizeDropKind(rawKind = "") {
  const value = rawKind.toLowerCase();
  if (value === "equip") return "Equipment";
  if (value === "use" || value === "setup") return "Consumable";
  if (value === "quest") return "Quest";
  if (value === "cash" || value === "ins") return "Currency";
  return "Material";
}

function normalizeDropRarity(raw = "") {
  const source = raw.toLowerCase();
  if (/epic|legendary|unique|special|boss/.test(source)) return "Epic";
  if (/rare|shiny|familiar \(rare\)|recipe|soul shard|crystal/.test(source)) return "Rare";
  return "Common";
}

function extractWikiLinks(value = "") {
  const links = [];
  const linkPattern = /\[\[([^|\]#]+)(?:#[^|\]]*)?(?:\|([^\]]+))?\]\]/g;

  for (const match of value.matchAll(linkPattern)) {
    const target = match[1]?.trim();
    const label = stripMarkup(match[2] || match[1] || "").trim();

    if (!target || /^(File|Category|Template|User|Help|Module):/i.test(target)) {
      continue;
    }

    if (!label || /^(none|n\/a)$/i.test(label)) {
      continue;
    }

    links.push({ target: target.trim(), label });
  }

  return links;
}

function extractListEntries(value = "") {
  const lines = value
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("*"));

  const entries = [];

  for (const line of lines) {
    const stripped = stripMarkup(line.replace(/^\*+\s*/, ""));
    if (stripped && !/^(none|n\/a)$/i.test(stripped)) {
      entries.push(stripped);
    }
  }

  return entries;
}

function uniqueByName(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = item.name?.toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function parseDrops(fieldName, value) {
  const links = extractWikiLinks(value).map(({ label, target }) => {
    const name = stripMarkup(label || target);
    return {
      name,
      rarity: normalizeDropRarity(name),
      kind: normalizeDropKind(fieldName),
    };
  });

  const textEntries = extractListEntries(value)
    .filter((entry) => !links.some((link) => link.name.toLowerCase() === entry.toLowerCase()))
    .map((entry) => ({
      name: entry,
      rarity: normalizeDropRarity(entry),
      kind: normalizeDropKind(fieldName),
    }));

  return uniqueByName([...links, ...textEntries]).slice(0, 12);
}

function parseLocations(value, sectionHeading) {
  const locations = extractWikiLinks(value).map(({ label }) => ({
    region: sectionHeading || "Maple World",
    map: label,
    area: undefined,
  }));

  if (locations.length) {
    return locations;
  }

  const textEntries = extractListEntries(value);
  if (!textEntries.length && stripMarkup(value)) {
    textEntries.push(stripMarkup(value));
  }

  return textEntries
    .filter(Boolean)
    .map((entry) => ({
      region: sectionHeading || "Maple World",
      map: entry,
      area: undefined,
    }));
}

function getHeadings(text = "") {
  const headings = [];
  const pattern = /^==+\s*(.*?)\s*==+\s*$/gm;

  for (const match of text.matchAll(pattern)) {
    headings.push({
      title: stripMarkup(match[1]),
      index: match.index ?? 0,
    });
  }

  return headings;
}

function getSectionHeading(headings, index) {
  let current = "";
  for (const heading of headings) {
    if (heading.index > index) break;
    current = heading.title;
  }
  return current;
}

function extractTemplates(text, templateNames) {
  const lower = text.toLowerCase();
  const wanted = templateNames.map((name) => name.toLowerCase());
  const items = [];

  for (let i = 0; i < text.length - 1; i += 1) {
    if (text[i] !== "{" || text[i + 1] !== "{") continue;

    for (const templateName of wanted) {
      const templateStart = lower.slice(i + 2, i + 2 + templateName.length);
      if (templateStart !== templateName) continue;

      let depth = 1;
      let cursor = i + 2;

      while (cursor < text.length - 1 && depth > 0) {
        if (text[cursor] === "{" && text[cursor + 1] === "{") {
          depth += 1;
          cursor += 2;
          continue;
        }
        if (text[cursor] === "}" && text[cursor + 1] === "}") {
          depth -= 1;
          cursor += 2;
          continue;
        }
        cursor += 1;
      }

      items.push({
        name: templateName,
        start: i,
        body: text.slice(i + 2, cursor - 2),
      });

      i = cursor - 1;
      break;
    }
  }

  return items;
}

function splitTemplateSegments(body = "") {
  const segments = [];
  let current = "";
  let templateDepth = 0;
  let linkDepth = 0;

  for (let i = 0; i < body.length; i += 1) {
    const char = body[i];
    const next = body[i + 1];

    if (char === "{" && next === "{") {
      templateDepth += 1;
      current += "{{";
      i += 1;
      continue;
    }

    if (char === "}" && next === "}") {
      templateDepth = Math.max(0, templateDepth - 1);
      current += "}}";
      i += 1;
      continue;
    }

    if (char === "[" && next === "[") {
      linkDepth += 1;
      current += "[[";
      i += 1;
      continue;
    }

    if (char === "]" && next === "]") {
      linkDepth = Math.max(0, linkDepth - 1);
      current += "]]";
      i += 1;
      continue;
    }

    if (char === "|" && templateDepth === 0 && linkDepth === 0) {
      segments.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  if (current) {
    segments.push(current);
  }

  return segments;
}

function parseTemplateParams(body = "") {
  const segments = splitTemplateSegments(body);
  const templateLabel = segments.shift() || "";
  const params = {};

  for (const segment of segments) {
    const separatorIndex = segment.indexOf("=");
    if (separatorIndex === -1) continue;
    const key = segment.slice(0, separatorIndex).trim().toLowerCase();
    const value = segment.slice(separatorIndex + 1).trim();
    params[key] = value;
  }

  return {
    templateLabel: templateLabel.trim(),
    params,
  };
}

function extractIntro(text = "") {
  const firstHeadingIndex = text.search(/^==/m);
  const introBlock = firstHeadingIndex === -1 ? text : text.slice(0, firstHeadingIndex);
  const cleaned = stripMarkup(
    introBlock
      .replace(/\{\{[\s\S]*?\}\}/g, " ")
      .replace(/\[\[File:[^\]]+\]\]/gi, " "),
  );

  if (!cleaned) return "";

  const sentence = cleaned.split(/(?<=[.!?])\s+/)[0]?.trim();
  return sentence || cleaned;
}

function inferWeaknessesFromParams(params = {}) {
  const mapping = [
    ["fire", "Fire Weak"],
    ["ice", "Ice Weak"],
    ["poison", "Poison Weak"],
    ["lightning", "Lightning Weak"],
    ["holy", "Holy Weak"],
    ["dark", "Dark Weak"],
    ["physical", "Physical Weak"],
  ];

  const weaknesses = mapping
    .filter(([key]) => toNumber(params[key], 0) >= 2)
    .map(([, label]) => label);

  if (String(params.undead || "").trim()) {
    weaknesses.push("Holy Weak");
  }

  return [...new Set(weaknesses)];
}

function parseImageFile(value = "") {
  const match = value.match(/\[\[(?:File|Image):([^|\]]+)/i);
  return match?.[1]?.trim() ? `File:${match[1].trim()}` : null;
}

function buildMobVariant(template, headings) {
  const { params } = parseTemplateParams(template.body);
  const sectionHeading = getSectionHeading(headings, template.start);
  const level = toNumber(params.level, 0);
  const hp = toNumber(params.hp, 0);
  const pad = toNumber(params.pad, 0);
  const pdr = toNumber(params.pdr, 0);
  const mdr = toNumber(params.mdr, 0);

  const drops = [
    ...parseDrops("equip", params.equip),
    ...parseDrops("use", params.use),
    ...parseDrops("etc", params.etc),
    ...parseDrops("quest", params.quest),
    ...parseDrops("setup", params.setup),
    ...parseDrops("cash", params.cash),
    ...parseDrops("ins", params.ins),
  ];

  return {
    sectionHeading,
    name: normalizeMonsterName(params.bname || params.name || ""),
    imageFile: parseImageFile(params.image || params.image1 || ""),
    level,
    hp,
    pad,
    pdr,
    mdr,
    weaknesses: inferWeaknessesFromParams(params),
    drops: uniqueByName(drops),
    locations: parseLocations(params.location || "", sectionHeading),
  };
}

function buildBossVariant(template) {
  const { params } = parseTemplateParams(template.body);
  const levelCandidates = Object.entries(params)
    .filter(([key]) => /^level\d*$/.test(key))
    .map(([, value]) => toNumber(value, 0))
    .filter(Boolean);

  return {
    imageFile: parseImageFile(params.image1 || params.image || ""),
    level: Math.max(0, ...levelCandidates),
  };
}

function collectPageCategories(page = {}) {
  return Array.isArray(page.categories)
    ? page.categories
        .map((category) => category.title?.replace(/^Category:/, "").trim())
        .filter(Boolean)
    : [];
}

function chooseBestVariant(variants) {
  if (!variants.length) return null;

  return [...variants].sort((a, b) => {
    const aScore = a.hp * 10 + a.level * 100 + a.drops.length * 4 + a.locations.length * 2;
    const bScore = b.hp * 10 + b.level * 100 + b.drops.length * 4 + b.locations.length * 2;
    return bScore - aScore;
  })[0];
}

function buildMonsterItemFromPage(page) {
  const revision = page.revisions?.[0]?.slots?.main?.content ?? page.revisions?.[0]?.slots?.main?.["*"];
  if (!revision) return null;

  const text = String(revision);
  const headings = getHeadings(text);
  const templates = extractTemplates(text, ["Mob", "BossInfobox"]);
  if (!templates.length) return null;

  const mobVariants = templates.filter((entry) => entry.name === "mob").map((entry) => buildMobVariant(entry, headings));
  const bossVariants = templates.filter((entry) => entry.name === "bossinfobox").map((entry) => buildBossVariant(entry));

  if (!mobVariants.length && !bossVariants.length) {
    return null;
  }

  const bestMob = chooseBestVariant(mobVariants);
  const bestBoss = bossVariants[0] || null;
  const categories = collectPageCategories(page);
  const rawName = bestMob?.name || normalizeMonsterName(page.title || "");
  const name = normalizeMonsterName(rawName);
  const id = slugifyMonsterName(name);
  const imageFile = bestMob?.imageFile || bestBoss?.imageFile || null;
  const level = Math.max(bestMob?.level || 0, bestBoss?.level || 0);
  const hp = Math.max(0, ...mobVariants.map((variant) => variant.hp).filter(Boolean));
  const pad = Math.max(0, ...mobVariants.map((variant) => variant.pad).filter(Boolean));
  const pdr = Math.max(0, ...mobVariants.map((variant) => variant.pdr).filter(Boolean));
  const mdr = Math.max(0, ...mobVariants.map((variant) => variant.mdr).filter(Boolean));
  const intro = extractIntro(text);
  const isBoss = categories.some((entry) => /boss/i.test(entry)) || page.title?.endsWith("/Monster") || Boolean(bestBoss);
  const isElite = !isBoss && categories.some((entry) => /elite|mini-boss/i.test(entry));
  const type = isBoss ? "Boss" : isElite ? "Elite" : "Normal";

  const drops = uniqueByName(mobVariants.flatMap((variant) => variant.drops)).slice(0, 18);
  const locations = mobVariants.flatMap((variant) => variant.locations).filter((location) => location.map);
  const uniqueLocations = [];
  const locationKeys = new Set();
  for (const location of locations) {
    const key = `${location.region}::${location.map}`;
    if (!locationKeys.has(key)) {
      locationKeys.add(key);
      uniqueLocations.push(location);
    }
  }

  const weaknesses = [...new Set(mobVariants.flatMap((variant) => variant.weaknesses))];
  const description =
    intro ||
    (bestMob?.sectionHeading
      ? `${name} appears in ${bestMob.sectionHeading} and is part of the MapleStory monster encyclopedia.`
      : `${name} is a MapleStory ${type.toLowerCase()} target.`);

  const category = inferCategory(name, description, categories);
  const strength = inferStrength(level || 1, hp || 0, pad || 0, pdr || 0, mdr || 0, isBoss, isElite);
  const difficulty = inferDifficulty(level || 1, hp || 0, strength, isBoss, isElite);
  const farmingScore = inferFarmingScore({
    type,
    level: level || 1,
    hp: hp || 0,
    description,
    dropCount: drops.length,
    locationCount: uniqueLocations.length || 1,
  });

  return {
    id,
    name,
    image: null,
    imageFile,
    portrait: name
      .split(/\s+/)
      .slice(0, 2)
      .map((entry) => entry[0])
      .join("")
      .toUpperCase(),
    type,
    category,
    level: level || 1,
    hp: hp || 0,
    strength,
    difficulty,
    difficultyLabel: inferDifficultyLabel(difficulty),
    description,
    shortDescription: description.split(/(?<=[.!?])\s+/)[0]?.trim() || `${name} monster entry.`,
    weaknesses: weaknesses.length ? weaknesses : ["Pattern punishable"],
    drops,
    locations:
      uniqueLocations.length > 0
        ? uniqueLocations.slice(0, 8)
        : [
            {
              region: bestMob?.sectionHeading || "Maple World",
              map: "Unknown Route",
              area: undefined,
            },
          ],
    isBoss,
    isElite,
    farmingScore,
    farmingTier: inferFarmingTier(farmingScore),
    farmingTags: inferFarmingTags(type, category, description, farmingScore, drops),
    farmingReason: inferFarmingReason(type, farmingScore, description),
  };
}

async function fetchApiJson(params) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), MONSTERS_FETCH_TIMEOUT_MS);

  try {
    const search = new URLSearchParams({
      format: "json",
      formatversion: "2",
      origin: "*",
      ...params,
    });

    const response = await fetch(`${FANDOM_API_URL}?${search.toString()}`, {
      headers: {
        "user-agent": "Mozilla/5.0 (compatible; SnailslayerBot/1.0; +https://www.snailslayer.eu.cc)",
        accept: "application/json",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Fandom API failed with status ${response.status}`);
    }

    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchEmbeddedTitles(templateTitle) {
  const titles = [];
  let continuation = {};

  while (true) {
    const payload = await fetchApiJson({
      action: "query",
      list: "embeddedin",
      eititle: templateTitle,
      eilimit: "max",
      einamespace: "0",
      ...continuation,
    });

    const rows = payload?.query?.embeddedin || [];
    for (const row of rows) {
      if (!row?.title) continue;
      titles.push(row.title);
    }

    if (!payload.continue) break;
    continuation = payload.continue;
  }

  return titles;
}

function chunk(items, size) {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

async function fetchPagesByTitles(titles) {
  const pages = [];

  for (const batch of chunk(titles, PAGE_BATCH_SIZE)) {
    const payload = await fetchApiJson({
      action: "query",
      prop: "revisions|categories",
      titles: batch.join("|"),
      redirects: "1",
      rvprop: "content",
      rvslots: "main",
      cllimit: "max",
    });

    pages.push(...(payload?.query?.pages || []));
  }

  return pages;
}

async function fetchImageUrlMap(fileTitles) {
  const map = new Map();

  for (const batch of chunk(fileTitles, IMAGE_BATCH_SIZE)) {
    const payload = await fetchApiJson({
      action: "query",
      prop: "imageinfo",
      titles: batch.join("|"),
      iiprop: "url",
    });

    for (const page of payload?.query?.pages || []) {
      const title = page?.title;
      const url = page?.imageinfo?.[0]?.url;
      if (title && url) {
        map.set(title, url);
      }
    }
  }

  return map;
}

function mergeWithSeed(items, seededItems) {
  const seedMap = new Map(seededItems.map((item) => [item.id, item]));

  const merged = items.map((item) => {
    const seed = seedMap.get(item.id);
    if (!seed) return item;

    return {
      ...item,
      image: item.image || seed.image,
      description:
        item.description && !/monster encyclopedia|monster entry/i.test(item.description)
          ? item.description
          : seed.description,
      shortDescription:
        item.shortDescription && !/monster entry/i.test(item.shortDescription)
          ? item.shortDescription
          : seed.shortDescription,
      weaknesses: item.weaknesses.length ? item.weaknesses : seed.weaknesses,
      drops: item.drops.length ? item.drops : seed.drops,
      locations: item.locations.length ? item.locations : seed.locations,
      farmingTags: item.farmingTags.length ? item.farmingTags : seed.farmingTags,
      farmingReason:
        item.farmingReason && !/situational|encyclopedia/i.test(item.farmingReason)
          ? item.farmingReason
          : seed.farmingReason,
    };
  });

  const ids = new Set(merged.map((item) => item.id));
  for (const seed of seededItems) {
    if (!ids.has(seed.id)) {
      merged.push(seed);
    }
  }

  return merged;
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

async function refreshFromSource() {
  const [mobTitles, bossTitles] = await Promise.all([
    fetchEmbeddedTitles(MONSTER_TEMPLATE),
    fetchEmbeddedTitles(BOSS_TEMPLATE),
  ]);

  const titles = [...new Set([...mobTitles, ...bossTitles])]
    .filter((title) => title && !/^Monster\//i.test(title));

  const pages = await fetchPagesByTitles(titles);
  const parsedItems = pages
    .map((page) => buildMonsterItemFromPage(page))
    .filter(Boolean);

  if (!parsedItems.length) {
    throw new Error("No monsters could be parsed from Fandom source");
  }

  const dedupedMap = new Map();
  for (const item of parsedItems) {
    const current = dedupedMap.get(item.id);
    if (!current || item.hp > current.hp || item.level > current.level) {
      dedupedMap.set(item.id, item);
    }
  }

  const dedupedItems = [...dedupedMap.values()];
  const imageFiles = [...new Set(dedupedItems.map((item) => item.imageFile).filter(Boolean))];
  const imageMap = await fetchImageUrlMap(imageFiles);

  const seededFeed = getSeedMonsterFeed();
  const withImages = dedupedItems.map(({ imageFile, ...item }) => ({
    ...item,
    image: imageFile ? imageMap.get(imageFile) || null : null,
  }));
  const items = mergeWithSeed(withImages, seededFeed.items).sort((a, b) => a.name.localeCompare(b.name));

  const existing = (await readMonsterCacheFeed()) || seededFeed;
  const previousIds = new Set((existing.items || []).map((item) => item.id));
  const freshItemCount = items.reduce((count, item) => count + (previousIds.has(item.id) ? 0 : 1), 0);

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
