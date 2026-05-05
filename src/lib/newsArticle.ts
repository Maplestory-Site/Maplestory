import { fallbackNewsFeed, type NewsDetail, type NewsItem, type NewsListItem } from "../data/newsHub";

export type NewsSectionType = "default" | "highlight" | "warning" | "reward" | "event";

export type NewsSection = {
  id: string;
  title: string;
  content: string;
  type?: NewsSectionType;
  items?: string[];
  images?: Array<{ src: string; alt: string }>;
  details?: NewsArticleDetail[];
};

export type NewsArticleDetail =
  | { type: "text"; value: string }
  | { type: "image"; src: string; alt: string; caption?: string }
  | { type: "list"; items: Array<{ text: string; children: string[] }> }
  | { type: "subheading"; value: string }
  | { type: "link"; href: string; label: string }
  | { type: "table"; headers: string[]; rows: string[][]; caption?: string };

export type NewsArticle = {
  id: string;
  title: string;
  summary: string;
  image?: string;
  date: string;
  author?: string;
  sections: NewsSection[];
  isPatchNotes?: boolean;
  category: NewsItem["category"];
  region: NewsItem["region"];
  sourceName: string;
  sourceUrl: string;
};

export type NewsArticlePayload = {
  title?: string;
  sourceName?: string;
  sourceUrl?: string;
  date?: string;
  summary?: string;
  heroImage?: string;
  keyPoints?: string[];
  highlights?: string[];
  keyChanges?: string[];
  audience?: string;
  sections?: BreakdownSection[];
};

export type BreakdownSection = {
  title: string;
  summary: string;
  details: NewsDetail[];
  impact?: string;
  topic?: {
    key: string;
    label: string;
  };
};

export function getNewsItemById(newsId: string, items: NewsItem[] = fallbackNewsFeed.items) {
  return items.find((item) => item.id === newsId) ?? null;
}

export function getNewsArticleById(newsId: string, items: NewsItem[] = fallbackNewsFeed.items) {
  const item = getNewsItemById(newsId, items);
  return item ? buildNewsArticle(item) : null;
}

export function getAdjacentNewsArticles(newsId: string, items: NewsItem[] = fallbackNewsFeed.items) {
  const sortedItems = [...items].sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  const currentIndex = sortedItems.findIndex((item) => item.id === newsId);

  return {
    next: currentIndex > 0 ? buildNewsArticle(sortedItems[currentIndex - 1]) : null,
    previous: currentIndex >= 0 && currentIndex < sortedItems.length - 1 ? buildNewsArticle(sortedItems[currentIndex + 1]) : null
  };
}

export function buildNewsArticle(item: NewsItem): NewsArticle {
  const breakdown = item.gmsBreakdown ?? item.kmsBreakdown;
  const breakdownSections = (breakdown?.sections ?? []) as BreakdownSection[];
  const sections = breakdownSections.length
    ? breakdownSections.map((section, index) => buildSection(section, index, item))
    : buildFallbackSections(item);

  const introSection: NewsSection = {
    id: "overview",
    title: "Overview",
    content: cleanText(breakdown?.summary || item.summary),
    type: inferSectionType("Overview", item.summary, item),
    details: [{ type: "text", value: cleanText(breakdown?.summary || item.summary) }]
  };

  const normalizedSections = [introSection, ...sections]
    .filter((section) => section.content.trim() || section.items?.length || section.images?.length || section.details?.length)
    .map((section, index, list) => ({
      ...section,
      id: uniqueSectionId(section.id || slugify(section.title), index, list)
    }));

  return {
    id: item.id,
    title: cleanText(item.title),
    summary: cleanText(breakdown?.summary || item.summary),
    image: breakdown?.heroImage || item.image,
    date: item.gmsBreakdown?.date || item.kmsBreakdown?.date || item.publishedAt,
    author: item.sourceName,
    sections: normalizedSections,
    isPatchNotes: isPatchNotesItem(item),
    category: item.category,
    region: item.region,
    sourceName: item.sourceName,
    sourceUrl: item.sourceUrl
  };
}

export function buildNewsArticleFromPayload(item: NewsItem, payload: NewsArticlePayload): NewsArticle {
  const payloadSections = payload.sections ?? [];
  const sections = payloadSections.length
    ? payloadSections.map((section, index) => buildSection(section, index, item))
    : buildFallbackSections(item);

  const overviewItems = [
    ...(payload.keyPoints ?? []),
    ...(payload.highlights ?? []),
    ...(payload.keyChanges ?? []),
    payload.audience
  ]
    .filter(Boolean)
    .map((item) => cleanText(String(item)));

  const introSection: NewsSection = {
    id: "overview",
    title: "Overview",
    content: cleanText(payload.summary || item.summary),
    type: inferSectionType("Overview", payload.summary || item.summary, item),
    items: overviewItems,
    details: [
      { type: "text", value: cleanText(payload.summary || item.summary) },
      ...(overviewItems.length ? [{ type: "list" as const, items: overviewItems.map((text) => ({ text, children: [] })) }] : [])
    ]
  };

  return {
    id: item.id,
    title: cleanText(payload.title || item.title),
    summary: cleanText(payload.summary || item.summary),
    image: payload.heroImage || item.image,
    date: payload.date || item.publishedAt,
    author: payload.sourceName || item.sourceName,
    sections: [introSection, ...sections]
      .filter((section) => section.content.trim() || section.items?.length || section.images?.length || section.details?.length)
      .map((section, index, list) => ({
        ...section,
        id: uniqueSectionId(section.id || slugify(section.title), index, list)
      })),
    isPatchNotes: isPatchNotesItem(item),
    category: item.category,
    region: item.region,
    sourceName: payload.sourceName || item.sourceName,
    sourceUrl: payload.sourceUrl || item.sourceUrl
  };
}

function buildSection(section: BreakdownSection, index: number, item: NewsItem): NewsSection {
  const textParts: string[] = [];
  const listItems: string[] = [];
  const images: Array<{ src: string; alt: string }> = [];
  const details: NewsArticleDetail[] = [];

  const summary = cleanText(section.summary);
  section.details.forEach((detail) => {
    const normalized = normalizeDetail(detail, section.title);
    if (!normalized) {
      return;
    }
    details.push(normalized);

    if (normalized.type === "text") textParts.push(normalized.value);
    if (normalized.type === "list") listItems.push(...normalized.items.map((entry) => entry.text).filter(Boolean));
    if (normalized.type === "image") images.push({ src: normalized.src, alt: normalized.alt });
  });

  if (summary && !isTextRepresentedByDetails(summary, details)) {
    textParts.unshift(summary);
    details.unshift({ type: "text", value: summary });
  }

  if (section.impact) {
    const impact = `Player impact: ${cleanText(section.impact)}`;
    textParts.push(impact);
    details.push({ type: "text", value: impact });
  }

  return {
    id: slugify(section.title) || `section-${index + 1}`,
    title: cleanText(section.title || `Section ${index + 1}`),
    content: dedupeTextBlocks(textParts).join("\n\n"),
    type: inferSectionType(section.title, `${section.summary} ${listItems.join(" ")}`, item),
    items: listItems,
    images,
    details: dedupeDetails(details)
  };
}

function buildFallbackSections(item: NewsItem): NewsSection[] {
  return [
    {
      id: "update-summary",
      title: item.category === "patch-notes" ? "Update Summary" : "Story Details",
      content: cleanText(item.summary),
      type: item.category === "patch-notes" ? "highlight" : "default",
      details: [{ type: "text", value: cleanText(item.summary) }]
    },
    {
      id: "source-details",
      title: "Official Source",
      content: `This article is sourced from ${item.sourceName}. Open the official source for the original announcement and any final service-specific details.`,
      type: "default",
      details: [
        {
          type: "text",
          value: `This article is sourced from ${item.sourceName}. Open the official source for the original announcement and any final service-specific details.`
        },
        { type: "link", href: item.sourceUrl, label: "Open official source" }
      ]
    }
  ];
}

function normalizeDetail(detail: NewsDetail, fallbackTitle: string): NewsArticleDetail | null {
  if (typeof detail === "string") {
    const value = cleanText(detail);
    return value ? { type: "text", value } : null;
  }

  if (detail.type === "text") {
    const value = cleanText(detail.value);
    return value ? { type: "text", value } : null;
  }

  if (detail.type === "subheading") {
    const value = cleanText(detail.value);
    return value ? { type: "subheading", value } : null;
  }

  if (detail.type === "image" && detail.src) {
    return {
      type: "image",
      src: detail.src,
      alt: cleanText(detail.alt || fallbackTitle),
      caption: cleanText(detail.caption || "")
    };
  }

  if (detail.type === "link" && detail.href) {
    const label = cleanText(detail.label || detail.href);
    return label ? { type: "link", href: detail.href, label } : null;
  }

  if (detail.type === "table" && detail.rows?.length) {
    return {
      type: "table",
      headers: (detail.headers ?? []).map(cleanText).filter(Boolean),
      rows: detail.rows.map((row) => row.map(cleanText)).filter((row) => row.some(Boolean)),
      caption: cleanText(detail.caption || "")
    };
  }

  if (detail.type === "list") {
    const items = detail.items.map(normalizeListItem).filter((entry) => entry.text);
    return items.length ? { type: "list", items } : null;
  }

  return null;
}

function normalizeListItem(item: NewsListItem): { text: string; children: string[] } {
  if (typeof item === "string") {
    return { text: cleanText(item), children: [] };
  }
  return {
    text: cleanText(item.text ?? ""),
    children: (item.children ?? []).map(cleanText).filter(Boolean)
  };
}

function dedupeTextBlocks(values: string[]) {
  const seen = new Set<string>();
  return values.filter((value) => {
    const normalized = normalizeForCompare(value);
    if (!normalized || seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
}

function dedupeDetails(details: NewsArticleDetail[]) {
  const seen = new Set<string>();
  const result: NewsArticleDetail[] = [];

  details.forEach((detail) => {
    const normalizedDetail = dedupeDetailContent(detail);
    if (!normalizedDetail) return;

    const key = getDetailDedupeKey(normalizedDetail);
    if (!key || seen.has(key)) return;
    seen.add(key);
    result.push(normalizedDetail);
  });

  return result;
}

function dedupeDetailContent(detail: NewsArticleDetail): NewsArticleDetail | null {
  if (detail.type !== "list") return detail;

  const seenItems = new Set<string>();
  const items = detail.items
    .map((item) => ({
      text: cleanText(item.text),
      children: dedupeTextBlocks(item.children ?? [])
    }))
    .filter((item) => {
      const key = normalizeForCompare(`${item.text} ${item.children.join(" ")}`);
      if (!key || seenItems.has(key)) return false;
      seenItems.add(key);
      return true;
    });

  return items.length ? { type: "list", items } : null;
}

function isTextRepresentedByDetails(value: string, details: NewsArticleDetail[]) {
  const normalizedValue = normalizeForCompare(value);
  if (!normalizedValue) return true;
  return details.some((detail) => {
    const detailText = normalizeForCompare(getDetailText(detail));
    return detailText === normalizedValue || detailText.startsWith(normalizedValue) || normalizedValue.startsWith(detailText);
  });
}

function getDetailDedupeKey(detail: NewsArticleDetail) {
  if (detail.type === "text" || detail.type === "subheading") {
    return `${detail.type}:${normalizeForCompare(detail.value)}`;
  }
  if (detail.type === "list") {
    return `list:${detail.items.map((item) => normalizeForCompare(`${item.text} ${(item.children ?? []).join(" ")}`)).join("|")}`;
  }
  if (detail.type === "table") {
    return `table:${[...detail.headers, ...detail.rows.flat()].map(normalizeForCompare).join("|")}`;
  }
  if (detail.type === "image") {
    return `image:${detail.src}`;
  }
  return `link:${detail.href}:${normalizeForCompare(detail.label)}`;
}

function getDetailText(detail: NewsArticleDetail) {
  if (detail.type === "text" || detail.type === "subheading") return detail.value;
  if (detail.type === "list") return detail.items.map((item) => `${item.text} ${(item.children ?? []).join(" ")}`).join(" ");
  if (detail.type === "table") return [...detail.headers, ...detail.rows.flat()].join(" ");
  if (detail.type === "image") return `${detail.alt} ${detail.caption ?? ""}`;
  return `${detail.label} ${detail.href}`;
}

function inferSectionType(title: string, body: string, item: NewsItem): NewsSectionType {
  const haystack = `${title} ${body} ${item.title}`.toLowerCase();

  if (item.category === "cash-shop") {
    if (/(warning|important|maintenance|known issue|issue|restriction)/.test(haystack)) {
      return "warning";
    }
    if (/(gachapon|update|new|sale|deal|shop|available|mount|chair|damage skin|daily|ongoing)/.test(haystack)) {
      return "highlight";
    }
    return "default";
  }

  if (/(reward|rewards|prize|gift|claim)/.test(haystack)) {
    return "reward";
  }

  if (/(event|duration|schedule|mission|attendance|burning)/.test(haystack)) {
    return "event";
  }

  if (/(warning|important|maintenance|known issue|issue|cannot|restriction)/.test(haystack)) {
    return "warning";
  }

  if (/(major|highlight|system|change|update|patch|balance|skill|boss)/.test(haystack)) {
    return "highlight";
  }

  return "default";
}

function isPatchNotesItem(item: NewsItem) {
  return item.category === "patch-notes" || /(patch|update|maintenance|known issues|v\.\d)/i.test(item.title);
}

function slugify(value: string) {
  return cleanText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeForCompare(value: string) {
  return cleanText(value).toLowerCase().replace(/\s+/g, " ").trim();
}

function uniqueSectionId(id: string, index: number, sections: NewsSection[]) {
  const baseId = id || `section-${index + 1}`;
  const duplicatesBefore = sections.slice(0, index).filter((section) => (section.id || slugify(section.title)) === baseId).length;
  return duplicatesBefore ? `${baseId}-${duplicatesBefore + 1}` : baseId;
}

export function cleanText(value: string) {
  return String(value || "")
    .replace(/â€™/g, "'")
    .replace(/â€œ|â€�/g, '"')
    .replace(/â€“|â€”|â€•/g, "-")
    .replace(/Â /g, " ")
    .replace(/Â/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
