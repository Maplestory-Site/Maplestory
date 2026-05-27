import { useEffect, useMemo, useRef } from "react";
import { getDynamicTranslationCache, requestDynamicTranslations } from "./dynamicTranslate";
import { useI18n } from "./I18nProvider";
import { TRANSLATIONS } from "./translations";
import { type LanguageCode } from "./languages";

const TRANSLATABLE_ATTRIBUTES = ["placeholder", "aria-label", "title"] as const;
const SKIP_SELECTOR =
  "script, style, noscript, svg, canvas, code, pre, textarea, [data-no-translate], [data-no-translate] *";
const MAX_BATCH_SIZE = 45;

type TextRecord = {
  original: string;
  translated?: string;
};

type AttributeRecord = Partial<Record<(typeof TRANSLATABLE_ATTRIBUTES)[number], { original: string; translated: string }>>;

function hasLetters(value: string) {
  return /\p{L}/u.test(value);
}

function normalizeText(value = "") {
  return value.replace(/\s+/g, " ").trim();
}

function isWorthTranslating(value = "") {
  const text = normalizeText(value);
  if (!text || text.length < 2 || text.length > 1800) return false;
  if (!hasLetters(text)) return false;
  if (/^[\d\s.,:;+\-/%()]+$/.test(text)) return false;
  if (/^(?:https?:\/\/|www\.)/i.test(text)) return false;
  return true;
}

function isInsideSkippedElement(node: Node) {
  const parent = node.parentElement;
  return Boolean(parent?.closest(SKIP_SELECTOR));
}

function chunk<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function findOriginalKey(translatedText: string, language: LanguageCode): string | null {
  if (language === "en" || !translatedText) return null;
  const normalizedTranslated = normalizeText(translatedText);

  // Search in static translations
  const staticTable = TRANSLATIONS[language];
  if (staticTable) {
    for (const [key, val] of Object.entries(staticTable)) {
      if (normalizeText(val) === normalizedTranslated) {
        return key;
      }
    }
  }

  // Search in dynamic cache
  const dynamicCacheTable = getDynamicTranslationCache()[language];
  if (dynamicCacheTable) {
    for (const [key, val] of Object.entries(dynamicCacheTable)) {
      if (normalizeText(val) === normalizedTranslated) {
        return key;
      }
    }
  }

  return null;
}

export function DynamicPageTranslator() {
  const { language } = useI18n();
  const textRecords = useRef(new WeakMap<Text, TextRecord>());
  const attributeRecords = useRef(new WeakMap<Element, AttributeRecord>());
  const applyingRef = useRef(false);
  const observerRef = useRef<MutationObserver | null>(null);
  const scanTimerRef = useRef<number | null>(null);

  const knownTranslatedValues = useMemo(() => {
    const staticValues = Object.values(TRANSLATIONS[language] ?? {});
    const dynamicValues = Object.values(getDynamicTranslationCache()[language] ?? {});
    return new Set([...staticValues, ...dynamicValues].map(normalizeText).filter(Boolean));
  }, [language]);

  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") return;

    // Reset records when language changes so we re-scan the new DOM elements and state fresh
    textRecords.current = new WeakMap();
    attributeRecords.current = new WeakMap();

    const restoreEnglish = () => {
      applyingRef.current = true;
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let node = walker.nextNode() as Text | null;
      while (node) {
        const record = textRecords.current.get(node);
        if (record && record.original && node.nodeValue !== record.original) {
          node.nodeValue = record.original;
        }
        node = walker.nextNode() as Text | null;
      }

      document.querySelectorAll<HTMLElement>("*").forEach((element) => {
        const record = attributeRecords.current.get(element);
        if (!record) return;
        TRANSLATABLE_ATTRIBUTES.forEach((attribute) => {
          const attrRecord = record[attribute];
          if (attrRecord && attrRecord.original) {
            element.setAttribute(attribute, attrRecord.original);
          }
        });
      });
      applyingRef.current = false;
    };

    const scanAndTranslate = async () => {
      if (!document.body) return;

      if (language === "en") {
        restoreEnglish();
        return;
      }

      const textTargets: Array<{ node: Text; original: string; translated: string }> = [];
      const attributeTargets: Array<{ element: Element; attribute: (typeof TRANSLATABLE_ATTRIBUTES)[number]; original: string; translated: string }> = [];
      const missingTexts = new Set<string>();

      const processValue = (value: string) => {
        const normalized = normalizeText(value);
        if (!isWorthTranslating(normalized)) return null;
        if (knownTranslatedValues.has(normalized)) return null;

        // Check if we already have a translation in static tables or cache
        const translated = TRANSLATIONS[language]?.[normalized] ?? getDynamicTranslationCache()[language]?.[normalized];
        if (translated) {
          return { original: normalized, translated: normalizeText(translated), isCached: true };
        }

        return { original: normalized, translated: "", isCached: false };
      };

      // Walk text nodes
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
          if (isInsideSkippedElement(node)) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        }
      });

      let node = walker.nextNode() as Text | null;
      while (node) {
        const current = normalizeText(node.nodeValue ?? "");
        if (current) {
          const stored = textRecords.current.get(node);
          let original = current;

          if (stored) {
            if (current === stored.translated || current === stored.original) {
              original = stored.original;
            } else {
              original = current;
              textRecords.current.set(node, { original });
            }
          } else {
            const reversedKey = findOriginalKey(current, language);
            if (reversedKey) {
              original = reversedKey;
              textRecords.current.set(node, { original, translated: current });
            } else {
              textRecords.current.set(node, { original });
            }
          }

          const res = processValue(original);
          if (res) {
            if (res.isCached) {
              if (node.nodeValue !== res.translated) {
                applyingRef.current = true;
                node.nodeValue = res.translated;
                applyingRef.current = false;
              }
              textRecords.current.set(node, { original: res.original, translated: res.translated });
            } else {
              missingTexts.add(res.original);
              textTargets.push({ node, original: res.original, translated: "" });
            }
          }
        }
        node = walker.nextNode() as Text | null;
      }

      // Walk attributes
      document.querySelectorAll<HTMLElement>("*").forEach((element) => {
        if (element.closest(SKIP_SELECTOR)) return;
        const record = attributeRecords.current.get(element) ?? {};
        let updatedRecord = false;

        TRANSLATABLE_ATTRIBUTES.forEach((attribute) => {
          const current = normalizeText(element.getAttribute(attribute) ?? "");
          if (!current) return;

          let original = current;
          const attrRecord = record[attribute];
          
          if (attrRecord) {
            if (current === attrRecord.translated || current === attrRecord.original) {
              original = attrRecord.original;
            } else {
              original = current;
              record[attribute] = { original, translated: "" };
              updatedRecord = true;
            }
          } else {
            const reversedKey = findOriginalKey(current, language);
            if (reversedKey) {
              original = reversedKey;
              record[attribute] = { original, translated: current };
              updatedRecord = true;
            } else {
              record[attribute] = { original, translated: "" };
              updatedRecord = true;
            }
          }

          const res = processValue(original);
          if (res) {
            if (res.isCached) {
              if (element.getAttribute(attribute) !== res.translated) {
                applyingRef.current = true;
                element.setAttribute(attribute, res.translated);
                applyingRef.current = false;
              }
              record[attribute] = { original: res.original, translated: res.translated };
              updatedRecord = true;
            } else {
              missingTexts.add(res.original);
              attributeTargets.push({ element, attribute, original: res.original, translated: "" });
            }
          }
        });

        if (updatedRecord) {
          attributeRecords.current.set(element, record);
        }
      });

      const uniqueTexts = Array.from(missingTexts);
      if (!uniqueTexts.length) return;

      let translations: Record<string, string> = {};
      for (const batch of chunk(uniqueTexts, MAX_BATCH_SIZE)) {
        try {
          translations = {
            ...translations,
            ...(await requestDynamicTranslations(batch, language))
          };
        } catch {
          // Dynamic translation is best-effort; original text remains if it fails.
        }
      }

      if (!Object.keys(translations).length) return;

      applyingRef.current = true;
      textTargets.forEach(({ node, original }) => {
        const translated = translations[original];
        if (translated) {
          const normTranslated = normalizeText(translated);
          if (node.nodeValue !== normTranslated) {
            node.nodeValue = normTranslated;
          }
          textRecords.current.set(node, { original, translated: normTranslated });
        }
      });
      attributeTargets.forEach(({ element, attribute, original }) => {
        const translated = translations[original];
        if (translated) {
          const normTranslated = normalizeText(translated);
          element.setAttribute(attribute, normTranslated);
          const record = attributeRecords.current.get(element) ?? {};
          record[attribute] = { original, translated: normTranslated };
          attributeRecords.current.set(element, record);
        }
      });
      applyingRef.current = false;
    };

    const scheduleScan = () => {
      if (applyingRef.current) return;
      if (scanTimerRef.current !== null) {
        window.clearTimeout(scanTimerRef.current);
      }
      scanTimerRef.current = window.setTimeout(() => {
        scanTimerRef.current = null;
        void scanAndTranslate();
      }, 160);
    };

    observerRef.current?.disconnect();
    observerRef.current = new MutationObserver(scheduleScan);
    observerRef.current.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: [...TRANSLATABLE_ATTRIBUTES]
    });

    void scanAndTranslate();

    return () => {
      observerRef.current?.disconnect();
      if (scanTimerRef.current !== null) {
        window.clearTimeout(scanTimerRef.current);
      }
    };
  }, [knownTranslatedValues, language]);

  return null;
}
