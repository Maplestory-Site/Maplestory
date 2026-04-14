import type { LanguageCode } from "./languages";

const DYNAMIC_CACHE_KEY = "snailslayer-i18n-dynamic";

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

export async function translateDynamic(text: string, language: LanguageCode): Promise<string> {
  if (!text) return text;
  if (language === "en") return decodeHtmlEntities(text);
  const cache = readCache();
  const translated = cache?.[language]?.[text];
  return decodeHtmlEntities(translated ?? text);
}

type DetailBlock =
  | { type: "text"; value: string }
  | { type: "image"; src: string; alt?: string }
  | { type: "list"; items: string[] }
  | { type: "subheading"; value: string }
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
  const translated: T = {
    ...data,
    summary: data.summary ? await translateDynamic(data.summary, language) : data.summary,
    title: data.title ? await translateDynamic(data.title, language) : data.title,
    sections: data.sections
      ? await Promise.all(
          data.sections.map(async (section) => {
            const nextSection: Section = {
              ...section,
              title: section.title ? await translateDynamic(section.title, language) : section.title,
              summary:
                scope === "full" && section.summary
                  ? await translateDynamic(section.summary, language)
                  : section.summary,
              details: section.details
            };
            if (scope === "full") {
              nextSection.details = await Promise.all(
                section.details.map(async (detail) => {
                  if (typeof detail === "string") {
                    return translateDynamic(detail, language);
                  }
                  if (detail.type === "text") {
                    return { ...detail, value: await translateDynamic(detail.value, language) };
                  }
                  if (detail.type === "list") {
                    return {
                      ...detail,
                      items: await Promise.all(detail.items.map((item) => translateDynamic(item, language)))
                    };
                  }
                  if (detail.type === "subheading") {
                    return { ...detail, value: await translateDynamic(detail.value, language) };
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
