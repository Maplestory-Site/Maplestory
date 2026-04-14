import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { LANGUAGES, type LanguageCode, type LanguageMeta } from "./languages";
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
  const direct = LANGUAGES.find((lang) => lang.code === lower);
  if (direct) return direct.code;
  const base = lower.split("-")[0];
  return (LANGUAGES.find((lang) => lang.code === base)?.code ?? "en") as LanguageCode;
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<LanguageCode>(() => {
    if (typeof window === "undefined") return "en";
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return normalizeLanguage(stored ?? navigator.language);
  });

  const languageMeta = useMemo(
    () => LANGUAGES.find((lang) => lang.code === language) ?? LANGUAGES[0],
    [language]
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

  const t = useCallback(
    (key: string) => {
      const table = TRANSLATIONS[language];
      if (table && table[key]) return table[key];
      const fallback = TRANSLATIONS.en[key];
      return fallback ?? key;
    },
    [language]
  );

  const td = useCallback(
    (text: string) => {
      if (!text) return text;
      if (language === "en") return decodeHtmlEntities(text);
      if (typeof window === "undefined") return text;
      const cacheRaw = window.localStorage.getItem(DYNAMIC_CACHE_KEY);
      if (!cacheRaw) return decodeHtmlEntities(text);
      try {
        const cache = JSON.parse(cacheRaw) as Record<string, Record<string, string>>;
        const translated = cache?.[language]?.[text] ?? text;
        return decodeHtmlEntities(translated);
      } catch {
        return decodeHtmlEntities(text);
      }
    },
    [language]
  );

  const value = useMemo<I18nContextValue>(
    () => ({
      language,
      languageMeta,
      languages: LANGUAGES,
      setLanguage,
      t,
      td,
      isRtl
    }),
    [isRtl, language, languageMeta, setLanguage, t, td]
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
