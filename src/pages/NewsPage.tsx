import { useState } from "react";
import { usePageMeta } from "../app/usePageMeta";
import { GmsArticleModal } from "../components/content/GmsArticleModal";
import { KmsArticleModal } from "../components/content/KmsArticleModal";
import { NewsCard } from "../components/content/NewsCard";
import { SectionHeader } from "../components/ui/SectionHeader";
import { newsCategories, newsRegions, type NewsCategory, type NewsRegion } from "../data/newsHub";
import type { NewsItem } from "../data/newsHub";
import { useNewsFeed } from "../hooks/useNewsFeed";
import { formatNewsMetaDate } from "../lib/newsHub";
import { useI18n } from "../i18n/I18nProvider";

export function NewsPage() {
  const { t } = useI18n();
  usePageMeta(t("News"), t("Latest updates, patch notes, events, and official announcements."));
  const [activeCategory, setActiveCategory] = useState<NewsCategory>("all");
  const [query, setQuery] = useState("");
  const [activeRegion, setActiveRegion] = useState<NewsRegion>("gms");
  const [kmsArticle, setKmsArticle] = useState<NewsItem | null>(null);
  const [gmsArticle, setGmsArticle] = useState<NewsItem | null>(null);
  const { categoryCounts, featuredItem, filteredItems, gridItems, meta } = useNewsFeed(activeCategory, query, activeRegion);

  return (
    <>
      <section className="section section--page-start" data-reveal>
        <div className="container">
          <SectionHeader
            description="Latest updates, patch notes, events, and official announcements."
            eyebrow="News"
            title="MapleStory News"
          />

          <div className="news-meta-strip card">
            <span>{t("Last synced")} {formatNewsMetaDate(meta.lastUpdated)}</span>
            <span>
              {meta.sourceStatus === "fresh"
                ? t("Fresh official sync")
                : meta.sourceStatus === "stale"
                  ? t("Showing last good cache")
                  : meta.sourceStatus === "error"
                    ? t("Sync issue, cache active")
                    : t("Auto-sync ready")}
            </span>
          </div>

          <div className="news-region-tabs">
            {newsRegions.map((region) => (
              <button
                aria-pressed={activeRegion === region.key}
                className={`news-region-tabs__button ${activeRegion === region.key ? "is-active" : ""}`}
                key={region.key}
                onClick={() => setActiveRegion(region.key)}
                type="button"
              >
                {t(region.label)}
              </button>
            ))}
          </div>

          <div className="news-toolbar card">
            <div className="news-toolbar__filters" aria-label="News categories">
              {newsCategories.map((category) => (
                <button
                  aria-pressed={activeCategory === category.key}
                  className={`news-toolbar__filter ${activeCategory === category.key ? "is-active" : ""}`}
                  key={category.key}
                  onClick={() => setActiveCategory(category.key)}
                  type="button"
                >
                  <span>{t(category.label)}</span>
                  <small>{categoryCounts[category.key] ?? 0}</small>
                </button>
              ))}
            </div>

            <label className="news-toolbar__search">
              <span>{t("Search")}</span>
              <input
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t("Search by title")}
                type="search"
                value={query}
              />
            </label>
          </div>

          {featuredItem ? (
            <div className="news-featured">
              <SectionHeader
                description={t("Top update right now.")}
                eyebrow={t("Featured News")}
                title={t("Start here")}
              />
              <NewsCard
                featured
                item={featuredItem}
                onSelect={activeRegion === "kms" ? setKmsArticle : setGmsArticle}
              />
            </div>
          ) : null}

          <div className="news-grid">
            {gridItems.map((item) => (
              <NewsCard
                item={item}
                key={item.id}
                onSelect={activeRegion === "kms" ? setKmsArticle : setGmsArticle}
              />
            ))}
          </div>

          {!filteredItems.length ? (
            <div className="content-empty-state card">
              <strong>{t("No updates in this lane.")}</strong>
              <p>{t("Change filters or try another keyword.")}</p>
            </div>
          ) : null}
        </div>
      </section>
      <KmsArticleModal item={kmsArticle} onClose={() => setKmsArticle(null)} />
      <GmsArticleModal item={gmsArticle} onClose={() => setGmsArticle(null)} />
    </>
  );
}
