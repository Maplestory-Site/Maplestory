import { load } from "cheerio";
import { decodeHtmlEntities, sanitizeText } from "./normalize.mjs";

const STRIP_SELECTORS = [
  "script",
  "style",
  "nav",
  "header",
  "footer",
  "aside",
  "iframe",
  "form",
  ".sharedaddy",
  ".sharedaddy__container",
  ".addtoany_share_save_container",
  ".post-navigation",
  ".author-box",
  ".breadcrumb",
  ".breadcrumbs",
  ".entry-meta",
  ".meta",
  "#comments",
  ".comments-area",
  ".comment-respond",
  ".comments-title",
  ".jp-relatedposts",
  ".related-posts",
  ".post-tags",
  ".post-categories",
  ".patreon-button",
  ".patreon-widget",
  ".yarpp-related",
  ".sharedaddy.sd-sharing-enabled",
  ".sd-content",
  ".sd-like",
  ".sd-sharing",
  ".adsbygoogle"
];

const ROOT_SELECTORS = [
  ".post-content",
  ".entry-content",
  ".post .content",
  ".gms-body",
  "article",
  "main",
  ".content"
];

function scoreRootCandidate($, node) {
  const textLength = cleanText($(node).text() || "").length;
  const paragraphCount = $(node).find("p").length;
  const headingCount = $(node).find("h1, h2, h3, h4").length;
  const imageCount = $(node).find("img").length;
  const listCount = $(node).find("ul, ol").length;
  return textLength + paragraphCount * 220 + headingCount * 160 + imageCount * 120 + listCount * 140;
}

function resolveUrl(src, baseUrl) {
  if (!src) return "";
  if (src.startsWith("http://") || src.startsWith("https://")) return src;
  if (src.startsWith("//")) return `https:${src}`;
  if (!baseUrl) return src;
  try {
    return new URL(src, baseUrl).toString();
  } catch {
    return src;
  }
}

function cleanText(value = "") {
  return sanitizeText(decodeHtmlEntities(value));
}

function normalizeForCompare(value = "") {
  return value
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .trim();
}

function stripNoiseCheerio(root) {
  STRIP_SELECTORS.forEach((selector) => {
    root.find(selector).remove();
  });
}

function extractImageFromNode($, node, baseUrl) {
  const srcCandidate =
    $(node).attr("src") ||
    $(node).attr("data-src") ||
    $(node).attr("data-lazy-src") ||
    $(node).attr("data-original") ||
    $(node).attr("data-orig-file") ||
    $(node).attr("data-large-file") ||
    $(node)
      .attr("srcset")
      ?.split(",")
      .map((part) => part.trim().split(" ")[0])
      .filter(Boolean)[0] ||
    $(node)
      .attr("data-srcset")
      ?.split(",")
      .map((part) => part.trim().split(" ")[0])
      .filter(Boolean)[0] ||
    "";
  const src = resolveUrl(srcCandidate, baseUrl);
  const alt = cleanText($(node).attr("alt") || "");
  return { src, alt };
}

function walkCheerio($, node, tokens, baseUrl, stats) {
  if (!node) return;

  if (node.type === "text") {
    const text = cleanText(node.data || "");
    if (text) {
      tokens.push({ type: "text", value: text });
      stats.paragraphs += 1;
    }
    return;
  }

  if (node.type !== "tag") {
    if (node.children) {
      node.children.forEach((child) => walkCheerio($, child, tokens, baseUrl, stats));
    }
    return;
  }

  const tag = node.name?.toLowerCase();
  if (!tag) return;

  if (tag === "figure") {
    const img = $(node).find("img").first();
    if (img.length) {
      const { src, alt } = extractImageFromNode($, img, baseUrl);
      if (src) {
        tokens.push({ type: "image", src, alt });
        stats.images += 1;
      }
    }
    const caption = cleanText($(node).find("figcaption").text() || "");
    if (caption) {
      tokens.push({ type: "text", value: caption });
      stats.paragraphs += 1;
    }
    return;
  }

  if (tag === "img") {
    const { src, alt } = extractImageFromNode($, node, baseUrl);
    if (src) {
      tokens.push({ type: "image", src, alt });
      stats.images += 1;
    }
    return;
  }

  if (tag === "p") {
    const text = cleanText($(node).text() || "");
    if (text) {
      tokens.push({ type: "text", value: text });
      stats.paragraphs += 1;
    }
    return;
  }

  if (tag === "ul" || tag === "ol") {
    const items = $(node)
      .find("li")
      .map((_, el) => cleanText($(el).text() || ""))
      .get()
      .filter(Boolean);
    if (items.length) {
      tokens.push({ type: "list", items });
      stats.lists += 1;
    }
    return;
  }

  if (tag.startsWith("h") && tag.length === 2) {
    const level = Number(tag[1]);
    const text = cleanText($(node).text() || "");
    if (text) {
      tokens.push({ type: "heading", level, value: text });
      stats.headings += 1;
    }
    return;
  }

  if (node.children) {
    node.children.forEach((child) => walkCheerio($, child, tokens, baseUrl, stats));
  }
}

function buildSections(tokens) {
  const headingLevels = tokens
    .filter((token) => token.type === "heading")
    .map((token) => token.level);
  const hasH2 = headingLevels.includes(2);
  const hasH3 = headingLevels.includes(3);
  const hasH1 = headingLevels.includes(1);
  const primaryLevel = hasH2 ? 2 : hasH3 ? 3 : hasH1 ? 1 : null;

  const sections = [];
  let current = null;
  let intro = [];

  tokens.forEach((token) => {
    if (token.type === "heading") {
      if (primaryLevel && token.level === primaryLevel) {
        if (current && current.details.length) {
          sections.push(current);
        } else if (!current && intro.length) {
          sections.push({ title: "Overview", details: intro });
          intro = [];
        }
        current = { title: token.value, details: [] };
        return;
      }

      const subheading = { type: "subheading", value: token.value };
      if (current) {
        current.details.push(subheading);
      } else {
        intro.push(subheading);
      }
      return;
    }

    const item =
      token.type === "image"
        ? { type: "image", src: token.src, alt: token.alt || "" }
        : token.type === "list"
          ? { type: "list", items: token.items || [] }
          : { type: "text", value: token.value || "" };

    if (current) {
      current.details.push(item);
    } else {
      intro.push(item);
    }
  });

  if (current && current.details.length) {
    sections.push(current);
  }
  if (!sections.length && intro.length) {
    sections.push({ title: "Overview", details: intro });
  }

  const shouldSmartSplit =
    (!hasH2 && sections.length === 1 && sections[0].details.length > 6) ||
    (!hasH2 && sections.length < 2 && intro.length > 6) ||
    sections.length <= 1;

  if (shouldSmartSplit) {
    const grouped = [];
    let bucket = { title: "Overview", details: [] };
    let blockCount = 0;
    let charCount = 0;

    const flush = (nextTitle) => {
      if (bucket.details.length) {
        grouped.push(bucket);
      }
      bucket = { title: nextTitle, details: [] };
      blockCount = 0;
      charCount = 0;
    };

    const isHeadingLike = (text = "") => {
      const trimmed = text.trim();
      if (!trimmed) return false;
      if (trimmed.length > 80) return false;
      if (/^[A-Z0-9][A-Z0-9\s&/+\-]{3,}$/.test(trimmed)) return true;
      if (/:$/.test(trimmed)) return true;
      if (/^(?:\*{2}|_{2}).+(?:\*{2}|_{2})$/.test(trimmed)) return true;
      if (/^[-=]{3,}$/.test(trimmed)) return true;
      return false;
    };

    const details = sections[0]?.details || intro;
    const totalBlocks = details.length;
    const totalChars = details.reduce((sum, item) => {
      if (!item) return sum;
      if (item.type === "text" || item.type === "subheading") return sum + (item.value || "").length;
      if (item.type === "list") return sum + (item.items || []).join(" ").length;
      return sum;
    }, 0);
    const chunkSize = totalBlocks > 36 ? 9 : totalBlocks > 28 ? 8 : totalBlocks > 20 ? 7 : 6;
    const longArticle = totalBlocks > 9 || totalChars > 1200;
    const requiredSections = totalBlocks > 20 || totalChars > 2800 ? 4 : totalBlocks > 10 ? 3 : 2;
    const longParagraph = (value = "") => value.trim().length > 420;
    details.forEach((item, index) => {
      const textValue =
        item?.type === "text" || item?.type === "subheading"
          ? item.value || ""
          : item?.type === "list"
            ? (item.items || []).join(" ")
            : "";

      if (item?.type === "text" && isHeadingLike(textValue) && bucket.details.length >= 2) {
        const nextTitle = textValue.replace(/:$/, "").trim() || "Details";
        flush(nextTitle);
        return;
      }

      if (item?.type === "list" && item.items?.length >= 6 && bucket.details.length >= 3 && longArticle) {
        flush("Details");
      }

      if (item?.type === "text" && longParagraph(textValue) && bucket.details.length >= 4 && longArticle) {
        flush("Main Changes");
      }

      bucket.details.push(item);
      blockCount += 1;
      charCount += textValue.length;

      const shouldSplit =
        (blockCount >= chunkSize && longArticle) ||
        charCount > 1400 ||
        (item?.type === "image" && blockCount >= 4);

      const nearEnd = index >= details.length - 1;
      if (shouldSplit && !nearEnd) {
        const nextTitle =
          grouped.length === 0 ? "Main Changes" : grouped.length === 1 ? "Details" : "Additional Info";
        flush(nextTitle);
      }
    });

    if (bucket.details.length) {
      grouped.push(bucket);
    }

    if (grouped.length < requiredSections && totalBlocks > 8) {
      const fill = ["Main Changes", "Details", "Additional Info"];
      while (grouped.length < requiredSections && grouped.length < fill.length + 1) {
        grouped.push({ title: fill[grouped.length - 1] || "Details", details: [] });
      }
    }

    if (grouped.length === 1 && grouped[0].details.length <= 5 && totalChars < 900) {
      return grouped;
    }

    return grouped;
  }

  return sections;
}

export function detectCategory(section) {
  const title = (section.title || "").toLowerCase();
  const textBlob = (section.details || [])
    .map((item) => {
      if (item?.type === "text" || item?.type === "subheading") return item.value;
      if (item?.type === "list") return item.items?.join(" ") || "";
      return "";
    })
    .join(" ")
    .toLowerCase();

  const haystack = `${title} ${textBlob}`;
  const categories = [
    { key: "classes", label: "Classes", terms: ["class", "job", "character", "ability", "skill"] },
    { key: "skills", label: "Skills", terms: ["skill", "mastery", "ability", "core"] },
    { key: "items", label: "Items", terms: ["item", "equipment", "gear", "drop", "loot", "reward"] },
    { key: "bosses", label: "Bosses", terms: ["boss", "raid", "damage", "phase"] },
    { key: "events", label: "Events", terms: ["event", "festival", "anniversary", "attendance", "login reward"] },
    { key: "rewards", label: "Rewards", terms: ["reward", "coin", "shop", "store"] },
    { key: "systems", label: "Systems", terms: ["system", "mechanic", "feature", "change", "update"] },
    { key: "enhancement", label: "Enhancement", terms: ["enhance", "star force", "upgrade", "cube"] },
    { key: "farming", label: "Farming", terms: ["farm", "meso", "drop rate", "grind", "exp"] },
    { key: "maps", label: "Maps", terms: ["map", "region", "area", "zone", "field"] },
    { key: "ui-qol", label: "UI / QoL", terms: ["ui", "qol", "quality", "interface", "menu"] },
    { key: "fixes", label: "Fixes", terms: ["fix", "bug", "issue", "maintenance"] },
    { key: "cash-shop", label: "Cash Shop", terms: ["cash shop", "cash", "nx", "sale", "package"] }
  ];

  const match = categories.find((category) => category.terms.some((term) => haystack.includes(term)));
  return match || { key: "other", label: "Other" };
}

export function groupSectionsByCategory(sections) {
  if (sections.length <= 1) {
    return [{ key: "all", label: "All", sections }];
  }
  const map = new Map();
  sections.forEach((section) => {
    const category = detectCategory(section);
    if (!map.has(category.key)) {
      map.set(category.key, { key: category.key, label: category.label, sections: [] });
    }
    map.get(category.key).sections.push(section);
  });
  return Array.from(map.values());
}

export function parseArticleHtml(html = "", baseUrl = "") {
  const $ = load(html, { decodeEntities: false });
  let root = null;
  let rootSelector = "";

  for (const selector of ROOT_SELECTORS) {
    const candidates = $(selector).toArray();
    if (!candidates.length) {
      continue;
    }

    const bestCandidate = candidates
      .map((node) => ({ node, score: scoreRootCandidate($, node) }))
      .sort((left, right) => right.score - left.score)[0];

    if (bestCandidate?.node && bestCandidate.score > 0) {
      root = $(bestCandidate.node);
      rootSelector = selector;
      break;
    }
  }

  if (process.env.NODE_ENV !== "production") {
    console.log("[KMS Parser] HTML length:", html.length);
    console.log("[KMS Parser] root selector:", rootSelector || "NONE");
  }

  if (!root || !root.length) {
    console.error("[KMS Parser] root content NOT FOUND");
    throw new Error("Article root content NOT FOUND");
  }

  stripNoiseCheerio(root);

  if (process.env.NODE_ENV !== "production") {
    console.log("[KMS Parser] root children:", root.contents().length);
  }

  const tokens = [];
  const stats = { paragraphs: 0, images: 0, lists: 0, headings: 0 };
  root.contents().each((_, node) => walkCheerio($, node, tokens, baseUrl, stats));

  const rootHtml = root.html() || "";
  const fullText = cleanText(root.text() || "");
  if (process.env.NODE_ENV !== "production") {
    console.log("[KMS Parser] root HTML length:", rootHtml.length);
    console.log("[KMS Parser] Tokens extracted:", tokens.length);
    console.log("[KMS Parser] paragraphs:", stats.paragraphs);
    console.log("[KMS Parser] images:", stats.images);
    console.log("[KMS Parser] lists:", stats.lists);
  }

  if (stats.paragraphs < 5 || fullText.length < 1000) {
    console.error("[KMS Parser] ARTICLE EXTRACTION FAILED");
  }

  let sections = buildSections(tokens);
  if (!sections.length) {
    sections = fullText
      ? [{ title: "Full Article", details: [{ type: "text", value: fullText }] }]
      : [{ title: "Full Article", details: [] }];
  }

  sections = sections.map((section) => ({
    ...section,
    details: (section.details || [])
      .map((detail) => {
        if (!detail) return null;
        if (typeof detail === "string") return { type: "text", value: detail };
        if (detail.type === "text" || detail.type === "list" || detail.type === "image" || detail.type === "subheading") {
          return detail;
        }
        if ("value" in detail && typeof detail.value === "string") {
          return { type: "text", value: detail.value };
        }
        return null;
      })
      .filter(Boolean)
  }));

  const totalDetails = sections.reduce((sum, section) => sum + (section.details?.length || 0), 0);
  if (fullText && (sections.length <= 1 || totalDetails < 4)) {
    sections = [
      {
        title: "Full Article",
        details: [{ type: "text", value: fullText }]
      }
    ];
  }

  const categories = groupSectionsByCategory(sections);
  const summaryToken = tokens.find((token) => token.type === "text");
  const summary = summaryToken?.value || "";
  const heroImage = tokens.find((token) => token.type === "image")?.src || "";
  const normalizedSummary = normalizeForCompare(summary);
  if (sections.length && normalizedSummary) {
    const firstDetails = sections[0].details || [];
    const firstTextIndex = firstDetails.findIndex((item) => item?.type === "text" && item.value);
    if (firstTextIndex >= 0) {
      const firstText = normalizeForCompare(firstDetails[firstTextIndex].value || "");
      if (firstText && (firstText === normalizedSummary || firstText.startsWith(normalizedSummary))) {
        sections[0].details = [
          ...firstDetails.slice(0, firstTextIndex),
          ...firstDetails.slice(firstTextIndex + 1)
        ];
      }
    }
  }

  return {
    summary,
    heroImage,
    sections,
    categories,
    tokens,
    fullText,
    stats: {
      rootTextLength: fullText.length,
      articleTextLength: fullText.length,
      tokenCount: tokens.length,
      headings: stats.headings,
      images: stats.images,
      lists: stats.lists,
      paragraphs: stats.paragraphs
    }
  };
}
