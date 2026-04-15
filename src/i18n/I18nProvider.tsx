import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { LANGUAGES, SUPPORTED_LANGUAGE_CODES, type LanguageCode, type LanguageMeta } from "./languages";
import { requestDynamicTranslations } from "./dynamicTranslate";
import { TRANSLATIONS } from "./translations";

type I18nContextValue = {
  language: LanguageCode;
  languageMeta: LanguageMeta;
  languages: LanguageMeta[];
  setLanguage: (language: LanguageCode) => void;
  t: (key: string) => string;
  td: (text: string) => string;
  isRtl: boolean;
};

const STORAGE_KEY = "snailslayer-language";
const DYNAMIC_CACHE_KEY = "snailslayer-i18n-dynamic";

const I18nContext = createContext<I18nContextValue | null>(null);

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

function normalizeLanguage(input?: string | null): LanguageCode {
  if (!input) return "en";
  const lower = input.toLowerCase();
  const direct = SUPPORTED_LANGUAGE_CODES.find((code) => code === lower);
  if (direct) return direct;
  const base = lower.split("-")[0];
  return (SUPPORTED_LANGUAGE_CODES.find((code) => code === base) ?? "en") as LanguageCode;
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const supportedLanguages = useMemo(
    () => LANGUAGES.filter((lang) => SUPPORTED_LANGUAGE_CODES.includes(lang.code)),
    []
  );
  const [dynamicCache, setDynamicCache] = useState<Record<string, Record<string, string>>>(() => {
    if (typeof window === "undefined") return {};
    try {
      const raw = window.localStorage.getItem(DYNAMIC_CACHE_KEY);
      return raw ? (JSON.parse(raw) as Record<string, Record<string, string>>) : {};
    } catch {
      return {};
    }
  });
  const [language, setLanguageState] = useState<LanguageCode>(() => {
    if (typeof window === "undefined") return "en";
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return normalizeLanguage(stored ?? navigator.language);
  });

  const languageMeta = useMemo(
    () => supportedLanguages.find((lang) => lang.code === language) ?? supportedLanguages[0],
    [language, supportedLanguages]
  );

  const isRtl = languageMeta.dir === "rtl";

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, language);
  }, [language]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.lang = language;
    document.documentElement.dir = languageMeta.dir;
    document.body.classList.toggle("is-rtl", isRtl);
  }, [isRtl, language, languageMeta.dir]);

  const setLanguage = useCallback((next: LanguageCode) => {
    setLanguageState(next);
  }, []);

  const pendingTranslationsRef = useRef(new Map<LanguageCode, Set<string>>());
  const flushTimerRef = useRef<number | null>(null);

  const flushPendingTranslations = useCallback(
    async (targetLanguage: LanguageCode) => {
      const queue = pendingTranslationsRef.current.get(targetLanguage);
      if (!queue || !queue.size) return;
      const texts = Array.from(queue);
      pendingTranslationsRef.current.set(targetLanguage, new Set());

      try {
        const translations = await requestDynamicTranslations(texts, targetLanguage);
        if (Object.keys(translations).length) {
          setDynamicCache((current) => ({
            ...current,
            [targetLanguage]: {
              ...(current[targetLanguage] ?? {}),
              ...translations
            }
          }));
        }
      } catch {
        texts.forEach((text) => queue.add(text));
      }
    },
    []
  );

  const queueTranslation = useCallback(
    (text: string) => {
      const value = text?.trim();
      if (!value || language === "en") return;
      if (TRANSLATIONS[language]?.[value]) return;
      if (dynamicCache?.[language]?.[value]) return;

      const queue = pendingTranslationsRef.current.get(language) ?? new Set<string>();
      queue.add(value);
      pendingTranslationsRef.current.set(language, queue);

      if (typeof window !== "undefined" && flushTimerRef.current == null) {
        flushTimerRef.current = window.setTimeout(() => {
          flushTimerRef.current = null;
          void flushPendingTranslations(language);
        }, 120);
      }
    },
    [dynamicCache, flushPendingTranslations, language]
  );

  const t = useCallback(
    (key: string) => {
      const table = TRANSLATIONS[language];
      if (table && table[key]) return table[key];
      const cached = dynamicCache?.[language]?.[key];
      if (cached) return cached;
      queueTranslation(key);
      const fallback = TRANSLATIONS.en[key];
      return fallback ?? key;
    },
    [dynamicCache, language, queueTranslation]
  );

  const td = useCallback(
    (text: string) => {
      if (!text) return text;
      if (language === "en") return decodeHtmlEntities(text);
      const table = TRANSLATIONS[language];
      if (table?.[text]) {
        return decodeHtmlEntities(table[text]);
      }
      const translated = dynamicCache?.[language]?.[text];
      if (translated) {
        return decodeHtmlEntities(translated);
      }
      queueTranslation(text);
      return decodeHtmlEntities(text);
    },
    [dynamicCache, language, queueTranslation]
  );

  const value = useMemo<I18nContextValue>(
    () => ({
      language,
      languageMeta,
      languages: supportedLanguages,
      setLanguage,
      t,
      td,
      isRtl
    }),
    [isRtl, language, languageMeta, setLanguage, supportedLanguages, t, td]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within I18nProvider");
  }
  return context;
}
