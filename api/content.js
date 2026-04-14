import { fetchGmsArticle } from "../server/news/gmsArticle.mjs";
import { fetchHtml } from "../server/news/fetchHtml.mjs";
import { buildKmsPayloadFromHtml, fetchKmsArticle } from "../server/news/kmsArticle.mjs";
import { getKmsFeed } from "../server/news/kmsFeed.mjs";
import { sanitizeText } from "../server/news/normalize.mjs";
import { getLatestNews, getNewsFeed, getNewsItemById } from "../server/news/service.mjs";

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

    const payload = await fetchGmsArticle(url);
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

  res.status(404).json({ error: "Unknown content resource." });
}
