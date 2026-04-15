import { useEffect, useMemo, useRef, useState } from "react";
import type { NewsItem } from "../../data/newsHub";
import { formatNewsMetaDate } from "../../lib/newsHub";
import { Button } from "../ui/Button";
import { useI18n } from "../../i18n/I18nProvider";
import { translateArticleData } from "../../i18n/dynamicTranslate";

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
  sourceName: string;
  sourceUrl: string;
  summary: string;
  keyPoints: string[];
  sections: GmsSection[];
  categories?: Array<{ key: string; label: string; sections: GmsSection[] }>;
  heroImage?: string;
  date?: string;
};

type GmsArticleModalProps = {
  item: NewsItem | null;
  onClose: () => void;
};

export function GmsArticleModal({ item, onClose }: GmsArticleModalProps) {
  const { t, td, language } = useI18n();
  const [data, setData] = useState<GmsPayload | null>(null);
  const [translatedData, setTranslatedData] = useState<GmsPayload | null>(null);
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
        const response = await fetch(`/api/gms?url=${encodeURIComponent(item.sourceUrl)}`);
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

  const published = useMemo(() => formatNewsMetaDate(item?.publishedAt ?? ""), [item]);
  const renderData = translatedData ?? data;
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

  useEffect(() => {
    setActiveCategory("all");
  }, [item?.id]);

  useEffect(() => {
    setShowScrollTop(false);
    if (bodyRef.current) {
      bodyRef.current.scrollTop = 0;
    }
  }, [item?.id]);

  useEffect(() => {
    let active = true;
    if (!data) {
      setTranslatedData(null);
      return;
    }
    translateArticleData(data, language, { scope: "full" }).then((next) => {
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
    <div className="kms-modal" role="dialog" aria-modal="true" aria-labelledby="gms-modal-title">
      <button className="kms-modal__backdrop" type="button" aria-label={t("Close")} onClick={onClose} />
      <div className="kms-modal__panel">
        <div className="kms-modal__header">
          <div>
            <span className="kms-modal__eyebrow">{t("GMS Update")}</span>
            <h2 id="gms-modal-title">{td(item.title)}</h2>
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
            <div className="kms-modal__summary card">
              {(renderData?.heroImage || item.image) && (
                <div className="kms-modal__hero">
                  <img src={renderData?.heroImage || item.image} alt={td(item.title)} loading="lazy" />
                </div>
              )}
              <h4>{t("Official summary")}</h4>
              <p>{td(renderData?.summary || item.summary)}</p>
            </div>
          </div>

          {renderData?.keyPoints?.length ? (
            <div className="kms-modal__block">
              <h3 className="kms-modal__section-title">{t("Key points")}</h3>
              <div className="kms-modal__highlights">
                {renderData.keyPoints.map((note, index) => (
                  <div className="kms-modal__highlight card" key={`${note}-${index}`}>
                    <strong>{t("Key point")}</strong>
                    <p>{td(note)}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

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
            {loading ? <p>{t("Loading GMS breakdown...")}</p> : null}
            {!loading && !visibleSections.length && <p>{t("No sections available yet. Try again in a moment.")}</p>}
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
                      <small>{section.details.length} {t("entries")}</small>
                    </button>
                    <div
                      className={`kms-topic-group__sections ${isOpen ? "is-open" : ""}`}
                      aria-hidden={!isOpen}
                    >
                      <article className="kms-section card">
                        <header>
                          <h3>{td(section.title)}</h3>
                          <p>{td(section.summary || t("Official update details."))}</p>
                        </header>
                        <div className="kms-section__details">
                          <div className="kms-section__content">
                            {section.details.map((detail, detailIndex) => {
                              if (isImageDetail(detail)) {
                                return (
                                  <div key={`${detail.src}-${detailIndex}`} className="kms-section__image">
                                    <img src={detail.src} alt={td(detail.alt || section.title)} loading="lazy" />
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
                              return (
                                <p key={`${detail.value}-${detailIndex}`} className="kms-section__text">
                                  {td(detail.value)}
                                </p>
                              );
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

function isImageDetail(detail: { type?: string }): detail is Extract<GmsDetail, { type: "image" }> {
  return detail.type === "image";
}

function isListDetail(detail: { type?: string }): detail is Extract<GmsDetail, { type: "list" }> {
  return detail.type === "list";
}

function isSubheadingDetail(detail: { type?: string }): detail is Extract<GmsDetail, { type: "subheading" }> {
  return detail.type === "subheading";
}
