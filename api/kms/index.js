import { fetchKmsArticle } from "../../server/news/kmsArticle.mjs";
import { sanitizeText } from "../../server/news/normalize.mjs";
import { fetchHtml } from "../../server/news/fetchHtml.mjs";

function stripHtml(html = "") {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ");
}

function buildFallbackPayload(url, html = "") {
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

export default async function handler(req, res) {
  const { url, force } = req.query;

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
    if (process.env.NODE_ENV !== "production" && (!payload.sections || !payload.sections.length)) {
      res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
      res.status(200).json({
        ...payload,
        debug: {
          warning: "No sections parsed from article.",
          url
        }
      });
      return;
    }
    res.setHeader("Cache-Control", "s-maxage=1800, stale-while-revalidate=3600");
    res.status(200).json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    try {
      const response = await fetchHtml(url);
      if (response && response.statusCode >= 200 && response.statusCode < 300) {
        const html = response.text || "";
        const fallback = buildFallbackPayload(url, html);
        res.status(200).json({
          ...fallback,
          debug: process.env.NODE_ENV !== "production" ? { warning: message } : undefined
        });
        return;
      }
    } catch {
      // ignore fallback errors
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
