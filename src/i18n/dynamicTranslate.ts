import type { LanguageCode } from "./languages";
import { TRANSLATIONS } from "./translations";

const DYNAMIC_CACHE_KEY = "snailslayer-i18n-dynamic";
const TRANSLATE_ENDPOINT = "/api/content?resource=translate-batch";
const MAX_TRANSLATION_BATCH = 45;

type TranslationCache = Record<string, Record<string, string>>;

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

function readCache(): TranslationCache | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(DYNAMIC_CACHE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as TranslationCache;
  } catch {
    return null;
  }
}

export function getDynamicTranslationCache(): TranslationCache {
  return readCache() ?? {};
}

function writeCache(cache: TranslationCache) {
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
  return cache;
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

  for (const batch of chunk(uniqueTexts, MAX_TRANSLATION_BATCH)) {
    const response = await fetch(`${TRANSLATE_ENDPOINT}&language=${encodeURIComponent(language)}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ texts: batch })
    });

    if (!response.ok) {
      throw new Error("Failed to translate content.");
    }

    const payload = (await response.json()) as { translations?: Record<string, string> };
    mergedTranslations = {
      ...mergedTranslations,
      ...(payload.translations ?? {})
    };
  }

  mergeCache(language, mergedTranslations);
  return mergedTranslations;
}

export async function translateDynamic(text: string, language: LanguageCode): Promise<string> {
  if (!text) return text;
  if (language === "en") return decodeHtmlEntities(text);
  const table = TRANSLATIONS[language];
  if (table?.[text]) {
    return decodeHtmlEntities(table[text]);
  }
  const cache = readCache();
  const translated = cache?.[language]?.[text];
  if (translated) {
    return decodeHtmlEntities(translated);
  }

  try {
    const translations = await requestDynamicTranslations([text], language);
    return decodeHtmlEntities(translations[text] ?? text);
  } catch {
    return decodeHtmlEntities(text);
  }
}

type DetailBlock =
  | { type: "text"; value: string }
  | { type: "image"; src: string; alt?: string }
  | { type: "list"; items: string[] }
  | { type: "subheading"; value: string }
  | { type: string; value: string }
  | string;

type Section = {
  title: string;
  summary?: string;
  details: DetailBlock[];
};

type KmsPayload = {
  summary?: string;
  title?: string;
  sections?: Section[];
};

export async function translateArticleData<T extends KmsPayload>(
  data: T,
  language: LanguageCode,
  options: { scope?: "summary+titles" | "full" } = {}
): Promise<T> {
  if (!data) return data;
  const scope = options.scope ?? "summary+titles";
  const table = TRANSLATIONS[language] ?? {};
  const cache = readCache()?.[language] ?? {};

  const collected = new Set<string>();
  const collect = (value?: string) => {
    if (value?.trim()) {
      collected.add(value);
    }
  };

  collect(data.summary);
  collect(data.title);
  data.sections?.forEach((section) => {
    collect(section.title);
    if (scope === "full") {
      collect(section.summary);
      section.details.forEach((detail) => {
        if (typeof detail === "string") {
          collect(detail);
          return;
        }
        if (detail.type === "text" || detail.type === "subheading") {
          collect(detail.value);
        }
        if (detail.type === "list" && "items" in detail) {
          detail.items.forEach((item) => collect(item));
        }
      });
    }
  });

  const missing = Array.from(collected).filter((value) => !table[value] && !cache[value]);
  let fetched: Record<string, string> = {};
  if (missing.length) {
    try {
      fetched = await requestDynamicTranslations(missing, language);
    } catch {
      fetched = {};
    }
  }

  const translateValue = (value?: string) => {
    if (!value) return value;
    return decodeHtmlEntities(table[value] ?? cache[value] ?? fetched[value] ?? value);
  };

  const translated: T = {
    ...data,
    summary: translateValue(data.summary),
    title: translateValue(data.title),
    sections: data.sections
      ? await Promise.all(
          data.sections.map(async (section) => {
            const nextSection: Section = {
              ...section,
              title: translateValue(section.title) ?? section.title,
              summary: scope === "full" ? translateValue(section.summary) : section.summary,
              details: section.details
            };
            if (scope === "full") {
              nextSection.details = await Promise.all(
                section.details.map(async (detail) => {
                  if (typeof detail === "string") {
                    return translateValue(detail) ?? detail;
                  }
                  if (detail.type === "text") {
                    return { ...detail, value: translateValue(detail.value) ?? detail.value };
                  }
                  if (detail.type === "list" && "items" in detail) {
                    return {
                      ...detail,
                      items: detail.items.map((item: string) => translateValue(item) ?? item)
                    };
                  }
                  if (detail.type === "subheading") {
                    return { ...detail, value: translateValue(detail.value) ?? detail.value };
                  }
                  return detail;
                })
              );
            }
            return nextSection;
          })
        )
      : data.sections
  };

  return translated;
}
