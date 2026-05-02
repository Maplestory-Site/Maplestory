import { useMemo, useState } from "react";
import { usePageMeta } from "../app/usePageMeta";
import { NewsCard } from "../components/content/NewsCard";
import { SectionHeader } from "../components/ui/SectionHeader";
import { newsCategories, newsRegions, type NewsCategory, type NewsRegion } from "../data/newsHub";
import { useNewsFeed } from "../hooks/useNewsFeed";
import { formatNewsMetaDate } from "../lib/newsHub";
import { useI18n } from "../i18n/I18nProvider";

export function NewsPage() {
  const { t } = useI18n();
  usePageMeta(t("News"), t("Latest updates, patch notes, events, and official announcements."));
  const [activeCategory, setActiveCategory] = useState<NewsCategory>("all");
  const [query, setQuery] = useState("");
  const [activeRegion, setActiveRegion] = useState<NewsRegion>("gms");
  const {
    categoryCounts,
    error,
    featuredItem,
    filteredItems,
    gridItems,
    isLoading,
    isRefreshing,
    isStale,
    isUsingFallback,
    lastFetchedAt,
    meta,
    refresh
  } = useNewsFeed(activeCategory, query, activeRegion);
  const hasSearch = query.trim().length > 0;
  const showGroupedLanes = activeCategory === "all" && !hasSearch && !isLoading;
  const newsLanes = useMemo(() => {
    const lanes = [
      {
        description: t("Newest official updates."),
        items: gridItems.slice(0, 6),
        key: "latest",
        title: t("Latest News")
      },
      {
        description: t("Version changes and patch details."),
        items: gridItems.filter((item) => item.category === "patch-notes").slice(0, 6),
        key: "patch",
        title: t("Patch Notes")
      },
      {
        description: t("Time-limited activities and rewards."),
        items: gridItems.filter((item) => item.category === "events").slice(0, 6),
        key: "events",
        title: t("Events")
      },
      {
        description: t("Shop updates, sales, and bundles."),
        items: gridItems.filter((item) => item.category === "cash-shop").slice(0, 6),
        key: "cash",
        title: t("Cash Shop Updates")
      },
      {
        description: t("KMS previews and future-facing updates."),
        items: gridItems.filter((item) => item.region === "kms").slice(0, 6),
        key: "kms",
        title: t("KMS Preview")
      }
    ];
    return lanes.filter((lane) => lane.items.length > 0);
  }, [gridItems, t]);

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
            <span>{t("Last synced")} {formatNewsMetaDate(lastFetchedAt || meta.lastUpdated)}</span>
            <span>
              {isRefreshing
                ? t("Refreshing latest news")
                : meta.sourceStatus === "fresh"
                ? t("Fresh official sync")
                : meta.sourceStatus === "stale"
                  ? t("Showing last good cache")
                  : meta.sourceStatus === "error"
                    ? t("Sync issue, cache active")
                    : t("Auto-sync ready")}
            </span>
            {isStale || isUsingFallback ? <span>{t("Bundled fallback available")}</span> : null}
            <button className="news-meta-strip__refresh" disabled={isRefreshing} onClick={refresh} type="button">
              {isRefreshing ? t("Refreshing...") : t("Refresh")}
            </button>
          </div>

          {error ? (
            <div className="news-status news-status--error card" role="status">
              <strong>{t("Live news sync failed.")}</strong>
              <span>{t("Showing cached news so the page stays usable.")}</span>
              <button disabled={isRefreshing} onClick={refresh} type="button">
                {t("Retry")}
              </button>
            </div>
          ) : isStale || isUsingFallback ? (
            <div className="news-status card" role="status">
              <strong>{t("Cached news active.")}</strong>
              <span>{t("The site will refresh automatically when the API is available.")}</span>
            </div>
          ) : null}

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
              />
            </div>
          ) : null}

          {isLoading ? (
            <div className="news-skeleton-grid" aria-label={t("Loading news")}>
              {Array.from({ length: 6 }).map((_, index) => (
                <div className="news-skeleton-card card" key={index}>
                  <span />
                  <strong />
                  <p />
                  <p />
                </div>
              ))}
            </div>
          ) : showGroupedLanes && newsLanes.length ? (
            <div className="news-lanes">
              {newsLanes.map((lane) => (
                <section className="news-lane" key={lane.key}>
                  <div className="news-lane__header">
                    <div>
                      <span>{lane.description}</span>
                      <h3>{lane.title}</h3>
                    </div>
                    <small>{lane.items.length} {t("updates")}</small>
                  </div>
                  <div className="news-lane__grid">
                    {lane.items.map((item) => (
                      <NewsCard item={item} key={item.id} />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <div className="news-grid">
              {gridItems.map((item) => (
                <NewsCard item={item} key={item.id} />
              ))}
            </div>
          )}

          {!filteredItems.length ? (
            <div className="content-empty-state card">
              <strong>{t("No updates in this lane.")}</strong>
              <p>{t("Change filters or try another keyword.")}</p>
            </div>
          ) : null}
        </div>
      </section>
    </>
  );
}
