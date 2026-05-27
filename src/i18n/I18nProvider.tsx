import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { LANGUAGES, SUPPORTED_LANGUAGE_CODES, type LanguageCode, type LanguageMeta } from "./languages";
import {
  getDynamicTranslationCache,
  requestDynamicTranslations,
  subscribeDynamicTranslationCache
} from "./dynamicTranslate";
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

function isLikelyUntranslatedIdentity(source = "", translated = "", language?: LanguageCode) {
  if (!source || !translated || language === "en") return false;
  const normalize = (value: string) => decodeHtmlEntities(value).replace(/\s+/g, " ").trim();
  const original = normalize(source);
  const candidate = normalize(translated);
  if (original !== candidate) return false;
  return original.length > 12 && /\s/.test(original) && /[A-Za-z]{3,}/.test(original);
}

function isUsableDynamicTranslation(source = "", translated?: string, language?: LanguageCode) {
  return Boolean(translated) && !isLikelyUntranslatedIdentity(source, translated ?? "", language);
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const supportedLanguages = useMemo(
    () => LANGUAGES.filter((lang) => SUPPORTED_LANGUAGE_CODES.includes(lang.code)),
    []
  );
  const [dynamicCache, setDynamicCache] = useState<Record<string, Record<string, string>>>(() => {
    if (typeof window === "undefined") return {};
    return getDynamicTranslationCache();
  });
  const [language, setLanguageState] = useState<LanguageCode>(() => {
    if (typeof window === "undefined") return "en";
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return normalizeLanguage(stored ?? navigator.language);
  });

  useEffect(() => {
    return subscribeDynamicTranslationCache((cache) => {
      setDynamicCache(cache);
    });
  }, []);

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

    // Don't dim the page on initial load — only animate actual language switches
    if (isFirstLangEffect.current) {
      isFirstLangEffect.current = false;
      return;
    }

    document.body.classList.add("is-lang-switching");
    const timer = window.setTimeout(() => {
      document.body.classList.remove("is-lang-switching");
    }, 180);
    return () => window.clearTimeout(timer);
  }, [isRtl, language, languageMeta.dir]);

  const pendingTranslationsRef = useRef(new Map<LanguageCode, Set<string>>());
  const flushTimerRef = useRef<number | null>(null);
  const flushFrameRef = useRef<number | null>(null);
  const isFirstLangEffect = useRef(true);

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
        const currentQueue = pendingTranslationsRef.current.get(targetLanguage) ?? new Set<string>();
        texts.forEach((text) => currentQueue.add(text));
        pendingTranslationsRef.current.set(targetLanguage, currentQueue);
      }
    },
    []
  );

  const setLanguage = useCallback((next: LanguageCode) => {
    // Cancel any pending debounce timer
    if (flushTimerRef.current !== null) {
      window.clearTimeout(flushTimerRef.current);
      flushTimerRef.current = null;
    }
    if (flushFrameRef.current !== null) {
      window.cancelAnimationFrame(flushFrameRef.current);
      flushFrameRef.current = null;
    }
    setLanguageState(next);
  }, []);

  // Flush translations immediately after language changes (after render queues strings)
  useEffect(() => {
    if (language === "en") return;
    // Use rAF so the render has completed and t()/td() have queued their strings
    flushFrameRef.current = window.requestAnimationFrame(() => {
      flushFrameRef.current = null;
      void flushPendingTranslations(language);
    });
    return () => {
      if (flushFrameRef.current !== null) {
        window.cancelAnimationFrame(flushFrameRef.current);
        flushFrameRef.current = null;
      }
    };
  }, [language, flushPendingTranslations]);

  const queueTranslation = useCallback(
    (text: string) => {
      const value = text?.trim();
      if (!value || language === "en") return;
      if (TRANSLATIONS[language]?.[value]) return;
      if (isUsableDynamicTranslation(value, dynamicCache?.[language]?.[value], language)) return;

      const queue = pendingTranslationsRef.current.get(language) ?? new Set<string>();
      queue.add(value);
      pendingTranslationsRef.current.set(language, queue);

      // Only set debounce timer if no rAF flush is pending
      if (typeof window !== "undefined" && flushTimerRef.current == null && flushFrameRef.current == null) {
        flushTimerRef.current = window.setTimeout(() => {
          flushTimerRef.current = null;
          void flushPendingTranslations(language);
        }, 50);
      }
    },
    [dynamicCache, flushPendingTranslations, language]
  );

  const t = useCallback(
    (key: string) => {
      const table = TRANSLATIONS[language];
      if (table && table[key]) return table[key];
      const cached = dynamicCache?.[language]?.[key];
      if (isUsableDynamicTranslation(key, cached, language)) return cached;
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
      if (translated && isUsableDynamicTranslation(text, translated, language)) {
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

// eslint-disable-next-line react-refresh/only-export-components
export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within I18nProvider");
  }
  return context;
}
