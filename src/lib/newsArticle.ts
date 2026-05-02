import { fallbackNewsFeed, type NewsItem } from "../data/newsHub";

export type NewsSectionType = "default" | "highlight" | "warning" | "reward" | "event";

export type NewsSection = {
  id: string;
  title: string;
  content: string;
  type?: NewsSectionType;
  items?: string[];
  images?: Array<{ src: string; alt: string }>;
};

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
  details: Array<
    | { type: "text"; value: string }
    | { type: "image"; src: string; alt?: string }
    | { type: "list"; items: string[] }
    | { type: "subheading"; value: string }
    | string
  >;
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
    type: inferSectionType("Overview", item.summary, item)
  };

  const normalizedSections = [introSection, ...sections]
    .filter((section) => section.content.trim() || section.items?.length || section.images?.length)
    .map((section, index, list) => ({
      ...section,
      id: uniqueSectionId(section.id || slugify(section.title), index, list)
    }));

  return {
    id: item.id,
    title: cleanText(item.title),
    summary: cleanText(breakdown?.summary || item.summary),
    image: item.image || breakdown?.heroImage,
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
    items: overviewItems
  };

  return {
    id: item.id,
    title: cleanText(payload.title || item.title),
    summary: cleanText(payload.summary || item.summary),
    image: item.image || payload.heroImage,
    date: payload.date || item.publishedAt,
    author: payload.sourceName || item.sourceName,
    sections: [introSection, ...sections]
      .filter((section) => section.content.trim() || section.items?.length || section.images?.length)
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

  if (section.summary) {
    textParts.push(cleanText(section.summary));
  }

  section.details.forEach((detail) => {
    if (typeof detail === "string") {
      textParts.push(cleanText(detail));
      return;
    }

    if (detail.type === "text" || detail.type === "subheading") {
      textParts.push(cleanText(detail.value));
      return;
    }

    if (detail.type === "list") {
      listItems.push(...detail.items.map(cleanText).filter(Boolean));
      return;
    }

    if (detail.type === "image" && detail.src) {
      images.push({ src: detail.src, alt: cleanText(detail.alt || section.title) });
    }
  });

  if (section.impact) {
    textParts.push(`Player impact: ${cleanText(section.impact)}`);
  }

  return {
    id: slugify(section.title) || `section-${index + 1}`,
    title: cleanText(section.title || `Section ${index + 1}`),
    content: textParts.join("\n\n"),
    type: inferSectionType(section.title, `${section.summary} ${listItems.join(" ")}`, item),
    items: listItems,
    images
  };
}

function buildFallbackSections(item: NewsItem): NewsSection[] {
  return [
    {
      id: "update-summary",
      title: item.category === "patch-notes" ? "Update Summary" : "Story Details",
      content: cleanText(item.summary),
      type: item.category === "patch-notes" ? "highlight" : "default"
    },
    {
      id: "source-details",
      title: "Official Source",
      content: `This article is sourced from ${item.sourceName}. Open the official source for the original announcement and any final service-specific details.`,
      type: "default"
    }
  ];
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
