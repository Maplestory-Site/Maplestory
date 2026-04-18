import { fetchGmsArticle } from "../server/news/gmsArticle.mjs";
import { fetchHtml } from "../server/news/fetchHtml.mjs";
import { buildKmsPayloadFromHtml, fetchKmsArticle } from "../server/news/kmsArticle.mjs";
import { getKmsFeed } from "../server/news/kmsFeed.mjs";
import { sanitizeText } from "../server/news/normalize.mjs";
import { getLatestNews, getNewsFeed, getNewsItemById } from "../server/news/service.mjs";
import { getYoutubeFeed } from "../server/youtube/feed.mjs";

function decodeTranslatePayload(payload) {
  if (!Array.isArray(payload) || !Array.isArray(payload[0])) return "";
  return payload[0]
    .map((part) => (Array.isArray(part) ? part[0] : ""))
    .filter(Boolean)
    .join("");
}

const translationMemory = new Map();
const MAX_TRANSLATE_CONCURRENCY = 8;

function normalizeTranslateLanguage(language = "en") {
  const normalized = String(language).toLowerCase();
  if (normalized === "zh") return "zh-CN";
  return normalized;
}

function isLikelyUntranslatedIdentity(source = "", translated = "", language = "en") {
  if (!source || !translated || normalizeTranslateLanguage(language) === "en") return false;
  const normalize = (value) => String(value).replace(/\s+/g, " ").trim();
  const original = normalize(source);
  const candidate = normalize(translated);
  if (original !== candidate) return false;
  return original.length > 12 && /\s/.test(original) && /[A-Za-z]{3,}/.test(original);
}

function splitLongTranslateText(text) {
  if (text.length <= 1400) return [text];
  const paragraphs = text.split(/\n{2,}/).filter(Boolean);
  if (paragraphs.length > 1 && paragraphs.every((paragraph) => paragraph.length <= 1400)) {
    return paragraphs;
  }

  const chunks = [];
  let buffer = "";
  const sentences = text.split(/(?<=[.!?。！？])\s+/);
  for (const sentence of sentences) {
    if ((buffer + " " + sentence).trim().length > 1400 && buffer) {
      chunks.push(buffer.trim());
      buffer = sentence;
    } else {
      buffer = `${buffer} ${sentence}`.trim();
    }
  }
  if (buffer) chunks.push(buffer.trim());
  return chunks.length ? chunks : [text];
}

async function translateSingleText(text, language) {
  const targetLanguage = normalizeTranslateLanguage(language);
  const cacheKey = `${targetLanguage}\u0001${text}`;
  if (translationMemory.has(cacheKey)) {
    return translationMemory.get(cacheKey);
  }

  const chunks = splitLongTranslateText(text);
  const translatedChunks = [];

  for (const chunk of chunks) {
    const endpoint = new URL("https://translate.googleapis.com/translate_a/single");
    endpoint.searchParams.set("client", "gtx");
    endpoint.searchParams.set("sl", "auto");
    endpoint.searchParams.set("tl", targetLanguage);
    endpoint.searchParams.set("dt", "t");
    endpoint.searchParams.set("q", chunk);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
      const response = await fetch(endpoint, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
          Accept: "application/json,text/plain,*/*"
        },
        signal: controller.signal
      });

      if (!response.ok) {
        if (process.env.NODE_ENV !== "production") {
          console.warn("[translate-batch] upstream non-ok response", {
            language: targetLanguage,
            status: response.status,
            textPreview: text.slice(0, 120)
          });
        }
        return text;
      }

      const payload = await response.json();
      const translatedChunk = decodeTranslatePayload(payload) || chunk;
      if (process.env.NODE_ENV !== "production" && isLikelyUntranslatedIdentity(chunk, translatedChunk, targetLanguage)) {
        console.warn("[translate-batch] upstream returned identity translation", {
          language: targetLanguage,
          chunkPreview: chunk.slice(0, 120)
        });
      }
      translatedChunks.push(translatedChunk);
    } catch {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[translate-batch] upstream request failed", {
          language: targetLanguage,
          textPreview: text.slice(0, 120)
        });
      }
      return text;
    } finally {
      clearTimeout(timeout);
    }
  }

  const translated = translatedChunks.join(chunks.length > 1 && text.includes("\n\n") ? "\n\n" : " ");
  if (!isLikelyUntranslatedIdentity(text, translated, targetLanguage)) {
    translationMemory.set(cacheKey, translated || text);
  }
  return translated || text;
}

async function translateTexts(texts, language) {
  const translations = {};
  const queue = texts.filter((text) => text && typeof text === "string");
  let index = 0;

  async function worker() {
    while (index < queue.length) {
      const text = queue[index];
      index += 1;
      translations[text] = await translateSingleText(text, language);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(MAX_TRANSLATE_CONCURRENCY, queue.length) }, () => worker())
  );

  return translations;
}

function stripHtml(html = "") {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ");
}

function buildKmsFallbackPayload(url, html = "") {
  const cleaned = sanitizeText(stripHtml(html));
  const summary = cleaned.slice(0, 800);

  return {
    sourceName: "Orange Mushroom",
    sourceUrl: url,
    date: "",
    summary,
    tags: [],
    highlights: [],
    keyChanges: [],
    audience: "",
    sections: cleaned
      ? [
          {
            title: "Full Article",
            summary: summary || "",
            details: [{ type: "text", value: cleaned }],
            impact: "",
            topic: { key: "other", label: "Other" }
          }
        ]
      : [],
    categories: [],
    heroImage: ""
  };
}

async function fetchRawArticle(url, res) {
  if (!url || typeof url !== "string") {
    res.status(400).json({ error: "Missing url parameter." });
    return;
  }

  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      res.status(400).json({ error: "Invalid URL protocol." });
      return;
    }
  } catch {
    res.status(400).json({ error: "Invalid URL." });
    return;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "text/html",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
      },
      signal: controller.signal
    });

    if (!response.ok) {
      res.status(response.status).json({ error: "Failed to fetch article." });
      return;
    }

    const html = await response.text();
    res.status(200).json({ html });
  } catch {
    res.status(500).json({ error: "Failed to fetch article." });
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchKms(url, force, res) {
  if (!url || typeof url !== "string") {
    res.status(400).json({ error: "Missing url parameter." });
    return;
  }

  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes("orangemushroom.net")) {
      res.status(400).json({ error: "Invalid source host." });
      return;
    }

    if (process.env.NODE_ENV !== "production") {
      console.log("[KMS] Fetching article:", url);
    }

    const payload = await fetchKmsArticle(url, { forceRefresh: force === "1" || force === "true" });

    if (process.env.NODE_ENV !== "production") {
      console.log("[KMS] Parsed payload", {
        url,
        htmlLength: payload?.debug?.htmlLength,
        stats: payload?.debug?.stats,
        sectionCount: payload?.debug?.sectionCount,
        detailCount: payload?.debug?.detailCount
      });
    }

    const cacheHeader =
      force === "1" || force === "true"
        ? "no-store, max-age=0"
        : "s-maxage=1800, stale-while-revalidate=3600";

    if (process.env.NODE_ENV !== "production" && (!payload.sections || !payload.sections.length)) {
      res.setHeader("Cache-Control", cacheHeader);
      res.status(200).json({
        ...payload,
        debug: {
          warning: "No sections parsed from article.",
          url
        }
      });
      return;
    }

    res.setHeader("Cache-Control", cacheHeader);
    res.status(200).json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    try {
      const response = await fetchHtml(url);
      if (response && response.statusCode >= 200 && response.statusCode < 300) {
        let fallback = buildKmsFallbackPayload(url, response.text || "");

        try {
          fallback = buildKmsPayloadFromHtml(url, response.text || "");
        } catch (parseError) {
          if (process.env.NODE_ENV !== "production") {
            console.warn("[KMS] Structured fallback parse failed.", parseError);
          }
        }

        res.status(200).json({
          ...fallback,
          debug: process.env.NODE_ENV !== "production" ? { warning: message } : undefined
        });
        return;
      }
    } catch {
      // Ignore fallback errors and return the primary failure below.
    }

    if (process.env.NODE_ENV !== "production") {
      res.status(500).json({
        error: "Failed to load KMS article.",
        message,
        url
      });
      return;
    }

    res.status(500).json({ error: "Failed to load KMS article." });
  }
}

async function fetchGms(url, force, res) {
  if (!url || typeof url !== "string") {
    res.status(400).json({ error: "Missing url parameter." });
    return;
  }

  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes("nexon.com")) {
      res.status(400).json({ error: "Invalid source host." });
      return;
    }

    const payload = await fetchGmsArticle(url, { forceRefresh: force === "1" || force === "true" });
    const cacheHeader =
      force === "1" || force === "true"
        ? "no-store, max-age=0"
        : "s-maxage=1800, stale-while-revalidate=3600";
    res.setHeader("Cache-Control", cacheHeader);
    res.status(200).json(payload);
  } catch {
    res.status(500).json({ error: "Failed to load GMS article." });
  }
}

export default async function handler(req, res) {
  const resource = String(req.query?.resource ?? "");

  if (!resource) {
    res.status(400).json({ error: "Missing resource parameter." });
    return;
  }

  if (resource === "translate-batch" && req.method === "POST") {
    const language = String(req.query?.language ?? "en").toLowerCase();
    const texts = Array.isArray(req.body?.texts) ? req.body.texts.slice(0, 50) : [];
    if (process.env.NODE_ENV !== "production") {
      console.log("[translate-batch] request", {
        language,
        count: texts.length
      });
    }
    const translations = await translateTexts(texts, language);
    if (process.env.NODE_ENV !== "production") {
      console.log("[translate-batch] response", {
        language,
        returned: Object.keys(translations).length
      });
    }
    res.setHeader("Cache-Control", "no-store, max-age=0");
    res.status(200).json({ translations });
    return;
  }

  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed." });
    return;
  }

  if (resource === "fetch-html") {
    await fetchRawArticle(req.query?.url, res);
    return;
  }

  if (resource === "gms-article") {
    await fetchGms(req.query?.url, req.query?.force, res);
    return;
  }

  if (resource === "kms-article") {
    await fetchKms(req.query?.url, req.query?.force, res);
    return;
  }

  if (resource === "kms-feed") {
    const feed = await getKmsFeed();
    res.setHeader("Cache-Control", "s-maxage=1800, stale-while-revalidate=3600");
    res.status(200).json(feed);
    return;
  }

  if (resource === "news-feed") {
    const feed = await getNewsFeed();
    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=3600");
    res.status(200).json(feed);
    return;
  }

  if (resource === "news-latest") {
    const requestedLimit = Number.parseInt(String(req.query?.limit ?? "6"), 10);
    const payload = await getLatestNews(Number.isFinite(requestedLimit) ? requestedLimit : 6);
    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=3600");
    res.status(200).json(payload);
    return;
  }

  if (resource === "news-item") {
    const item = await getNewsItemById(req.query?.id);

    if (!item) {
      res.status(404).json({ error: "News item not found" });
      return;
    }

    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=3600");
    res.status(200).json(item);
    return;
  }

  if (resource === "news-refresh") {
    const secret = process.env.NEWS_REFRESH_SECRET;
    const provided = req.headers["x-news-refresh-secret"] ?? req.query?.secret;

    if (secret && provided !== secret) {
      res.status(401).json({ ok: false, error: "Unauthorized" });
      return;
    }

    const feed = await getNewsFeed({ forceRefresh: true });
    res.status(200).json({
      ok: true,
      meta: feed.meta,
      itemCount: feed.meta.itemCount,
      freshItemCount: feed.meta.freshItemCount ?? 0,
      lastUpdated: feed.meta.lastUpdated,
      sourceStatus: feed.meta.sourceStatus,
      items: feed.items.slice(0, 5).map((item) => ({
        id: item.id,
        title: item.title,
        publishedAt: item.publishedAt,
        sourceUrl: item.sourceUrl,
        isNew: item.isNew ?? false
      }))
    });
    return;
  }

  if (resource === "youtube-feed") {
    try {
      const forceRefresh = req.query?.force === "1" || req.query?.force === "true";
      const feed = await getYoutubeFeed({ forceRefresh });
      res.setHeader("Cache-Control", forceRefresh ? "no-store, max-age=0" : "s-maxage=300, stale-while-revalidate=1800");
      res.status(200).json(feed);
    } catch {
      res.status(502).json({ error: "Failed to load YouTube feed." });
    }
    return;
  }

  res.status(404).json({ error: "Unknown content resource." });
}
