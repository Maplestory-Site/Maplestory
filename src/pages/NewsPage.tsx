import { useState } from "react";
import { usePageMeta } from "../app/usePageMeta";
import { NewsCard } from "../components/content/NewsCard";
import { SectionHeader } from "../components/ui/SectionHeader";
import { newsCategories, type NewsCategory } from "../data/newsHub";
import { useNewsFeed } from "../hooks/useNewsFeed";
import { formatNewsMetaDate } from "../lib/newsHub";

export function NewsPage() {
  usePageMeta("News", "Latest MapleStory updates, patch notes, events, and official announcements with clear source credit.");
  const [activeCategory, setActiveCategory] = useState<NewsCategory>("all");
  const [query, setQuery] = useState("");
  const { categoryCounts, featuredItem, filteredItems, gridItems, meta } = useNewsFeed(activeCategory, query);

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
            <span>Last synced {formatNewsMetaDate(meta.lastUpdated)}</span>
            <span>
              {meta.sourceStatus === "fresh"
                ? "Fresh official sync"
                : meta.sourceStatus === "stale"
                  ? "Showing last good cache"
                  : meta.sourceStatus === "error"
                    ? "Sync issue, cache active"
                    : "Auto-sync ready"}
            </span>
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
                  <span>{category.label}</span>
                  <small>{categoryCounts[category.key] ?? 0}</small>
                </button>
              ))}
            </div>

            <label className="news-toolbar__search">
              <span>Search</span>
              <input
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by title"
                type="search"
                value={query}
              />
            </label>
          </div>

          {featuredItem ? (
            <div className="news-featured">
              <SectionHeader
                description="Top update right now."
                eyebrow="Featured News"
                title="Start here"
              />
              <NewsCard featured item={featuredItem} />
            </div>
          ) : null}

          <div className="news-grid">
            {gridItems.map((item) => (
              <NewsCard item={item} key={item.id} />
            ))}
          </div>

          {!filteredItems.length ? (
            <div className="content-empty-state card">
              <strong>No updates in this lane.</strong>
              <p>Change filters or try another keyword.</p>
            </div>
          ) : null}
        </div>
      </section>
    </>
  );
}
