import {
  QUESTS_API_URL,
  QUESTS_BATCH_SIZE,
  QUESTS_CACHE_TTL_MINUTES,
  QUESTS_FETCH_TIMEOUT_MS,
  QUESTS_SOURCE_META,
} from "./config.mjs";
import { getSeedQuestFeed, readQuestCacheFeed, writeQuestCacheFeed } from "./cache.mjs";

let memoryFeed = null;
let refreshPromise = null;

function slugify(value = "") {
  return String(value)
    .toLowerCase()
    .replace(/[\u2019']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function splitIntoBatches(items, size) {
  const result = [];
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }
  return result;
}

function cleanCategory(title = "") {
  return title
    .replace(/^Category:/, "")
    .replace(/\s*Quests?$/i, "")
    .replace(/_/g, " ")
    .trim();
}

function cleanText(value = "") {
  return String(value)
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function deriveQuestName(title = "") {
  const parts = title.split("/");
  return parts[parts.length - 1]?.trim() || title.trim();
}

function deriveLevelBracket(title = "") {
  const match = title.match(/^Quests\/(\d+)/i);
  return match ? Number(match[1]) : null;
}

function normalizeQuestImageTitle(images = []) {
  const blocked = [
    "Wiki.png",
    "Wikia-Visualization",
    "Disambig",
    "Question Book",
    "Noimage",
  ];

  const first = images.find((image) => {
    const fileTitle = image?.title || "";
    return !blocked.some((token) => fileTitle.toLowerCase().includes(token.toLowerCase()));
  });

  return first?.title || null;
}

async function fandomApi(params) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), QUESTS_FETCH_TIMEOUT_MS);

  try {
    const url = new URL(QUESTS_API_URL);
    Object.entries({
      format: "json",
      origin: "*",
      ...params,
    }).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    });

    const response = await fetch(url, {
      headers: { "user-agent": "Mozilla/5.0" },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Quest request failed (${response.status})`);
    }

    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

async function getQuestPageTitles() {
  const queue = ["Category:Quests"];
  const seenCategories = new Set(queue);
  const pages = new Map();

  while (queue.length) {
    const categoryTitle = queue.shift();
    let cmcontinue = "";

    do {
      const payload = await fandomApi({
        action: "query",
        list: "categorymembers",
        cmtitle: categoryTitle,
        cmlimit: "500",
        cmcontinue,
      });

      const members = payload?.query?.categorymembers || [];

      for (const member of members) {
        if (member.ns === 14) {
          if (!seenCategories.has(member.title)) {
            seenCategories.add(member.title);
            queue.push(member.title);
          }
        } else if (member.ns === 0) {
          pages.set(member.title, member.pageid);
        }
      }

      cmcontinue = payload?.continue?.cmcontinue || "";
    } while (cmcontinue);
  }

  return [...pages.keys()].sort((left, right) => left.localeCompare(right));
}

async function getQuestMetadata(titles) {
  const results = [];
  const batches = splitIntoBatches(titles, QUESTS_BATCH_SIZE);

  for (const batch of batches) {
    const payload = await fandomApi({
      action: "query",
      prop: "categories|images",
      titles: batch.join("|"),
      cllimit: "50",
      imlimit: "10",
    });

    const pages = Object.values(payload?.query?.pages || {});
    for (const page of pages) {
      if (page.missing !== undefined) continue;
      const categories = (page.categories || [])
        .map((category) => cleanCategory(category.title))
        .filter(
          (category) =>
            category &&
            category !== "Quests" &&
            category !== "Notices" &&
            !category.startsWith("Pages using") &&
            !category.startsWith("Templates"),
        );

      results.push({
        pageId: page.pageid,
        pageTitle: page.title,
        name: deriveQuestName(page.title),
        levelBracket: deriveLevelBracket(page.title),
        category: categories[0] || "Quest",
        categories,
        imageTitle: normalizeQuestImageTitle(page.images),
      });
    }
  }

  return results;
}

async function getQuestImageMap(imageTitles) {
  const uniqueTitles = [...new Set(imageTitles.filter(Boolean))];
  const imageMap = new Map();
  const batches = splitIntoBatches(uniqueTitles, QUESTS_BATCH_SIZE);

  for (const batch of batches) {
    const payload = await fandomApi({
      action: "query",
      titles: batch.join("|"),
      prop: "imageinfo",
      iiprop: "url",
    });

    const pages = Object.values(payload?.query?.pages || {});
    for (const page of pages) {
      if (page.title && page.imageinfo?.[0]?.url) {
        imageMap.set(page.title, page.imageinfo[0].url);
      }
    }
  }

  return imageMap;
}

async function getQuestDetail(title) {
  const payload = await fandomApi({
    action: "parse",
    page: title,
    prop: "text|images|categories",
  });

  const html = payload?.parse?.text?.["*"] || "";
  const paragraphs = [...html.matchAll(/<p>(.*?)<\/p>/gsi)]
    .map((match) => cleanText(match[1]))
    .filter(Boolean)
    .slice(0, 3);
  const categories = (payload?.parse?.categories || [])
    .map((category) => cleanCategory(category["*"]))
    .filter(
      (category) =>
        category &&
        category !== "Quests" &&
        category !== "Notices" &&
        !category.startsWith("Pages using") &&
        !category.startsWith("Templates"),
    );

  const imageTitle = normalizeQuestImageTitle(
    (payload?.parse?.images || []).map((image) => ({ title: `File:${image.replace(/_/g, " ")}` })),
  );

  return {
    summary: paragraphs[0] || "No summary available yet.",
    notes: paragraphs.slice(1),
    categories,
    imageTitle,
  };
}

function stripTags(value = "") {
  return cleanText(
    String(value)
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/li>/gi, "\n")
      .replace(/<li[^>]*>/gi, "- ")
  );
}

function extractLinkTexts(value = "") {
  return [...String(value).matchAll(/<a\b[^>]*>(.*?)<\/a>/gsi)]
    .map((match) => cleanText(match[1]))
    .filter(Boolean);
}

function unique(items = []) {
  return [...new Set(items.filter(Boolean))];
}

function deriveMapsFromText(value = "") {
  const mapHints = [
    "city",
    "town",
    "forest",
    "cave",
    "temple",
    "tower",
    "dungeon",
    "castle",
    "village",
    "island",
    "road",
    "field",
    "path",
    "site",
    "mine",
    "park",
    "harbor",
    "station",
    "construction",
    "repair",
    "subway",
    "lane",
    "street",
  ];

  return unique(
    extractLinkTexts(value).filter((entry) =>
      mapHints.some((hint) => entry.toLowerCase().includes(hint))
    )
  );
}

function deriveNpcsFromText(value = "", knownMaps = []) {
  const mapSet = new Set(knownMaps);
  return unique(
    extractLinkTexts(value).filter(
      (entry) =>
        !mapSet.has(entry) &&
        !/^quests?\//i.test(entry) &&
        !/^level\s+\d+/i.test(entry) &&
        !/^\(.*\)$/.test(entry)
    )
  );
}

async function getQuestDetailPayload(item) {
  if (!item) {
    return null;
  }

  const payload = await fandomApi({
    action: "parse",
    page: item.pageTitle,
    prop: "text",
  });

  const html = payload?.parse?.text?.["*"] || "";
  const rowMatches = [...html.matchAll(/<tr[\s\S]*?<\/tr>/gsi)];
  const rows = rowMatches.map((match) => match[0]);

  const centeredNameRow = rows.find((row) => /align="center"[^>]*>\s*<a\b/i.test(row));
  const npcHeaderNames = centeredNameRow ? extractLinkTexts(centeredNameRow) : [];

  const infoRows = rows
    .map((row) => {
      const headerMatch = row.match(/<th[^>]*>(.*?)<\/th>/i);
      const cellMatch = row.match(/<td[^>]*>([\s\S]*?)<\/td>/i);
      if (!headerMatch || !cellMatch) {
        return null;
      }

      return {
        label: cleanText(headerMatch[1]).toLowerCase(),
        html: cellMatch[1],
        text: stripTags(cellMatch[1]),
      };
    })
    .filter(Boolean);

  const requirementsRow = infoRows.find((row) => row.label.includes("pre-requisites") || row.label.includes("requirements"));
  const rewardsRow = infoRows.find((row) => row.label.includes("rewards"));
  const procedureRow = infoRows.find((row) => row.label.includes("procedure"));
  const nextQuestRow = infoRows.find((row) => row.label.includes("unlocked quest"));
  const availableRow = infoRows.find((row) => row.label === "available");
  const progressRow = infoRows.find((row) => row.label.includes("in progress"));
  const completedRow = infoRows.find((row) => row.label === "completed");

  const maps = unique([
    ...deriveMapsFromText(procedureRow?.html || ""),
    ...deriveMapsFromText(availableRow?.html || ""),
    ...deriveMapsFromText(progressRow?.html || ""),
    ...[...html.matchAll(/<span class="blue-text">(.*?)<\/span>/gsi)].map((match) => cleanText(match[1])),
  ]);

  const npcs = unique([
    ...npcHeaderNames,
    ...deriveNpcsFromText(procedureRow?.html || "", maps),
    ...deriveNpcsFromText(availableRow?.html || "", maps),
  ]);

  const requirements = unique(
    (requirementsRow?.text || "")
      .split(/\n+/)
      .map((entry) => entry.replace(/^-+\s*/, "").trim())
      .filter(Boolean)
  );

  const rewards = unique(
    (rewardsRow?.text || "")
      .split(/\n+/)
      .map((entry) => entry.replace(/^-+\s*/, "").trim())
      .filter(Boolean)
  );

  const steps = unique(
    (procedureRow?.text || "")
      .split(/\n+/)
      .map((entry) => entry.replace(/^\d+\.\s*/, "").replace(/^-+\s*/, "").trim())
      .filter(Boolean)
  );

  const nextQuests = unique(extractLinkTexts(nextQuestRow?.html || ""));
  const notes = [availableRow?.text, progressRow?.text, completedRow?.text]
    .filter(Boolean)
    .map((entry) => entry.trim());

  return {
    quest: item,
    requirements,
    rewards,
    npcs,
    maps,
    steps,
    nextQuests,
    notes,
  };
}

async function buildQuestFeed() {
  const titles = await getQuestPageTitles();
  const metadata = await getQuestMetadata(titles);
  const imageMap = await getQuestImageMap(metadata.map((entry) => entry.imageTitle));

  const items = metadata.map((entry) => ({
    id: slugify(entry.pageTitle),
    pageId: entry.pageId,
    pageTitle: entry.pageTitle,
    name: entry.name,
    category: entry.category,
    categories: entry.categories,
    levelBracket: entry.levelBracket,
    summary: entry.levelBracket
      ? `Level ${entry.levelBracket} quest route from the MapleStory quest database.`
      : `${entry.category} quest entry from the MapleStory quest database.`,
    notes: [],
    image: entry.imageTitle ? imageMap.get(entry.imageTitle) || null : null,
    imageTitle: entry.imageTitle,
    wikiUrl: `https://maplestory.fandom.com/wiki/${encodeURIComponent(entry.pageTitle)}`,
  }));

  return {
    items,
    meta: {
      ...QUESTS_SOURCE_META,
      updatedAt: new Date().toISOString(),
      syncState: "synced",
      itemCount: items.length,
    },
  };
}

function isFeedFresh(feed) {
  const updatedAt = new Date(feed?.meta?.updatedAt || 0).getTime();
  if (!updatedAt) return false;
  return Date.now() - updatedAt < QUESTS_CACHE_TTL_MINUTES * 60 * 1000;
}

export async function getQuestFeed({ forceRefresh = false } = {}) {
  if (!forceRefresh && memoryFeed && isFeedFresh(memoryFeed)) {
    return memoryFeed;
  }

  if (!forceRefresh) {
    const cached = await readQuestCacheFeed();
    if (cached?.items?.length && isFeedFresh(cached)) {
      memoryFeed = cached;
      return cached;
    }
  }

  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const feed = await buildQuestFeed();
        memoryFeed = feed;
        await writeQuestCacheFeed(feed);
        return feed;
      } catch (error) {
        const cached = await readQuestCacheFeed();
        if (cached?.items?.length) {
          memoryFeed = cached;
          return cached;
        }
        const seed = getSeedQuestFeed();
        memoryFeed = seed;
        return seed;
      } finally {
        refreshPromise = null;
      }
    })();
  }

  return refreshPromise;
}

export async function getQuestById(id) {
  if (!id) {
    return null;
  }

  const feed = await getQuestFeed();
  return feed.items.find((item) => item.id === id) ?? null;
}

export async function getQuestDetailById(id) {
  const item = await getQuestById(id);
  if (!item) {
    return null;
  }

  try {
    return await getQuestDetailPayload(item);
  } catch {
    return {
      quest: item,
      requirements: [],
      rewards: [],
      npcs: [],
      maps: [],
      steps: [],
      nextQuests: [],
      notes: item.notes,
    };
  }
}
