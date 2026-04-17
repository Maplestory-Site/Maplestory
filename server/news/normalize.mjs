import { OFFICIAL_NEWS_ROOT, OFFICIAL_SOURCE } from "./config.mjs";

export function decodeHtmlEntities(value = "") {
  const input = typeof value === "string" ? value : "";
  if (!input.includes("&") && !input.includes("&#")) {
    return input;
  }

  const named = {
    "&nbsp;": " ",
    "&amp;": "&",
    "&quot;": "\"",
    "&apos;": "'",
    "&#39;": "'",
    "&lt;": "<",
    "&gt;": ">",
    "&ndash;": "\u2013",
    "&mdash;": "\u2014"
  };

  const withNamed = Object.keys(named).reduce((acc, entity) => acc.replaceAll(entity, named[entity]), input);

  return withNamed
    .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(Number(num)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

export function sanitizeText(value = "") {
  const raw = typeof value === "string" ? value : "";
  const decoded = raw.includes("ÃƒÆ’Ã‚Â¢") || raw.includes("ÃƒÆ’Ã†â€™") ? Buffer.from(raw, "latin1").toString("utf8") : raw;

  return decodeHtmlEntities(decoded)
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function slugify(value = "") {
  return sanitizeText(value)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export function normalizeImage(url = "") {
  if (!url) {
    return "";
  }

  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }

  if (url.startsWith("//")) {
    return `https:${url}`;
  }

  if (url.startsWith("/media")) {
    return `https://g.nexonstatic.com${url}`;
  }

  return url;
}

export function mapCategory(category = "", title = "") {
  const normalizedCategory = sanitizeText(category).toLowerCase();
  const normalizedTitle = sanitizeText(title).toLowerCase();

  if (
    normalizedTitle.includes("patch") ||
    normalizedTitle.includes("known issues") ||
    normalizedTitle.includes("maintenance") ||
    normalizedTitle.includes("minor patch") ||
    /^v\.\d+/i.test(sanitizeText(title))
  ) {
    return "patch-notes";
  }

  if (normalizedCategory === "events") {
    return "events";
  }

  if (normalizedCategory === "sale") {
    return "cash-shop";
  }

  if (normalizedCategory === "maintenance" || normalizedCategory === "general") {
    return "notices";
  }

  return "updates";
}

export function shorten(text = "", maxLength = 156) {
  const cleaned = sanitizeText(text);

  if (!cleaned) {
    return "Official MapleStory update preview.";
  }

  if (cleaned.length <= maxLength) {
    return cleaned;
  }

  return `${cleaned.slice(0, maxLength - 1).trimEnd()}...`;
}

export function buildSourceUrl(item) {
  const category = String(item.category || "general").toLowerCase();
  const slug = slugify(item.name || String(item.id));
  return `${OFFICIAL_NEWS_ROOT}/${category}/${item.id}/${slug}`;
}

export function normalizeNewsItem(item, featuredIds, previousIds, fetchedAt) {
  const id = String(item.id);
  const title = sanitizeText(item.name) || "Untitled update";
  const sourceUrl = buildSourceUrl(item);

  return {
    id,
    title,
    category: mapCategory(item.category, item.name),
    region: "gms",
    publishedAt: item.liveDate || fetchedAt,
    summary: shorten(item.summary),
    image: normalizeImage(item.imageThumbnail),
    sourceName: OFFICIAL_SOURCE.sourceName,
    sourceUrl,
    copyrightLabel: OFFICIAL_SOURCE.copyrightLabel,
    fetchedAt,
    featured: featuredIds.has(id),
    isNew: previousIds ? !previousIds.has(id) : false
  };
}

export function sortNewsItems(items) {
  return [...items].sort((left, right) => new Date(right.publishedAt).getTime() - new Date(left.publishedAt).getTime());
}
