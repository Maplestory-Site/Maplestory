import { useEffect, useMemo, useState } from "react";
import {
  getArticleTranslationStatus,
  hasStructuredArticleTranslation,
  translateArticleData,
  translateArticleDataFromCache,
  translateListData,
  translateSectionsData,
  type TranslatableSection
} from "./dynamicTranslate";
import { useI18n } from "./I18nProvider";

type ArticleLike = Parameters<typeof translateArticleData>[0];
type TranslationScope = "summary+titles" | "full";
const EMPTY_TEXT_LIST: string[] = [];
const EMPTY_SECTION_LIST: TranslatableSection[] = [];

export function useTranslatedArticle<T extends ArticleLike | null | undefined>(
  data: T,
  options: { scope?: TranslationScope } = {}
) {
  const state = useTranslatedArticleState(data, options);
  return state.data;
}

export function useTranslatedArticleState<T extends ArticleLike | null | undefined>(
  data: T,
  options: { scope?: TranslationScope } = {}
) {
  const { language } = useI18n();
  const [translated, setTranslated] = useState<T>(data);
  const [translating, setTranslating] = useState(false);
  const [ready, setReady] = useState(true);
  const [status, setStatus] = useState({ total: 0, missing: 0, complete: true });
  const scope = options.scope ?? "full";

  useEffect(() => {
    let active = true;
    if (!data) {
      setTranslated(data);
      setTranslating(false);
      setReady(true);
      setStatus({ total: 0, missing: 0, complete: true });
      return;
    }

    const status = getArticleTranslationStatus(data, language, { scope });
    setStatus(status);

    if (language === "en") {
      setTranslated(data);
      setTranslating(false);
      setReady(true);
      return;
    }

    const canUseImmediateCache = status.complete || hasStructuredArticleTranslation(data, language, { scope });
    if (canUseImmediateCache) {
      setTranslated(translateArticleDataFromCache(data, language, { scope }) as T);
      setTranslating(false);
      setReady(true);
      return;
    }

    setTranslated(data);
    setTranslating(true);
    setReady(false);

    translateArticleData(data, language, { scope }).then((next) => {
      if (active) {
        setTranslated(next as T);
        setStatus(getArticleTranslationStatus(data, language, { scope }));
        setTranslating(false);
        setReady(true);
      }
    }).catch(() => {
      if (active) {
        setTranslated(data);
        setTranslating(false);
        setReady(true);
      }
    });

    return () => {
      active = false;
    };
  }, [data, language, scope]);

  return { data: translated, translating, ready, status };
}

export function useTranslatedSections<T extends TranslatableSection>(
  sections: T[] = EMPTY_SECTION_LIST as T[],
  options: { scope?: TranslationScope } = {}
) {
  const { language } = useI18n();
  const [translated, setTranslated] = useState<T[]>(sections);
  const scope = options.scope ?? "full";
  const stableSections = useMemo(() => sections, [sections]);

  useEffect(() => {
    let active = true;
    translateSectionsData(stableSections, language, { scope }).then((next) => {
      if (active) {
        setTranslated(next);
      }
    });

    return () => {
      active = false;
    };
  }, [language, scope, stableSections]);

  return translated;
}

export function useTranslatedList(items: string[] = []) {
  const { language } = useI18n();
  const [translated, setTranslated] = useState<string[]>(items);
  const stableItems = useMemo(() => items.length ? items : EMPTY_TEXT_LIST, [items]);

  useEffect(() => {
    let active = true;
    translateListData(stableItems, language).then((next) => {
      if (active) {
        setTranslated(next);
      }
    });

    return () => {
      active = false;
    };
  }, [language, stableItems]);

  return translated;
}
