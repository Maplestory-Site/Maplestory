import { GMS_ARTICLE_CACHE_FILE, GMS_ARTICLE_TTL_MINUTES, OFFICIAL_SOURCE } from "./config.mjs";
import { parseArticleHtml, detectCategory, groupSectionsByCategory } from "./articleParser.mjs";
import { sanitizeText } from "./normalize.mjs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const PARSER_VERSION = 6;

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

function isTitleLike(value = "") {
  const text = sanitizeText(value || "");
  if (!text) return false;
  if (text.length > 70) return false;
  if (/^[0-9]+\.\s+/.test(text)) return true;
  if (/^[A-Z][A-Za-z0-9 '&:/+\-]{2,}$/.test(text)) return true;
  return text.split(/\s+/).length <= 5;
}

function normalizeInlineTitle(value = "") {
  return sanitizeText(String(value || "").replace(/^[0-9]+\.\s*/, "").replace(/:$/, ""));
}

function pickSectionSummary(details = []) {
  return (
    details.find((detail) => detail?.type === "text" && detail.value && !isTitleLike(detail.value) && detail.value.length > 50)?.value ||
    details.find((detail) => detail?.type === "list" && detail.items?.length)?.items?.[0] ||
    details.find((detail) => detail?.type === "text" && detail.value)?.value ||
    ""
  );
}

function deriveSectionTitle(section, index) {
  const genericTitles = new Set(["Overview", "Main Changes", "Details", "Additional Info", "Full Article"]);
  const details = section?.details || [];
  if (!genericTitles.has(section?.title || "")) {
    return sanitizeText(section.title || "");
  }

  const firstSubheading = details.find((detail) => detail?.type === "subheading" && detail.value)?.value;
  if (firstSubheading) {
    return normalizeInlineTitle(firstSubheading);
  }

  const firstText = details.find((detail) => detail?.type === "text" && detail.value)?.value;
  if (firstText && isTitleLike(firstText)) {
    return normalizeInlineTitle(firstText);
  }

  return index === 0 ? "Overview" : section.title || "Overview";
}

function promoteSectionTitles(sections = []) {
  return sections.map((section, index) => {
    const nextTitle = deriveSectionTitle(section, index);
    const details = [...(section.details || [])];

    const firstTextIndex = details.findIndex((detail) => detail?.type === "text" && detail.value);
    if (firstTextIndex >= 0) {
      const firstText = sanitizeText(details[firstTextIndex].value || "");
      if (firstText && normalizeInlineTitle(firstText) === nextTitle && isTitleLike(firstText)) {
        details.splice(firstTextIndex, 1);
      }
    }

    const summary = pickSectionSummary(details);
    return {
      ...section,
      title: nextTitle,
      summary,
      details
    };
  });
}

function splitSectionsOnInlineTitles(sections = []) {
  const split = [];

  sections.forEach((section, sectionIndex) => {
    const details = [...(section.details || [])];
    if (!details.length) {
      split.push(section);
      return;
    }

    const baseTitle = deriveSectionTitle(section, sectionIndex);
    let bucket = {
      ...section,
      title: baseTitle,
      details: []
    };

    const flushBucket = () => {
      if (!bucket.details.length) return;
      split.push(bucket);
    };

    details.forEach((detail, detailIndex) => {
      const titleCandidate =
        detail?.type === "subheading"
          ? normalizeInlineTitle(detail.value)
          : detail?.type === "text" && isTitleLike(detail.value)
            ? normalizeInlineTitle(detail.value)
            : "";

      const canStartNewSection =
        Boolean(titleCandidate) &&
        titleCandidate !== bucket.title &&
        bucket.details.length >= 2 &&
        detailIndex < details.length - 1;

      if (canStartNewSection) {
        flushBucket();
        bucket = {
          ...section,
          title: titleCandidate,
          details: []
        };
        return;
      }

      bucket.details.push(detail);
    });

    flushBucket();
  });

  return split;
}

function buildKeyPoints(sections = []) {
  const points = [];
  const seen = new Set();
  sections.forEach((section) => {
    const summary = sanitizeText(section.summary || "");
    if (summary && summary.length > 45 && !seen.has(summary)) {
      seen.add(summary);
      points.push(summary);
    }

    section.details.forEach((detail) => {
      if (points.length >= 6) return;
      if (detail?.type === "text" && detail.value) {
        const value = sanitizeText(detail.value);
        if (value.length > 45 && !isTitleLike(value) && !seen.has(value)) {
          seen.add(value);
          points.push(value);
        }
      }
      if (detail?.type === "list" && detail.items?.length) {
        const firstItem = sanitizeText(detail.items[0] || "");
        if (firstItem.length > 45 && !seen.has(firstItem)) {
          seen.add(firstItem);
          points.push(firstItem);
        }
      }
    });
  });

  return points.slice(0, 6);
}

function enrichSections(sections = []) {
  return promoteSectionTitles(splitSectionsOnInlineTitles(sections)).map((section) => {
    const firstText = pickSectionSummary(section.details);
    return {
      ...section,
      summary: firstText || section.summary || "",
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

export async function fetchGmsArticle(url, { forceRefresh = false } = {}) {
  const cache = (await readJson(GMS_ARTICLE_CACHE_FILE)) ?? {};
  if (!forceRefresh && cache[url] && isFresh(cache[url]) && cache[url].payload?.parserVersion === PARSER_VERSION) {
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
    categories: groupSectionsByCategory(enrichedSections),
    heroImage: parsed.heroImage || (data?.imageThumbnail ? `https://g.nexonstatic.com${data.imageThumbnail}` : "")
  };

  try {
    cache[url] = { cachedAt: new Date().toISOString(), payload };
    await writeJson(GMS_ARTICLE_CACHE_FILE, cache);
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[GMS] Failed to persist article cache.", error);
    }
  }

  return payload;
}
