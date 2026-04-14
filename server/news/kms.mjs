import { KMS_SOURCE, ORANGE_MUSHROOM_KMS_RSS } from "./config.mjs";
import { normalizeImage, sanitizeText, shorten, slugify } from "./normalize.mjs";

const ITEM_REGEX = /<item>([\s\S]*?)<\/item>/gi;

function extractTag(block = "", tag = "") {
  if (!block || !tag) {
    return "";
  }

  const safeTag = tag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = new RegExp(`<${safeTag}[^>]*>([\\s\\S]*?)<\\/${safeTag}>`, "i").exec(block);

  if (!match) {
    return "";
  }

  return match[1] || "";
}

function stripCdata(value = "") {
  return value.replace(/<!\[CDATA\[|\]\]>/g, "");
}

function stripHtml(value = "") {
  return value.replace(/<[^>]*>/g, " ");
}

function extractImage(html = "") {
  const match = /<img[^>]+src=["']([^"']+)["']/i.exec(html);
  return match ? normalizeImage(match[1]) : "";
}

function mapKmsCategory(category = "", title = "") {
  const normalizedCategory = sanitizeText(category).toLowerCase();
  const normalizedTitle = sanitizeText(title).toLowerCase();

  if (
    normalizedTitle.includes("kmst") ||
    normalizedTitle.includes("patch") ||
    normalizedTitle.includes("update") ||
    normalizedTitle.includes("maintenance")
  ) {
    return "patch-notes";
  }

  if (normalizedCategory.includes("event")) {
    return "events";
  }

  if (normalizedCategory.includes("cash") || normalizedCategory.includes("sale")) {
    return "cash-shop";
  }

  if (normalizedCategory.includes("notice") || normalizedCategory.includes("maintenance")) {
    return "notices";
  }

  return "updates";
}

function parseRssItems(xml = "") {
  const items = [];
  let match = ITEM_REGEX.exec(xml);

  while (match) {
    items.push(match[1]);
    match = ITEM_REGEX.exec(xml);
  }

  return items;
}

export function normalizeKmsItem(item, previousIds, fetchedAt) {
  const rawTitle = sanitizeText(stripCdata(item.title));
  const rawLink = sanitizeText(stripCdata(item.link));
  const rawDate = sanitizeText(stripCdata(item.pubDate));
  const rawCategory = sanitizeText(stripCdata(item.category));
  const rawContent = stripCdata(item.content || item.description || "");

  const idBase = `${slugify(rawTitle)}-${rawDate ? new Date(rawDate).getTime() : "kms"}`;
  const id = `kms-${idBase}`;
  const summary = shorten(stripHtml(rawContent));
  const image = extractImage(rawContent);

  return {
    id,
    title: rawTitle || "KMST Update",
    category: mapKmsCategory(rawCategory, rawTitle),
    region: "kms",
    publishedAt: rawDate || fetchedAt,
    summary,
    image,
    sourceName: KMS_SOURCE.sourceName,
    sourceUrl: rawLink || KMS_SOURCE.sourceUrl,
    copyrightLabel: KMS_SOURCE.copyrightLabel,
    fetchedAt,
    featured: false,
    isNew: previousIds ? !previousIds.has(id) : false
  };
}

export async function fetchKmsRss() {
  const response = await fetch(ORANGE_MUSHROOM_KMS_RSS, {
    headers: {
      Accept: "application/rss+xml, application/xml;q=0.9, */*;q=0.8"
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch KMS RSS: ${response.status}`);
  }

  const xml = await response.text();
  const blocks = parseRssItems(xml);

  return blocks.map((block) => ({
    title: extractTag(block, "title"),
    link: extractTag(block, "link"),
    pubDate: extractTag(block, "pubDate"),
    category: extractTag(block, "category"),
    description: extractTag(block, "description"),
    content: extractTag(block, "content:encoded")
  }));
}
