import { useEffect, useMemo, useRef } from "react";
import { getDynamicTranslationCache, requestDynamicTranslations } from "./dynamicTranslate";
import { useI18n } from "./I18nProvider";
import { TRANSLATIONS } from "./translations";

const TRANSLATABLE_ATTRIBUTES = ["placeholder", "aria-label", "title"] as const;
const SKIP_SELECTOR =
  "script, style, noscript, svg, canvas, code, pre, textarea, [data-no-translate], [data-no-translate] *";
const MAX_BATCH_SIZE = 45;

type TextRecord = {
  original: string;
};

type AttributeRecord = Partial<Record<(typeof TRANSLATABLE_ATTRIBUTES)[number], string>>;

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

    const restoreEnglish = () => {
      applyingRef.current = true;
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let node = walker.nextNode() as Text | null;
      while (node) {
        const record = textRecords.current.get(node);
        if (record && node.nodeValue !== record.original) {
          node.nodeValue = record.original;
        }
        node = walker.nextNode() as Text | null;
      }

      document.querySelectorAll<HTMLElement>("*").forEach((element) => {
        const record = attributeRecords.current.get(element);
        if (!record) return;
        TRANSLATABLE_ATTRIBUTES.forEach((attribute) => {
          const original = record[attribute];
          if (original) {
            element.setAttribute(attribute, original);
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

      const textTargets: Array<{ node: Text; original: string }> = [];
      const attributeTargets: Array<{ element: Element; attribute: (typeof TRANSLATABLE_ATTRIBUTES)[number]; original: string }> = [];
      const texts = new Set<string>();

      const addText = (value: string) => {
        const normalized = normalizeText(value);
        if (!isWorthTranslating(normalized)) return "";
        if (knownTranslatedValues.has(normalized)) return "";
        texts.add(normalized);
        return normalized;
      };

      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
          if (isInsideSkippedElement(node)) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        }
      });

      let node = walker.nextNode() as Text | null;
      while (node) {
        const current = node.nodeValue ?? "";
        const stored = textRecords.current.get(node);
        const original = stored?.original ?? normalizeText(current);
        if (!stored && original) {
          textRecords.current.set(node, { original });
        }
        const queued = addText(original);
        if (queued) {
          textTargets.push({ node, original: queued });
        }
        node = walker.nextNode() as Text | null;
      }

      document.querySelectorAll<HTMLElement>("*").forEach((element) => {
        if (element.closest(SKIP_SELECTOR)) return;
        const record = attributeRecords.current.get(element) ?? {};

        TRANSLATABLE_ATTRIBUTES.forEach((attribute) => {
          const current = element.getAttribute(attribute) ?? "";
          const original = record[attribute] ?? normalizeText(current);
          if (!record[attribute] && original) {
            record[attribute] = original;
          }
          const queued = addText(original);
          if (queued) {
            attributeTargets.push({ element, attribute, original: queued });
          }
        });

        if (Object.keys(record).length) {
          attributeRecords.current.set(element, record);
        }
      });

      const uniqueTexts = Array.from(texts);
      if (!uniqueTexts.length) return;

      let translations: Record<string, string> = {};
      for (const batch of chunk(uniqueTexts, MAX_BATCH_SIZE)) {
        try {
          translations = {
            ...translations,
            ...(await requestDynamicTranslations(batch, language))
          };
        } catch {
          // Dynamic translation is best-effort; the original text remains visible if it fails.
        }
      }

      if (!Object.keys(translations).length) return;

      applyingRef.current = true;
      textTargets.forEach(({ node, original }) => {
        const translated = translations[original];
        if (translated && node.nodeValue !== translated) {
          node.nodeValue = translated;
        }
      });
      attributeTargets.forEach(({ element, attribute, original }) => {
        const translated = translations[original];
        if (translated) {
          element.setAttribute(attribute, translated);
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
