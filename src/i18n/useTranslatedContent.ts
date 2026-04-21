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

type ArticleState<T> = {
  data: T;
  translating: boolean;
  ready: boolean;
  status: { total: number; missing: number; complete: boolean };
};

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
  const scope = options.scope ?? "full";

  // Single state object — avoids multiple re-renders from separate setState calls
  const [state, setState] = useState<ArticleState<T>>(() => ({
    data,
    translating: false,
    ready: true,
    status: { total: 0, missing: 0, complete: true }
  }));

  // Track previous inputs to detect changes during render
  const [prevData, setPrevData] = useState<T>(data);
  const [prevLanguage, setPrevLanguage] = useState(language);
  const [prevScope, setPrevScope] = useState(scope);

  // During-render sync — handles synchronous cases immediately with no setTimeout delay
  if (prevData !== data || prevLanguage !== language || prevScope !== scope) {
    setPrevData(data);
    setPrevLanguage(language);
    setPrevScope(scope);

    if (!data) {
      setState({ data, translating: false, ready: true, status: { total: 0, missing: 0, complete: true } });
    } else if (language === "en") {
      const translationStatus = getArticleTranslationStatus(data, language, { scope });
      setState({ data, translating: false, ready: true, status: translationStatus });
    } else {
      const translationStatus = getArticleTranslationStatus(data, language, { scope });
      const canUseImmediateCache =
        translationStatus.complete || hasStructuredArticleTranslation(data, language, { scope });
      if (canUseImmediateCache) {
        setState({
          data: translateArticleDataFromCache(data, language, { scope }) as T,
          translating: false,
          ready: true,
          status: translationStatus
        });
      } else {
        // Keep current content visible while async fetch runs — no English flash
        setState((prev) => ({ ...prev, translating: true, ready: false, status: translationStatus }));
      }
    }
  }

  // Async effect — only needed when translation must be fetched from the API
  useEffect(() => {
    if (!data || language === "en") return;

    const translationStatus = getArticleTranslationStatus(data, language, { scope });
    const canUseImmediateCache =
      translationStatus.complete || hasStructuredArticleTranslation(data, language, { scope });

    if (canUseImmediateCache) return;

    let active = true;

    translateArticleData(data, language, { scope })
      .then((next) => {
        if (active) {
          setState({
            data: next as T,
            translating: false,
            ready: true,
            status: getArticleTranslationStatus(data, language, { scope })
          });
        }
      })
      .catch(() => {
        if (active) {
          setState((prev) => ({ ...prev, translating: false, ready: true }));
        }
      });

    return () => {
      active = false;
    };
  }, [data, language, scope]);

  return { data: state.data, translating: state.translating, ready: state.ready, status: state.status };
}

export function useTranslatedSections<T extends TranslatableSection>(
  sections: T[] = EMPTY_SECTION_LIST as T[],
  options: { scope?: TranslationScope } = {}
) {
  const { language } = useI18n();
  const [translated, setTranslated] = useState<T[]>(sections);
  const scope = options.scope ?? "full";
  const stableSections = useMemo(() => sections, [sections]);

  // During-render sync for English — show raw sections immediately with no delay
  const [prevSectionsKey, setPrevSectionsKey] = useState(() => `${language}:${stableSections.length}`);
  const sectionsKey = `${language}:${stableSections.length}`;
  if (prevSectionsKey !== sectionsKey && language === "en") {
    setPrevSectionsKey(sectionsKey);
    setTranslated(stableSections);
  }

  useEffect(() => {
    if (language === "en") return;
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
