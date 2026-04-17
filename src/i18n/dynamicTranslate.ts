import type { LanguageCode } from "./languages";
import { TRANSLATIONS } from "./translations";

const DYNAMIC_CACHE_KEY = "snailslayer-i18n-dynamic";
const TRANSLATE_ENDPOINT = "/api/content?resource=translate-batch";
const MAX_TRANSLATION_BATCH = 45;

type TranslationCache = Record<string, Record<string, string>>;
type CacheListener = (cache: TranslationCache) => void;

const memoryCache: TranslationCache = {};
const activeRequests = new Map<string, Promise<Record<string, string>>>();
const listeners = new Set<CacheListener>();
const structuredTranslationCache = new Map<string, unknown>();

function isLikelyUntranslatedIdentity(source = "", translated = "", language?: LanguageCode) {
  if (!source || !translated || language === "en") return false;
  const original = normalizeReaderText(source, "paragraph");
  const candidate = normalizeReaderText(translated, "paragraph");
  if (original !== candidate) return false;

  const hasEnglishWords = /[A-Za-z]{3,}/.test(original);
  const hasReadablePhrase = /\s/.test(original) && original.length > 12;
  return hasEnglishWords && hasReadablePhrase;
}

function isUsableTranslation(source = "", translated?: string, language?: LanguageCode) {
  if (!translated) return false;
  return !isLikelyUntranslatedIdentity(source, translated, language);
}

function sanitizeDynamicCache(cache: TranslationCache) {
  let changed = false;
  const sanitized: TranslationCache = {};

  Object.entries(cache).forEach(([language, entries]) => {
    const languageCode = language as LanguageCode;
    sanitized[language] = {};

    Object.entries(entries ?? {}).forEach(([source, translated]) => {
      if (isUsableTranslation(source, translated, languageCode)) {
        sanitized[language][source] = translated;
      } else {
        changed = true;
      }
    });

    if (!Object.keys(sanitized[language]).length) {
      delete sanitized[language];
    }
  });

  return { cache: sanitized, changed };
}

function lookupTranslation(source: string, language: LanguageCode) {
  if (!source) return source;
  if (language === "en") return source;
  const tableValue = TRANSLATIONS[language]?.[source];
  if (isUsableTranslation(source, tableValue, language)) return tableValue;
  const cacheValue = readCache()?.[language]?.[source];
  if (isUsableTranslation(source, cacheValue, language)) return cacheValue;
  return undefined;
}

function decodeHtmlEntities(value = "") {
  if (!value) return value;
  const named: Record<string, string> = {
    nbsp: " ",
    amp: "&",
    quot: "\"",
    apos: "'",
    lt: "<",
    gt: ">",
    ndash: "–",
    mdash: "—"
  };
  return value
    .replace(/&([a-z]+);/gi, (_, name: string) => named[name.toLowerCase()] ?? `&${name};`)
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCharCode(parseInt(hex, 16)));
}

function normalizeReaderText(value = "", mode: "heading" | "paragraph" | "list" | "inline" = "paragraph") {
  const decoded = decodeHtmlEntities(value)
    .replace(/\r\n?/g, "\n")
    .replace(/\u00a0/g, " ")
    .trim();

  if (!decoded) return decoded;

  if (mode === "paragraph") {
    return decoded
      .split(/\n{2,}/)
      .map((paragraph) =>
        paragraph
          .split("\n")
          .map((line) => line.replace(/[ \t]+/g, " ").trim())
          .filter(Boolean)
          .join("\n")
      )
      .filter(Boolean)
      .join("\n\n");
  }

  return decoded.replace(/\s+/g, " ");
}

function readCache(): TranslationCache | null {
  if (typeof window === "undefined") return null;
  if (Object.keys(memoryCache).length) return memoryCache;
  const raw = window.localStorage.getItem(DYNAMIC_CACHE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as TranslationCache;
    const sanitized = sanitizeDynamicCache(parsed);
    Object.assign(memoryCache, sanitized.cache);
    if (sanitized.changed) {
      window.localStorage.setItem(DYNAMIC_CACHE_KEY, JSON.stringify(sanitized.cache));
    }
    return memoryCache;
  } catch {
    return null;
  }
}

export function getDynamicTranslationCache(): TranslationCache {
  return readCache() ?? {};
}

function writeCache(cache: TranslationCache) {
  Object.keys(memoryCache).forEach((key) => delete memoryCache[key]);
  Object.assign(memoryCache, cache);
  if (typeof window === "undefined") return;
  window.localStorage.setItem(DYNAMIC_CACHE_KEY, JSON.stringify(cache));
}

function mergeCache(language: LanguageCode, translations: Record<string, string>) {
  const cache = readCache() ?? {};
  cache[language] = {
    ...(cache[language] ?? {}),
    ...translations
  };
  writeCache(cache);
  listeners.forEach((listener) => listener(cache));
  return cache;
}

export function subscribeDynamicTranslationCache(listener: CacheListener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getCachedDynamicTranslation(text: string, language: LanguageCode) {
  if (!text) return text;
  if (language === "en") return normalizeReaderText(text);
  return normalizeReaderText(lookupTranslation(text, language) ?? text);
}

function chunk<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

export async function requestDynamicTranslations(
  texts: string[],
  language: LanguageCode
): Promise<Record<string, string>> {
  if (language === "en" || !texts.length || typeof window === "undefined") {
    return {};
  }

  const uniqueTexts = Array.from(
    new Set(
      texts
        .map((text) => text?.trim())
        .filter((text): text is string => Boolean(text))
    )
  );

  if (!uniqueTexts.length) return {};

  let mergedTranslations: Record<string, string> = {};
  const missingTexts: string[] = [];

  uniqueTexts.forEach((text) => {
    const cached = lookupTranslation(text, language);
    if (cached) {
      mergedTranslations[text] = normalizeReaderText(cached);
    } else {
      missingTexts.push(text);
    }
  });

  if (!missingTexts.length) {
    return mergedTranslations;
  }

  if (import.meta.env.DEV) {
    console.log("[i18n] requestDynamicTranslations", {
      language,
      total: texts.length,
      unique: uniqueTexts.length,
      missing: missingTexts.length
    });
  }

  for (const batch of chunk(missingTexts, MAX_TRANSLATION_BATCH)) {
    const requestKey = `${language}:${batch.slice().sort().join("\u0001")}`;
    const pending =
      activeRequests.get(requestKey) ??
      fetch(`${TRANSLATE_ENDPOINT}&language=${encodeURIComponent(language)}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ texts: batch })
      })
        .then(async (response) => {
          if (!response.ok) {
            throw new Error("Failed to translate content.");
          }

          const payload = (await response.json()) as { translations?: Record<string, string> };
          if (import.meta.env.DEV) {
            console.log("[i18n] translate-batch response", {
              language,
              requested: batch.length,
              returned: Object.keys(payload.translations ?? {}).length
            });
          }
          return payload.translations ?? {};
        })
        .finally(() => {
          activeRequests.delete(requestKey);
        });

    activeRequests.set(requestKey, pending);
    const resolved = await pending;
    Object.entries(resolved).forEach(([source, translated]) => {
      if (isUsableTranslation(source, translated, language)) {
        mergedTranslations[source] = normalizeReaderText(translated);
      } else if (import.meta.env.DEV) {
        console.warn("[i18n] unusable translation result", {
          language,
          source,
          translated
        });
      }
    });
  }

  const fetchedOnly = Object.fromEntries(
    Object.entries(mergedTranslations).filter(
      ([source, translated]) => missingTexts.includes(source) && isUsableTranslation(source, translated, language)
    )
  );
  if (Object.keys(fetchedOnly).length) {
    mergeCache(language, fetchedOnly);
  }
  return mergedTranslations;
}

export async function translateDynamic(text: string, language: LanguageCode): Promise<string> {
  if (!text) return text;
  if (language === "en") return normalizeReaderText(text);
  const translated = lookupTranslation(text, language);
  if (translated) {
    return normalizeReaderText(translated);
  }

  try {
    const translations = await requestDynamicTranslations([text], language);
    return normalizeReaderText(
      isUsableTranslation(text, translations[text], language) ? translations[text] : text
    );
  } catch {
    return normalizeReaderText(text);
  }
}

export async function translateListData(items: string[] = [], language: LanguageCode): Promise<string[]> {
  if (!items.length) return items;
  const translations = await requestDynamicTranslations(items, language).catch<Record<string, string>>(() => ({}));
  return items.map((item) => normalizeReaderText(translations[item] ?? getCachedDynamicTranslation(item, language) ?? item, "list"));
}

type DetailBlock =
  | { type: "text"; value: string }
  | { type: "image"; src: string; alt?: string }
  | { type: "list"; items: string[] }
  | { type: "subheading"; value: string }
  | { type: string; value?: string; items?: string[]; alt?: string; src?: string }
  | string;

export type TranslatableSection = {
  title: string;
  summary?: string;
  impact?: string;
  topic?: {
    key: string;
    label: string;
  };
  details: DetailBlock[];
};

type KmsPayload = {
  sourceUrl?: string;
  date?: string;
  summary?: string;
  title?: string;
  audience?: string;
  highlights?: string[];
  keyChanges?: string[];
  keyPoints?: string[];
  tags?: string[];
  sections?: TranslatableSection[];
  categories?: Array<{ key: string; label: string; sections: TranslatableSection[] }>;
};

function collectArticleTexts(data: KmsPayload, scope: "summary+titles" | "full") {
  const collected = new Set<string>();
  const collect = (value?: string) => {
    if (value?.trim()) {
      collected.add(value);
    }
  };

  collect(data.summary);
  collect(data.title);
  collect(data.audience);
  data.highlights?.forEach(collect);
  data.keyChanges?.forEach(collect);
  data.keyPoints?.forEach(collect);
  data.tags?.forEach(collect);

  const collectSection = (section: TranslatableSection) => {
    collect(section.title);
    collect(section.topic?.label);
    if (scope === "full") {
      collect(section.summary);
      collect(section.impact);
      section.details.forEach((detail) => {
        if (typeof detail === "string") {
          collect(detail);
          return;
        }
        if ("value" in detail) {
          collect(detail.value);
        }
        if (detail.type === "list" && "items" in detail) {
          detail.items?.forEach((item) => collect(item));
        }
        if (detail.type === "image") {
          collect(detail.alt);
        }
      });
    }
  };

  data.categories?.forEach((category) => {
    collect(category.label);
    category.sections?.forEach(collectSection);
  });
  data.sections?.forEach(collectSection);

  return Array.from(collected);
}

function createArticleCacheKey(data: KmsPayload, language: LanguageCode, scope: "summary+titles" | "full") {
  const identity = [
    data.title ?? "",
    data.sourceUrl ?? "",
    data.date ?? "",
    data.sections?.length ?? 0,
    data.categories?.length ?? 0,
    collectArticleTexts(data, scope).join("\u0001")
  ].join("\u0002");
  return `${language}:${scope}:${identity}`;
}

export function getArticleTranslationStatus(
  data: KmsPayload,
  language: LanguageCode,
  options: { scope?: "summary+titles" | "full" } = {}
) {
  const scope = options.scope ?? "summary+titles";
  if (!data || language === "en") {
    return { total: 0, missing: 0, complete: true };
  }
  const texts = collectArticleTexts(data, scope);
  const missing = texts.filter((value) => !lookupTranslation(value, language)).length;
  return {
    total: texts.length,
    missing,
    complete: missing === 0
  };
}

export function hasStructuredArticleTranslation(
  data: KmsPayload,
  language: LanguageCode,
  options: { scope?: "summary+titles" | "full" } = {}
) {
  const scope = options.scope ?? "summary+titles";
  return language === "en" || (
    structuredTranslationCache.has(createArticleCacheKey(data, language, scope)) &&
    getArticleTranslationStatus(data, language, { scope }).complete
  );
}

function translateArticleWithLookup<T extends KmsPayload>(
  data: T,
  scope: "summary+titles" | "full",
  translateValue: (value?: string, mode?: "heading" | "paragraph" | "list" | "inline") => string | undefined
): T {
  const translateDetail = (detail: DetailBlock): DetailBlock => {
    if (typeof detail === "string") {
      return translateValue(detail, "paragraph") ?? detail;
    }
    if (detail.type === "list" && "items" in detail) {
      return {
        ...detail,
        items: detail.items?.map((item: string) => translateValue(item, "list") ?? item) ?? []
      };
    }
    if (detail.type === "image") {
      return { ...detail, alt: translateValue(detail.alt, "inline") ?? detail.alt };
    }
    if ("value" in detail && detail.value) {
      return {
        ...detail,
        value: translateValue(detail.value, detail.type === "subheading" ? "heading" : "paragraph") ?? detail.value
      };
    }
    return detail;
  };

  const translateSection = (section: TranslatableSection): TranslatableSection => ({
    ...section,
    title: translateValue(section.title, "heading") ?? section.title,
    summary: scope === "full" ? translateValue(section.summary, "paragraph") : section.summary,
    impact: scope === "full" ? translateValue(section.impact, "paragraph") : section.impact,
    topic: section.topic
      ? {
          ...section.topic,
          label: translateValue(section.topic.label, "inline") ?? section.topic.label
        }
      : section.topic,
    details: scope === "full" ? section.details.map(translateDetail) : section.details
  });

  return {
    ...data,
    summary: translateValue(data.summary, "paragraph"),
    title: translateValue(data.title, "heading"),
    audience: translateValue(data.audience, "paragraph"),
    highlights: data.highlights?.map((item) => translateValue(item, "paragraph") ?? item),
    keyChanges: data.keyChanges?.map((item) => translateValue(item, "paragraph") ?? item),
    keyPoints: data.keyPoints?.map((item) => translateValue(item, "paragraph") ?? item),
    tags: data.tags?.map((item) => translateValue(item, "inline") ?? item),
    categories: data.categories?.map((category) => ({
      ...category,
      label: translateValue(category.label, "inline") ?? category.label,
      sections: category.sections?.map(translateSection) ?? []
    })),
    sections: data.sections?.map(translateSection) ?? data.sections
  };
}

export function translateArticleDataFromCache<T extends KmsPayload>(
  data: T,
  language: LanguageCode,
  options: { scope?: "summary+titles" | "full" } = {}
): T {
  if (!data) return data;
  const scope = options.scope ?? "summary+titles";
  return translateArticleWithLookup(data, scope, (value?: string, mode = "paragraph") => {
    if (!value) return value;
    return normalizeReaderText(lookupTranslation(value, language) ?? value, mode);
  });
}

export async function translateArticleData<T extends KmsPayload>(
  data: T,
  language: LanguageCode,
  options: { scope?: "summary+titles" | "full" } = {}
): Promise<T> {
  if (!data) return data;
  const scope = options.scope ?? "summary+titles";
  const cacheKey = createArticleCacheKey(data, language, scope);
  const cachedArticle = structuredTranslationCache.get(cacheKey);
  if (cachedArticle && getArticleTranslationStatus(data, language, { scope }).complete) {
    return cachedArticle as T;
  }
  const collected = collectArticleTexts(data, scope);

  const missing = collected.filter((value) => !lookupTranslation(value, language));
  let fetched: Record<string, string> = {};
  if (missing.length) {
    try {
      fetched = await requestDynamicTranslations(missing, language);
    } catch {
      fetched = {};
    }
  }

  const translateValue = (value?: string, mode: "heading" | "paragraph" | "list" | "inline" = "paragraph") => {
    if (!value) return value;
    const fetchedValue = isUsableTranslation(value, fetched[value], language) ? fetched[value] : undefined;
    return normalizeReaderText(lookupTranslation(value, language) ?? fetchedValue ?? value, mode);
  };

  const translated = translateArticleWithLookup(data, scope, translateValue);

  const remainingMissing = collected.filter((value) => {
    const translatedValue = lookupTranslation(value, language) ?? fetched[value];
    return !isUsableTranslation(value, translatedValue, language);
  });

  if (language === "en" || remainingMissing.length === 0) {
    structuredTranslationCache.set(cacheKey, translated);
  } else {
    structuredTranslationCache.delete(cacheKey);
  }

  return translated;
}

export async function translateSectionData<T extends TranslatableSection>(
  section: T,
  language: LanguageCode,
  options: { scope?: "summary+titles" | "full" } = {}
): Promise<T> {
  const translated = await translateArticleData({ sections: [section] }, language, options);
  return (translated.sections?.[0] as T) ?? section;
}

export async function translateSectionsData<T extends TranslatableSection>(
  sections: T[] = [],
  language: LanguageCode,
  options: { scope?: "summary+titles" | "full" } = {}
): Promise<T[]> {
  if (!sections.length) return sections;
  const translated = await translateArticleData({ sections }, language, options);
  return (translated.sections as T[] | undefined) ?? sections;
}
