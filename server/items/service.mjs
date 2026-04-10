import {
  ITEMS_API_URL,
  ITEMS_CACHE_TTL_MINUTES,
  ITEMS_FETCH_TIMEOUT_MS,
  ITEMS_SOURCE_META,
  ITEMS_SOURCE_URL,
} from "./config.mjs";
import { getSeedItemFeed, readItemCacheFeed, writeItemCacheFeed } from "./cache.mjs";

const ROOT_CATEGORY = "Category:Items";
const PAGE_BATCH_SIZE = 50;
const IMAGE_BATCH_SIZE = 40;
const ITEM_TEMPLATE_NAMES = new Set([
  "equip",
  "equipment",
  "usable",
  "etc",
  "cash",
  "set-up",
  "setup",
  "pet",
  "pet equip",
  "install",
]);
const TYPE_LABELS = {
  equip: "Equipment",
  equipment: "Equipment",
  usable: "Usable",
  etc: "Etc",
  cash: "Cash",
  "set-up": "Set-up",
  setup: "Set-up",
  install: "Set-up",
  pet: "Pet",
  "pet equip": "Pet",
};

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
      .replace(/<br\s*\/?>/gi, " · ")
      .replace(/'''?/g, "")
      .replace(/\{\{!}}/g, "|")
      .replace(/\{\{[^{}]*\}\}/g, " ")
      .replace(/\[\[(?:[^|\]]*\|)?([^\]]+)\]\]/g, "$1")
      .replace(/[\[\]]/g, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  );
}

function slugify(value = "") {
  return stripMarkup(value)
    .toLowerCase()
    .replace(/[\u2019']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function toNumber(value, fallback = null) {
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

function splitList(value = "") {
  const lines = value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const list = [];

  for (const line of lines) {
    if (line.startsWith("*")) {
      const entry = stripMarkup(line.replace(/^\*+\s*/, ""));
      if (entry) list.push(entry);
    }
  }

  if (!list.length) {
    const clean = stripMarkup(value);
    if (clean && !/^(none|n\/a)$/i.test(clean)) {
      list.push(...clean.split(/\s*·\s*|\s*,\s*/).filter(Boolean));
    }
  }

  return [...new Set(list)].slice(0, 18);
}

function parseLinks(value = "") {
  const links = [];
  const pattern = /\[\[([^|\]#]+)(?:#[^|\]]*)?(?:\|([^\]]+))?\]\]/g;

  for (const match of value.matchAll(pattern)) {
    const target = match[1]?.trim();
    const label = stripMarkup(match[2] || match[1] || "").trim();

    if (!target || !label || /^(File|Category|Template|User|Help|Module):/i.test(target)) {
      continue;
    }

    links.push(label);
  }

  return [...new Set(links)];
}

function extractImageFile(value = "") {
  const match = value.match(/\[\[(?:File|Image):([^|\]]+)/i);
  return match?.[1]?.trim() || null;
}

function extractCategories(wikitext = "") {
  return [...wikitext.matchAll(/\[\[Category:([^\]]+)\]\]/gi)]
    .map((match) => stripMarkup(match[1] || ""))
    .filter(Boolean);
}

function extractTemplateBlock(wikitext = "") {
  const startPattern = /\{\{([A-Za-z -]+)(?:<!--[\s\S]*?-->)?/g;
  let match;

  while ((match = startPattern.exec(wikitext))) {
    const templateName = (match[1] || "").trim().toLowerCase();
    if (!ITEM_TEMPLATE_NAMES.has(templateName)) {
      continue;
    }

    let depth = 0;
    let endIndex = -1;

    for (let index = match.index; index < wikitext.length - 1; index += 1) {
      const pair = wikitext.slice(index, index + 2);
      if (pair === "{{") {
        depth += 1;
        index += 1;
        continue;
      }
      if (pair === "}}") {
        depth -= 1;
        index += 1;
        if (depth === 0) {
          endIndex = index + 1;
          break;
        }
      }
    }

    if (endIndex !== -1) {
      return {
        templateName,
        block: wikitext.slice(match.index, endIndex),
      };
    }
  }

  return null;
}

function parseTemplateParameters(block = "") {
  const lines = block.split("\n");
  const parameters = {};
  let currentKey = null;

  for (const line of lines.slice(1)) {
    if (line.startsWith("|")) {
      const dividerIndex = line.indexOf("=");
      if (dividerIndex === -1) {
        continue;
      }
      currentKey = line.slice(1, dividerIndex).trim().toLowerCase();
      parameters[currentKey] = line.slice(dividerIndex + 1).trim();
      continue;
    }

    if (currentKey) {
      parameters[currentKey] = `${parameters[currentKey]}\n${line}`.trim();
    }
  }

  return parameters;
}

function inferType(templateName = "", categories = []) {
  const direct = TYPE_LABELS[templateName];
  if (direct) return direct;

  const source = categories.join(" ").toLowerCase();
  if (/pet/.test(source)) return "Pet";
  if (/cash/.test(source)) return "Cash";
  if (/equipment|hat|weapon|overall|cape|shield|shoes|glove|ring|pendant|accessory/.test(source)) return "Equipment";
  if (/potion|food|consumable|scroll|elixir|buff/.test(source)) return "Usable";
  if (/setup|chair|music/.test(source)) return "Set-up";
  return "Etc";
}

function inferCategory(categories = [], type = "Etc") {
  const clean = categories.find(
    (category) =>
      !/^(items|equipment|usable items|etc\. items|cash items|set-up items|pet items)$/i.test(category),
  );
  return clean || type;
}

function inferRarity(type, categories = [], sourceMonsters = [], rewards = []) {
  const source = `${type} ${categories.join(" ")} ${sourceMonsters.join(" ")} ${rewards.join(" ")}`.toLowerCase();
  if (/boss|zakum|horntail|bean|magnus|lotus|damien|lucid|will|seren|black mage/.test(source)) return "Epic";
  if (/rare|recipe|scroll|chair|medal|familiar|helmet|weapon/.test(source)) return "Rare";
  return "Common";
}

function uniqueText(values = []) {
  return [...new Set(values.map((value) => stripMarkup(value)).filter(Boolean))];
}

async function fetchJson(url) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), ITEMS_FETCH_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        headers: {
          "user-agent": "SNAILSLAYER items sync bot/1.0",
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        if (response.status >= 500 && attempt < 2) {
          await new Promise((resolve) => setTimeout(resolve, 600 * (attempt + 1)));
          continue;
        }
        throw new Error(`Request failed (${response.status}) for ${url}`);
      }

      return await response.json();
    } catch (error) {
      if (attempt >= 2) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, 600 * (attempt + 1)));
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new Error(`Request failed after retries for ${url}`);
}

async function fetchCategoryMembers(categoryTitle) {
  const members = [];
  let continuation = null;

  do {
    const url = new URL(ITEMS_API_URL);
    url.searchParams.set("action", "query");
    url.searchParams.set("list", "categorymembers");
    url.searchParams.set("cmtitle", categoryTitle);
    url.searchParams.set("cmtype", "page|subcat");
    url.searchParams.set("cmlimit", "500");
    url.searchParams.set("format", "json");
    url.searchParams.set("formatversion", "2");
    if (continuation) {
      url.searchParams.set("cmcontinue", continuation);
    }

    const payload = await fetchJson(url.toString());
    members.push(...(payload?.query?.categorymembers || []));
    continuation = payload?.continue?.cmcontinue || null;
  } while (continuation);

  return members;
}

async function collectItemTitles() {
  const categoriesToVisit = [ROOT_CATEGORY];
  const visited = new Set();
  const titles = new Set();

  while (categoriesToVisit.length) {
    const category = categoriesToVisit.shift();
    if (!category || visited.has(category)) {
      continue;
    }

    visited.add(category);
    const members = await fetchCategoryMembers(category);

    for (const member of members) {
      if (member.ns === 14) {
        categoriesToVisit.push(member.title);
      } else if (member.ns === 0) {
        titles.add(member.title);
      }
    }
  }

  return [...titles];
}

async function fetchPagesByTitles(titles) {
  const pages = [];

  for (let index = 0; index < titles.length; index += PAGE_BATCH_SIZE) {
    const batch = titles.slice(index, index + PAGE_BATCH_SIZE);
    const url = new URL(ITEMS_API_URL);
    url.searchParams.set("action", "query");
    url.searchParams.set("titles", batch.join("|"));
    url.searchParams.set("prop", "revisions");
    url.searchParams.set("rvprop", "content");
    url.searchParams.set("rvslots", "main");
    url.searchParams.set("redirects", "1");
    url.searchParams.set("format", "json");
    url.searchParams.set("formatversion", "2");

    const payload = await fetchJson(url.toString());
    pages.push(...(payload?.query?.pages || []));
  }

  return pages;
}

async function fetchImageUrls(fileNames) {
  const imageMap = new Map();

  for (let index = 0; index < fileNames.length; index += IMAGE_BATCH_SIZE) {
    const batch = fileNames.slice(index, index + IMAGE_BATCH_SIZE).map((name) => `File:${name}`);
    const url = new URL(ITEMS_API_URL);
    url.searchParams.set("action", "query");
    url.searchParams.set("titles", batch.join("|"));
    url.searchParams.set("prop", "imageinfo");
    url.searchParams.set("iiprop", "url");
    url.searchParams.set("format", "json");
    url.searchParams.set("formatversion", "2");

    const payload = await fetchJson(url.toString());
    const pages = payload?.query?.pages || [];

    for (const page of pages) {
      const fileName = page?.title?.replace(/^File:/i, "") || "";
      const imageUrl = page?.imageinfo?.[0]?.url || null;
      if (fileName && imageUrl) {
        imageMap.set(fileName, imageUrl);
      }
    }
  }

  return imageMap;
}

function normalizeItemPage(page, imageMap) {
  const wikitext = page?.revisions?.[0]?.slots?.main?.content || "";
  const template = extractTemplateBlock(wikitext);

  if (!template) {
    return null;
  }

  const parameters = parseTemplateParameters(template.block);
  const categories = extractCategories(wikitext);
  const imageFile = extractImageFile(parameters.image || "");
  const sourceMonsters = uniqueText(parseLinks(parameters.mob || "").concat(splitList(parameters.mob || ""))).slice(0, 18);
  const rewardSources = uniqueText(parseLinks(parameters.reward || "").concat(splitList(parameters.reward || ""))).slice(0, 10);
  const npcSources = uniqueText(parseLinks(parameters.npc || "").concat(splitList(parameters.npc || ""))).slice(0, 10);
  const craftSources = uniqueText(parseLinks(parameters.craft || "").concat(parseLinks(parameters.crafting || "").concat(splitList(parameters.craft || "")))).slice(0, 10);
  const type = inferType(template.templateName, categories);
  const category = inferCategory(categories, type);
  const name = stripMarkup(parameters.name || page.title);
  const description = stripMarkup(parameters.desc || parameters.effect || "MapleStory item entry.");
  const effect = stripMarkup(parameters.effect || "");
  const level = toNumber(parameters.lvl || parameters.level, null);
  const rarity = inferRarity(type, categories, sourceMonsters, rewardSources);
  const sourceCount =
    sourceMonsters.length +
    rewardSources.length +
    npcSources.length +
    craftSources.length;

  return {
    id: slugify(name) || slugify(page.title),
    name,
    image: imageFile ? imageMap.get(imageFile) || null : null,
    imageFile,
    type,
    category,
    rarity,
    level,
    description,
    effect,
    sourceMonsters,
    rewardSources,
    npcSources,
    craftSources,
    sourceCount,
    wikiUrl: `https://maplestory.fandom.com/wiki/${encodeURIComponent(page.title.replace(/ /g, "_"))}`,
  };
}

function normalizeItemFeed(items) {
  const dedupedMap = new Map();

  for (const item of items) {
    if (!item?.id || dedupedMap.has(item.id)) {
      continue;
    }
    dedupedMap.set(item.id, item);
  }

  const dedupedItems = [...dedupedMap.values()].sort((left, right) => left.name.localeCompare(right.name));

  return {
    items: dedupedItems,
    meta: {
      ...ITEMS_SOURCE_META,
      updatedAt: new Date().toISOString(),
      syncState: "synced",
      itemCount: dedupedItems.length,
    },
  };
}

async function refreshItemFeed() {
  const titles = await collectItemTitles();
  const pages = await fetchPagesByTitles(titles);
  const imageFiles = pages
    .map((page) => {
      const wikitext = page?.revisions?.[0]?.slots?.main?.content || "";
      const template = extractTemplateBlock(wikitext);
      if (!template) return null;
      const parameters = parseTemplateParameters(template.block);
      return extractImageFile(parameters.image || "");
    })
    .filter(Boolean);

  const imageMap = await fetchImageUrls([...new Set(imageFiles)]);
  const normalizedItems = pages
    .map((page) => normalizeItemPage(page, imageMap))
    .filter(Boolean);

  const feed = normalizeItemFeed(normalizedItems);
  memoryFeed = feed;
  await writeItemCacheFeed(feed);
  return feed;
}

function isFresh(feed) {
  if (!feed?.meta?.updatedAt) {
    return false;
  }

  const updatedAt = Date.parse(feed.meta.updatedAt);
  if (!Number.isFinite(updatedAt)) {
    return false;
  }

  return Date.now() - updatedAt < ITEMS_CACHE_TTL_MINUTES * 60 * 1000;
}

export async function getItemFeed(options = {}) {
  const { forceRefresh = false } = options;

  if (!forceRefresh && memoryFeed && isFresh(memoryFeed)) {
    return memoryFeed;
  }

  if (!forceRefresh) {
    const cachedFeed = await readItemCacheFeed();
    if (cachedFeed && isFresh(cachedFeed)) {
      memoryFeed = cachedFeed;
      return cachedFeed;
    }
  }

  if (inFlightRefresh) {
    return inFlightRefresh;
  }

  inFlightRefresh = refreshItemFeed()
    .catch(async (error) => {
      console.error("[items] Refresh failed:", error);
      const cachedFeed = await readItemCacheFeed();
      if (cachedFeed) {
        memoryFeed = cachedFeed;
        return {
          ...cachedFeed,
          meta: {
            ...cachedFeed.meta,
            syncState: "stale",
          },
        };
      }

      return {
        ...getSeedItemFeed(),
        meta: {
          ...ITEMS_SOURCE_META,
          updatedAt: new Date().toISOString(),
          syncState: "stale",
          itemCount: 0,
        },
      };
    })
    .finally(() => {
      inFlightRefresh = null;
    });

  return inFlightRefresh;
}

export { ITEMS_SOURCE_URL };
