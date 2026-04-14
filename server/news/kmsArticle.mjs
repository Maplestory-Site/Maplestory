import { KMS_ARTICLE_CACHE_FILE, KMS_ARTICLE_TTL_MINUTES, KMS_SOURCE } from "./config.mjs";
import { parseArticleHtml, detectCategory } from "./articleParser.mjs";
import { fetchHtml } from "./fetchHtml.mjs";
import { sanitizeText } from "./normalize.mjs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const PARSER_VERSION = 18;

function extractDate(html = "") {
  const metaMatch = /property=["']article:published_time["'][^>]*content=["']([^"']+)["']/i.exec(html);
  if (metaMatch) return sanitizeText(metaMatch[1]);
  const timeMatch = /<time[^>]*>([^<]+)<\/time>/i.exec(html);
  if (timeMatch) return sanitizeText(timeMatch[1]);
  const entryMatch = /<span class="entry-date[^"]*">([\s\S]*?)<\/span>/i.exec(html);
  if (entryMatch) return sanitizeText(entryMatch[1].replace(/<[^>]*>/g, " "));
  return "";
}

function extractTags(html = "") {
  const match = /Tags:\s*([\s\S]*?)<\/p>/i.exec(html);
  if (!match) return [];
  const raw = match[1];
  return raw
    .split(/<\/a>/i)
    .map((chunk) => sanitizeText(chunk.replace(/<[^>]*>/g, " ")))
    .filter(Boolean)
    .slice(0, 10);
}

function buildHighlights(sections = []) {
  const picks = [];
  sections.forEach((section) => {
    section.details.forEach((detail) => {
      if (picks.length >= 6) return;
      if (detail?.type === "text" && detail.value) {
        picks.push(detail.value);
      }
      if (detail?.type === "list" && detail.items?.length) {
        picks.push(detail.items[0]);
      }
    });
  });
  return picks.slice(0, 6);
}

function buildKeyChanges(sections = []) {
  const picks = [];
  sections.forEach((section) => {
    section.details.forEach((detail) => {
      if (picks.length >= 6) return;
      if (detail?.type === "text" && detail.value) {
        picks.push(detail.value);
      }
      if (detail?.type === "list" && detail.items?.length) {
        picks.push(detail.items[0]);
      }
    });
  });
  return picks.slice(0, 6);
}

function buildAudience(sections = []) {
  const text = sections.map((section) => section.title).join(" ").toLowerCase();
  if (text.includes("boss")) {
    return "Affects bossing-focused players and progression clears.";
  }
  if (text.includes("class") || text.includes("job") || text.includes("skill")) {
    return "Affects class mains and players tracking skill changes.";
  }
  if (text.includes("event")) {
    return "Affects players chasing event rewards and limited content.";
  }
  if (text.includes("system") || text.includes("ui") || text.includes("qol")) {
    return "Affects all players through system or quality-of-life updates.";
  }
  return "Affects progression planning and upcoming content prep.";
}

function enrichSections(sections = []) {
  return sections.map((section) => {
    const firstText = section.details.find((detail) => detail?.type === "text")?.value || "";
    return {
      ...section,
      summary: firstText || "",
      impact: "",
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
  return Date.now() - new Date(entry.cachedAt).getTime() < KMS_ARTICLE_TTL_MINUTES * 60 * 1000;
}

export async function fetchKmsArticle(url, { forceRefresh = false } = {}) {
  const cache = (await readJson(KMS_ARTICLE_CACHE_FILE)) ?? {};
  if (!forceRefresh && cache[url] && isFresh(cache[url]) && cache[url].payload?.parserVersion === PARSER_VERSION) {
    return cache[url].payload;
  }

  const response = await fetchHtml(url);
  if (!response || response.statusCode < 200 || response.statusCode >= 300) {
    throw new Error(`Failed to fetch KMS article: ${response?.statusCode ?? "unknown"}`);
  }

  const html = response.text || "";
  const parsed = parseArticleHtml(html, url);

  const enrichedSections = enrichSections(parsed.sections);
  const totalDetails = enrichedSections.reduce((sum, section) => sum + (section.details?.length || 0), 0);
  const payload = {
    parserVersion: PARSER_VERSION,
    sourceName: KMS_SOURCE.sourceName,
    sourceUrl: url,
    date: extractDate(html),
    summary: parsed.summary || "",
    tags: extractTags(html),
    highlights: buildHighlights(enrichedSections),
    keyChanges: buildKeyChanges(enrichedSections),
    audience: buildAudience(enrichedSections),
    sections: enrichedSections,
    categories: parsed.categories,
    heroImage: parsed.heroImage,
    fullText: parsed.fullText,
    debug:
      process.env.NODE_ENV !== "production"
        ? {
            url,
            htmlLength: html.length,
            stats: parsed.stats,
            sectionCount: enrichedSections.length,
            detailCount: totalDetails
          }
        : undefined
  };

  cache[url] = { cachedAt: new Date().toISOString(), payload };
  await writeJson(KMS_ARTICLE_CACHE_FILE, cache);
  return payload;
}
