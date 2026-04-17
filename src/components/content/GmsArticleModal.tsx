import { useEffect, useMemo, useRef, useState } from "react";
import type { NewsItem } from "../../data/newsHub";
import { formatNewsMetaDate } from "../../lib/newsHub";
import { useI18n } from "../../i18n/I18nProvider";
import { getArticlePendingText } from "../../i18n/articlePendingText";
import { useTranslatedArticleState } from "../../i18n/useTranslatedContent";

type GmsSection = {
  title: string;
  summary: string;
  details: GmsDetail[];
  topic: {
    key: string;
    label: string;
  };
};

type GmsDetail =
  | { type: "text"; value: string }
  | { type: "image"; src: string; alt?: string }
  | { type: "list"; items: string[] }
  | { type: "subheading"; value: string }
  | { type: string; value: string };

type GmsPayload = {
  title?: string;
  sourceName: string;
  sourceUrl: string;
  summary: string;
  audience?: string;
  highlights?: string[];
  keyChanges?: string[];
  keyPoints: string[];
  tags?: string[];
  sections: GmsSection[];
  categories?: Array<{ key: string; label: string; sections: GmsSection[] }>;
  heroImage?: string;
  date?: string;
};

type GmsArticleModalProps = {
  item: NewsItem | null;
  onClose: () => void;
};

function splitArticleParagraphs(value = "") {
  return value
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

export function GmsArticleModal({ item, onClose }: GmsArticleModalProps) {
  const { t, td, language } = useI18n();
  const [data, setData] = useState<GmsPayload | null>(null);
  const translatedArticle = useTranslatedArticleState(data, { scope: "full" });
  const translatedData = translatedArticle.data;
  const [loading, setLoading] = useState(false);
  const [openTopics, setOpenTopics] = useState<string[]>([]);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const sectionRefs = useMemo(() => new Map<string, HTMLElement>(), []);

  useEffect(() => {
    let active = true;

    async function loadArticle() {
      if (!item?.sourceUrl) {
        setData(null);
        return;
      }

      setLoading(true);
      try {
        const cacheBust = `${Date.now()}`;
        const response = await fetch(
          `/api/gms?url=${encodeURIComponent(item.sourceUrl)}&force=1&ts=${cacheBust}`,
          { cache: "no-store" }
        );
        if (!response.ok) {
          throw new Error("Failed to load GMS article.");
        }
        const payload = (await response.json()) as GmsPayload;
        if (active) {
          setData(payload);
          setOpenTopics([]);
        }
      } catch {
        if (active) {
          setData(null);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadArticle();

    return () => {
      active = false;
    };
  }, [item]);

  const renderData = translatedData ?? data;
  const published = useMemo(() => formatNewsMetaDate(item?.publishedAt ?? ""), [item]);
  const renderDate = useMemo(
    () => formatNewsMetaDate(renderData?.date || item?.publishedAt || ""),
    [renderData?.date, item?.publishedAt]
  );
  const isTranslatingArticle =
    Boolean(data) && language !== "en" && translatedArticle.translating && !translatedArticle.ready;
  const articleText = (value?: string, fallback = "") => value || fallback;
  const dynamicText = (value?: string, fallback = "") => {
    const resolved = articleText(value, fallback);
    return td(resolved);
  };
  const sectionList = useMemo(() => renderData?.sections ?? [], [renderData]);
  const categories = useMemo(() => renderData?.categories ?? [], [renderData]);
  const fallbackSections = useMemo(() => {
    if (!item) return [];
    return [
      {
        title: t("Overview"),
        summary: td(item.summary || ""),
        details: item.summary ? [{ type: "text", value: item.summary }] : [],
        topic: { key: "overview", label: t("Overview") }
      }
    ];
  }, [item, t, td]);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const visibleSections = useMemo(() => {
    if (activeCategory === "all" || !categories.length) return sectionList.length ? sectionList : fallbackSections;
    const match = categories.find((category) => category.key === activeCategory);
    return match?.sections ?? (sectionList.length ? sectionList : fallbackSections);
  }, [activeCategory, categories, sectionList, fallbackSections]);
  const normalizedSummary = useMemo(() => {
    const summary = (renderData?.summary || item?.summary || "").trim();
    return summary.replace(/\s+/g, " ").slice(0, 240);
  }, [renderData?.summary, item?.summary]);
  const breakdownSections = useMemo(() => {
    if (!normalizedSummary) return visibleSections;
    return visibleSections.filter((section, index) => {
      if (index !== 0 || section.title !== "Overview") return true;
      const summary = (section.summary || "").replace(/\s+/g, " ").slice(0, 240);
      const firstDetail = section.details[0];
      const firstText =
        firstDetail?.type === "text" ? (firstDetail.value || "").replace(/\s+/g, " ").slice(0, 240) : "";
      return summary !== normalizedSummary && firstText !== normalizedSummary;
    });
  }, [normalizedSummary, visibleSections]);

  useEffect(() => {
    setActiveCategory("all");
  }, [item?.id]);

  useEffect(() => {
    setShowScrollTop(false);
    if (bodyRef.current) {
      bodyRef.current.scrollTop = 0;
    }
  }, [item?.id]);

  if (!item) return null;

  return (
    <div className="kms-modal" role="dialog" aria-modal="true" aria-labelledby="gms-modal-title">
      <button className="kms-modal__backdrop" type="button" aria-label={t("Close")} onClick={onClose} />
      <div className="kms-modal__panel">
        <div className="kms-modal__header">
          <div>
            <span className="kms-modal__eyebrow">{t("GMS Update")}</span>
            <h2 id="gms-modal-title">
              {isTranslatingArticle ? getArticlePendingText(language, "title") : dynamicText(renderData?.title, item.title)}
            </h2>
            <p className="kms-modal__meta">
              <span>{renderDate || published}</span>
              <span>{t(item.category.replace("-", " "))}</span>
            </p>
          </div>
          <button className="kms-modal__close" type="button" onClick={onClose}>
            {t("Close")}
          </button>
        </div>

        <div
          className="kms-modal__body"
          ref={bodyRef}
          onScroll={(event) => {
            const target = event.currentTarget;
            setShowScrollTop(target.scrollTop > 300);
          }}
        >
          <div className="kms-modal__block">
            <h3 className="kms-modal__section-title">{t("Summary")}</h3>
            <div className="kms-modal__summary card">
              {(renderData?.heroImage || item.image) && (
                <div className="kms-modal__hero">
                  <img src={renderData?.heroImage || item.image} alt={dynamicText(renderData?.title, item.title)} loading="lazy" />
                </div>
              )}
              <h4>{t("Official summary")}</h4>
              {isTranslatingArticle ? (
                <>
                  <p>{getArticlePendingText(language, "body")}</p>
                  <div className="kms-loading">
                    <span className="kms-loading__dot" />
                    <span>{getArticlePendingText(language, "status")}</span>
                  </div>
                </>
              ) : (
                <p>{dynamicText(renderData?.summary, item.summary)}</p>
              )}
            </div>
          </div>

          {!isTranslatingArticle && (
          <div className="kms-modal__block">
            <h3 className="kms-modal__section-title">{t("Section shortcuts")}</h3>
            {categories.length > 0 && (
              <div className="kms-modal__categories">
                <button
                  className={`kms-modal__category ${activeCategory === "all" ? "is-active" : ""}`}
                  type="button"
                  onClick={() => setActiveCategory("all")}
                >
                  {t("All")}
                </button>
                {categories.map((category) => (
                  <button
                    key={category.key}
                    className={`kms-modal__category ${activeCategory === category.key ? "is-active" : ""}`}
                    type="button"
                    onClick={() => setActiveCategory(category.key)}
                  >
                    {dynamicText(category.label)}
                  </button>
                ))}
              </div>
            )}
            <div className="kms-modal__shortcuts">
              {visibleSections.map((section, index) => (
                <button
                  className="kms-modal__shortcut"
                  key={`${section.title}-${index}`}
                  type="button"
                  onClick={() => {
                    const target = sectionRefs.get(`${section.title}-${index}`);
                    if (target) {
                      target.scrollIntoView({ behavior: "smooth", block: "start" });
                    }
                    setOpenTopics((current) =>
                      current.includes(`${section.title}-${index}`)
                        ? current
                        : [...current, `${section.title}-${index}`]
                    );
                  }}
                >
                  {dynamicText(section.title)}
                </button>
              ))}
            </div>
          </div>
          )}

          <div className="kms-modal__sections">
            <h3 className="kms-modal__section-title">{t("Full breakdown")}</h3>
            {loading || isTranslatingArticle ? (
              <div className="kms-skeleton">
                {isTranslatingArticle ? (
                  <p className="kms-modal__audience">{getArticlePendingText(language, "body")}</p>
                ) : null}
                <div className="kms-skeleton__row" />
                <div className="kms-skeleton__row" />
                <div className="kms-skeleton__row is-short" />
                <div className="kms-skeleton__card" />
              </div>
            ) : null}
            {!loading && !isTranslatingArticle && !visibleSections.length && <p>{t("No sections available yet. Try again in a moment.")}</p>}
            {!loading &&
              !isTranslatingArticle &&
              breakdownSections.map((section, index) => {
                const key = `${section.title}-${index}`;
                const isOpen = openTopics.includes(key);
                return (
                  <section
                    className="kms-topic-group"
                    key={key}
                    ref={(node) => {
                      if (node && !sectionRefs.has(key)) {
                        sectionRefs.set(key, node);
                      }
                    }}
                  >
                    <button
                      className={`kms-topic-group__header ${isOpen ? "is-open" : ""}`}
                      type="button"
                      onClick={() =>
                        setOpenTopics((current) =>
                          current.includes(key) ? current.filter((item) => item !== key) : [...current, key]
                        )
                      }
                    >
                      <span>{dynamicText(section.title)}</span>
                      <small>{section.details.length} {t("entries")}</small>
                    </button>
                    <div
                      className={`kms-topic-group__sections ${isOpen ? "is-open" : ""}`}
                      aria-hidden={!isOpen}
                    >
                      <article className="kms-section card">
                        <header>
                          <h3>{dynamicText(section.title)}</h3>
                          <p>{dynamicText(section.summary, t("Official update details."))}</p>
                        </header>
                        <div className="kms-section__details">
                          <div className="kms-section__content">
                            {section.details.map((detail, detailIndex) => {
                              if (isImageDetail(detail)) {
                                return (
                                  <div key={`${detail.src}-${detailIndex}`} className="kms-section__image">
                                    <img src={detail.src} alt={dynamicText(detail.alt, section.title)} loading="lazy" />
                                  </div>
                                );
                              }
                              if (isListDetail(detail)) {
                                return (
                                  <ul key={`${detail.items.join("-")}-${detailIndex}`} className="kms-section__list">
                                    {detail.items.map((item, itemIndex) => (
                                      <li key={`${item}-${itemIndex}`}>{dynamicText(item)}</li>
                                    ))}
                                  </ul>
                                );
                              }
                              if (isSubheadingDetail(detail)) {
                                return (
                                  <h4 key={`${detail.value}-${detailIndex}`} className="kms-section__subheading">
                                    {dynamicText(detail.value)}
                                  </h4>
                                );
                              }
                              const normalized = (detail.value || "").replace(/\s+/g, " ").slice(0, 240);
                              if (
                                detailIndex === 0 &&
                                section === breakdownSections[0] &&
                                normalizedSummary &&
                                normalized === normalizedSummary
                              ) {
                                return null;
                              }
                              const paragraphs = splitArticleParagraphs(detail.value);
                              return paragraphs.map((paragraph, paragraphIndex) => (
                                <p key={`${detail.value}-${detailIndex}-${paragraphIndex}`} className="kms-section__text">
                                  {dynamicText(paragraph)}
                                </p>
                              ));
                            })}
                          </div>
                        </div>
                      </article>
                    </div>
                  </section>
                );
              })}
          </div>
        </div>

        {showScrollTop ? (
          <button
            className="kms-modal__scroll-top"
            type="button"
            onClick={() => {
              if (bodyRef.current) {
                bodyRef.current.scrollTo({ top: 0, behavior: "smooth" });
              }
            }}
            aria-label={t("Scroll to top")}
          >
            ↑
          </button>
        ) : null}
      </div>
    </div>
  );
}

function isImageDetail(detail: { type?: string }): detail is Extract<GmsDetail, { type: "image" }> {
  return detail.type === "image";
}

function isListDetail(detail: { type?: string }): detail is Extract<GmsDetail, { type: "list" }> {
  return detail.type === "list";
}

function isSubheadingDetail(detail: { type?: string }): detail is Extract<GmsDetail, { type: "subheading" }> {
  return detail.type === "subheading";
}
