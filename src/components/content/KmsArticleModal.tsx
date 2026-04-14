import { useEffect, useMemo, useRef, useState } from "react";
import type { NewsItem } from "../../data/newsHub";
import { formatNewsMetaDate } from "../../lib/newsHub";
import { Button } from "../ui/Button";
import { useI18n } from "../../i18n/I18nProvider";
import { translateArticleData } from "../../i18n/dynamicTranslate";

type KmsSection = {
  title: string;
  summary: string;
  details: KmsDetail[];
  impact: string;
  topic: {
    key: string;
    label: string;
  };
};

type KmsDetail =
  | { type: "text"; value: string }
  | { type: "image"; src: string; alt?: string }
  | { type: "list"; items: string[] }
  | { type: "subheading"; value: string }
  | { type: string; value: string };

type KmsPayload = {
  title?: string;
  sourceName: string;
  sourceUrl: string;
  date: string;
  summary: string;
  tags: string[];
  highlights: string[];
  keyChanges: string[];
  audience: string;
  sections: KmsSection[];
  categories?: Array<{ key: string; label: string; sections: KmsSection[] }>;
  heroImage?: string;
  fullText?: string;
  debug?: unknown;
};

type KmsArticleModalProps = {
  item: NewsItem | null;
  onClose: () => void;
};

export function KmsArticleModal({ item, onClose }: KmsArticleModalProps) {
  const { t, td, language } = useI18n();
  const [data, setData] = useState<KmsPayload | null>(null);
  const [translatedData, setTranslatedData] = useState<KmsPayload | null>(null);
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

      if (import.meta.env.DEV) {
        console.log("[KMS Modal] open", {
          url: item.sourceUrl,
          hasBreakdown: Boolean(item.kmsBreakdown)
        });
      }

      setLoading(true);
      try {
        const cacheBust = `${Date.now()}`;
        const response = await fetch(
          `/api/kms?url=${encodeURIComponent(item.sourceUrl)}&force=1&ts=${cacheBust}`,
          { cache: "no-store" }
        );
        if (!response.ok) {
          throw new Error("Failed to load KMS article.");
        }
        const payload = (await response.json()) as KmsPayload;
        if (import.meta.env.DEV) {
          const payloadDetails =
            payload?.sections?.reduce((sum, section) => sum + (section.details?.length || 0), 0) ?? 0;
          console.log("[KMS Modal] fetched payload", {
            url: item.sourceUrl,
            sectionCount: payload?.sections?.length || 0,
            detailCount: payloadDetails,
            fullTextLength: payload?.fullText?.length || 0,
            summaryLength: payload?.summary?.length || 0,
            debug: payload?.debug
          });
        }
        if (active) {
          setData(payload);
          setOpenTopics([]);
        }
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error("[KMS Modal] fallback to summary", { url: item.sourceUrl, error });
        }
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

  const published = useMemo(() => formatNewsMetaDate(item?.publishedAt ?? ""), [item]);
  const renderData = translatedData ?? data;
  const sectionList = useMemo(() => renderData?.sections ?? [], [renderData]);
  const categories = useMemo(() => renderData?.categories ?? [], [renderData]);
  const [activeCategory, setActiveCategory] = useState<string>("all");

  useEffect(() => {
    setActiveCategory("all");
  }, [item?.id]);

  useEffect(() => {
    setShowScrollTop(false);
    if (bodyRef.current) {
      bodyRef.current.scrollTop = 0;
    }
  }, [item?.id]);

  const fallbackSections = useMemo(() => {
    if (!item) return [];
    return [
      {
        title: t("Overview"),
        summary: td(item.summary || ""),
        details: item.summary ? [{ type: "text", value: item.summary }] : [],
        impact: t("Full update details preserved."),
        topic: { key: "overview", label: t("Overview") }
      }
    ];
  }, [item, t, td]);

  const visibleSections = useMemo(() => {
    if (activeCategory === "all" || !categories.length) return sectionList.length ? sectionList : fallbackSections;
    const match = categories.find((category) => category.key === activeCategory);
    return match?.sections ?? (sectionList.length ? sectionList : fallbackSections);
  }, [activeCategory, categories, sectionList, fallbackSections]);
  const normalizedSummary = useMemo(() => {
    const summary = (renderData?.summary || item?.summary || "").trim();
    return summary.replace(/\s+/g, " ").slice(0, 240);
  }, [renderData?.summary, item?.summary]);
  useEffect(() => {
    let active = true;
    if (!data) {
      setTranslatedData(null);
      return;
    }
    translateArticleData(data, language, { scope: "summary+titles" }).then((next) => {
      if (active) {
        setTranslatedData(next);
      }
    });
    return () => {
      active = false;
    };
  }, [data, language]);

  if (!item) return null;

  return (
    <div className="kms-modal" role="dialog" aria-modal="true" aria-labelledby="kms-modal-title">
      <button className="kms-modal__backdrop" type="button" aria-label={t("Close")} onClick={onClose} />
      <div className="kms-modal__panel">
        <div className="kms-modal__header">
          <div>
            <span className="kms-modal__eyebrow">{t("KMS Update")}</span>
            <h2 id="kms-modal-title">{td(renderData?.title || item.title)}</h2>
            <p className="kms-modal__meta">
              <span>{renderData?.date || published}</span>
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
            <div className={`kms-modal__summary card ${loading ? "is-loading" : ""}`}>
              {(renderData?.heroImage || item.image) && (
                <div className="kms-modal__hero">
                  <img src={renderData?.heroImage || item.image} alt={td(item.title)} loading="lazy" />
                </div>
              )}
              <h4>{t("Big picture")}</h4>
              <p>{td(renderData?.summary || item.summary)}</p>
              <p className="kms-modal__audience">{td(renderData?.audience || t("Affects upcoming progression planning."))}</p>
              <div className="kms-modal__tags">
                {(renderData?.tags?.length ? renderData.tags : ["Patch", "Events", "Systems"]).map((tag) => (
                  <span key={tag}>{t(tag)}</span>
                ))}
              </div>
              {loading && (
                <div className="kms-loading">
                  <span className="kms-loading__dot" />
                  <span>{t("Loading article...")}</span>
                </div>
              )}
            </div>
          </div>

          {(renderData?.keyChanges?.length || renderData?.highlights?.length) && (
            <div className="kms-modal__block">
              <h3 className="kms-modal__section-title">{t("Key changes")}</h3>
              <div className="kms-modal__highlights">
                {(renderData?.keyChanges?.length ? renderData.keyChanges : renderData?.highlights ?? []).map((note, index) => (
                  <div className="kms-modal__highlight card" key={`${note}-${index}`}>
                    <strong>{t("Key change")}</strong>
                    <p>{td(note)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

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
                    {td(category.label)}
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
                  {td(section.title)}
                </button>
              ))}
            </div>
          </div>

          <div className="kms-modal__sections">
            <h3 className="kms-modal__section-title">{t("Full breakdown")}</h3>
            {loading ? (
              <div className="kms-skeleton">
                <div className="kms-skeleton__row" />
                <div className="kms-skeleton__row" />
                <div className="kms-skeleton__row is-short" />
                <div className="kms-skeleton__card" />
              </div>
            ) : null}
          {!loading && !visibleSections.length && (
            <div className="kms-section card">
              <h3>{t("Full Article")}</h3>
              <p>{td(renderData?.fullText || item.summary || t("Full article content could not be loaded yet."))}</p>
            </div>
          )}
            {!loading &&
              visibleSections.map((section, index) => {
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
                      <span>{td(section.title)}</span>
                      <small>
                        {section.details.length} {t("entries")}
                      </small>
                    </button>
                    <div className={`kms-topic-group__sections ${isOpen ? "is-open" : ""}`} aria-hidden={!isOpen}>
                      <article className="kms-section card">
                        <header>
                          <h3>{td(section.title)}</h3>
                          <p>{td(section.summary || t("Overview for this section."))}</p>
                        </header>
                        <div className="kms-section__details">
                          <div className="kms-section__content">
                            {section.details.map((detail, detailIndex) => {
                              if (isImageDetail(detail)) {
                                return (
                                  <div key={`${detail.src}-${detailIndex}`} className="kms-section__image">
                                    <img
                                      src={detail.src}
                                      alt={td(detail.alt || section.title)}
                                      loading="lazy"
                                      decoding="async"
                                    />
                                  </div>
                                );
                              }
                              if (isListDetail(detail)) {
                                return (
                                  <ul key={`${detail.items.join("-")}-${detailIndex}`} className="kms-section__list">
                                    {detail.items.map((item, itemIndex) => (
                                      <li key={`${item}-${itemIndex}`}>{td(item)}</li>
                                    ))}
                                  </ul>
                                );
                              }
                              if (isSubheadingDetail(detail)) {
                                return (
                                  <h4 key={`${detail.value}-${detailIndex}`} className="kms-section__subheading">
                                    {td(detail.value)}
                                  </h4>
                                );
                              }
                              const normalized = (detail.value || "").replace(/\s+/g, " ").slice(0, 240);
                              if (
                                detailIndex === 0 &&
                                section === visibleSections[0] &&
                                normalizedSummary &&
                                normalized === normalizedSummary
                              ) {
                                return null;
                              }
                              return (
                                <p key={`${detail.value}-${detailIndex}`} className="kms-section__text">
                                  {td(detail.value)}
                                </p>
                              );
                            })}
                          </div>
                          {section.impact ? <p className="kms-section__impact">{td(section.impact)}</p> : null}
                        </div>
                      </article>
                    </div>
                  </section>
                );
              })}
          </div>
        </div>

        <div className="kms-modal__footer">
          <Button href={item.sourceUrl} variant="secondary">
            {t("Read Original")}
          </Button>
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

function isImageDetail(detail: { type?: string }): detail is Extract<KmsDetail, { type: "image" }> {
  return detail.type === "image";
}

function isListDetail(detail: { type?: string }): detail is Extract<KmsDetail, { type: "list" }> {
  return detail.type === "list";
}

function isSubheadingDetail(detail: { type?: string }): detail is Extract<KmsDetail, { type: "subheading" }> {
  return detail.type === "subheading";
}
