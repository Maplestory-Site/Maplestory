import { GMS_ARTICLE_CACHE_FILE, GMS_ARTICLE_TTL_MINUTES, OFFICIAL_SOURCE } from "./config.mjs";
import { parseArticleHtml, detectCategory } from "./articleParser.mjs";
import { sanitizeText } from "./normalize.mjs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const PARSER_VERSION = 3;

function extractIdFromUrl(url = "") {
  const match = /\/news\/[^/]+\/(\d+)/.exec(url);
  if (match) return match[1];
  const alt = /\/news\/[^/]+\/(\d+)\//.exec(url);
  return alt ? alt[1] : "";
}

function extractDate(html = "") {
  const metaMatch = /property=["']article:published_time["'][^>]*content=["']([^"']+)["']/i.exec(html);
  if (metaMatch) return sanitizeText(metaMatch[1]);
  const timeMatch = /<time[^>]*>([^<]+)<\/time>/i.exec(html);
  if (timeMatch) return sanitizeText(timeMatch[1]);
  const entryMatch = /<span class="news-article__date[^"]*">([\s\S]*?)<\/span>/i.exec(html);
  if (entryMatch) return sanitizeText(entryMatch[1].replace(/<[^>]*>/g, " "));
  return "";
}

function buildKeyPoints(sections = []) {
  const points = [];
  sections.forEach((section) => {
    section.details.forEach((detail) => {
      if (points.length >= 6) return;
      if (detail?.type === "text" && detail.value) {
        points.push(detail.value);
      }
      if (detail?.type === "list" && detail.items?.length) {
        points.push(detail.items[0]);
      }
    });
  });
  return points.slice(0, 6);
}

function enrichSections(sections = []) {
  return sections.map((section) => {
    const firstText = section.details.find((detail) => detail?.type === "text")?.value || "";
    return {
      ...section,
      summary: firstText || "",
      topic: detectCategory(section)
    };
  });
}

async function readJson(file) {
  try {
    const raw = await readFile(file, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function writeJson(file, payload) {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function isFresh(entry) {
  if (!entry?.cachedAt) return false;
  return Date.now() - new Date(entry.cachedAt).getTime() < GMS_ARTICLE_TTL_MINUTES * 60 * 1000;
}

export async function fetchGmsArticle(url) {
  const cache = (await readJson(GMS_ARTICLE_CACHE_FILE)) ?? {};
  if (cache[url] && isFresh(cache[url]) && cache[url].payload?.parserVersion === PARSER_VERSION) {
    return cache[url].payload;
  }

  const id = extractIdFromUrl(url);
  if (!id) {
    throw new Error("Failed to determine GMS article id.");
  }

  const cmsUrl = `https://g.nexonstatic.com/maplestory/cms/v1/news/${id}`;
  const response = await fetch(cmsUrl, {
    headers: {
      Accept: "application/json",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch GMS article: ${response.status}`);
  }

  const data = await response.json();
  const bodyHtml = typeof data?.body === "string" ? data.body : "";
  const wrapper = `<div class="gms-body">${bodyHtml}</div>`;
  const parsed = parseArticleHtml(wrapper, url);

  const enrichedSections = enrichSections(parsed.sections);
  const payload = {
    parserVersion: PARSER_VERSION,
    sourceName: OFFICIAL_SOURCE.sourceName,
    sourceUrl: url,
    date: sanitizeText(data?.liveDate || "") || extractDate(bodyHtml),
    summary: sanitizeText(data?.summary || "") || parsed.summary || "",
    keyPoints: buildKeyPoints(enrichedSections),
    sections: enrichedSections,
    categories: parsed.categories,
    heroImage: parsed.heroImage || (data?.imageThumbnail ? `https://g.nexonstatic.com${data.imageThumbnail}` : "")
  };

  cache[url] = { cachedAt: new Date().toISOString(), payload };
  await writeJson(GMS_ARTICLE_CACHE_FILE, cache);
  return payload;
}
