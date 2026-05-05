import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { usePageMeta } from "../app/usePageMeta";
import { Button } from "../components/ui/Button";
import { getAdjacentNewsArticles, getNewsArticleById, getNewsItemById, buildNewsArticleFromPayload, type NewsArticle, type NewsArticleDetail, type NewsArticlePayload, type NewsSection } from "../lib/newsArticle";
import type { NewsItem, NewsFeed } from "../data/newsHub";
import { loadNewsFeed } from "../lib/newsFeedClient";
import { formatNewsMetaDate } from "../lib/newsHub";
import { safeFetchJson } from "../lib/safeJsonFetch";

const sectionIcons: Record<NonNullable<NewsSection["type"]>, string> = {
  default: "-",
  event: "*",
  highlight: "+",
  reward: "$",
  warning: "!"
};

export function NewsArticlePage() {
  const { newsId = "" } = useParams();
  const bundledFeedItem = useMemo(() => getNewsItemById(newsId), [newsId]);
  const [liveFeedItem, setLiveFeedItem] = useState<NewsItem | null>(null);
  const [liveFeedItems, setLiveFeedItems] = useState<NewsItem[] | null>(null);
  const [isResolvingItem, setIsResolvingItem] = useState(!bundledFeedItem);
  const feedItem = bundledFeedItem ?? liveFeedItem;
  const fallbackArticle = useMemo(() => getNewsArticleById(newsId), [newsId]);
  const [liveArticle, setLiveArticle] = useState<NewsArticle | null>(null);
  const [articleError, setArticleError] = useState<string | null>(null);
  const hasBundledFullArticle = Boolean(feedItem?.gmsBreakdown?.sections?.length || feedItem?.kmsBreakdown?.sections?.length);
  const article = liveArticle ?? fallbackArticle;
  const adjacent = useMemo(() => getAdjacentNewsArticles(newsId, liveFeedItems ?? undefined), [liveFeedItems, newsId]);
  const [activeSection, setActiveSection] = useState(article?.sections[0]?.id ?? "");
  const [copied, setCopied] = useState(false);

  usePageMeta(article?.title ?? "News Article", article?.summary ?? "Full MapleStory article.");

  useEffect(() => {
    setLiveArticle(null);
    setArticleError(null);

    if (!feedItem?.sourceUrl || hasBundledFullArticle) {
      setLiveArticle(null);
      setArticleError(null);
      return;
    }

    const controller = new AbortController();
    const item = feedItem;
    const endpoint = item.region === "kms" ? "/api/kms" : "/api/gms";

    async function loadFullArticle() {
      const fallbackPayload: NewsArticlePayload = {
        title: item.title,
        sourceName: item.sourceName,
        sourceUrl: item.sourceUrl,
        summary: item.summary,
        heroImage: item.image,
        date: item.publishedAt,
        sections: []
      };

      const result = await safeFetchJson<NewsArticlePayload>(
        `${endpoint}?url=${encodeURIComponent(item.sourceUrl)}&force=1`,
        {
          cache: "no-store",
          fallback: fallbackPayload,
          signal: controller.signal,
          timeoutMs: 15000
        }
      );

      if (controller.signal.aborted) return;
      setLiveArticle(buildNewsArticleFromPayload(item, result.data));
      setArticleError(result.ok ? null : result.error);
    }

    void loadFullArticle();

    return () => controller.abort();
  }, [feedItem, hasBundledFullArticle]);
  // When the bundled feed has no record for this id, fetch the live /api/news
  // feed and look up by id. Avoids the 'Article not found' state for items
  // sourced from a remote sync that isn't in src/data/newsFeed.json yet.
  useEffect(() => {
    setLiveFeedItem(null);
    setLiveFeedItems(null);
    setIsResolvingItem(!bundledFeedItem);
    if (bundledFeedItem || !newsId) return;
    const controller = new AbortController();
    let cancelled = false;
    void (async () => {
      try {
        const directResult = await safeFetchJson<NewsItem | { item?: NewsItem } | null>(`/api/news/${encodeURIComponent(newsId)}`, {
          cache: "no-store",
          fallback: null,
          signal: controller.signal,
          timeoutMs: 10000
        });
        if (cancelled || controller.signal.aborted) return;
        const directItem = extractNewsItemPayload(directResult.data);
        if (directResult.ok && directItem?.id) {
          setLiveFeedItem(directItem);
          setLiveFeedItems([directItem]);
          return;
        }

        const result = await loadNewsFeed({ signal: controller.signal });
        if (cancelled || controller.signal.aborted) return;
        const feed = result.feed as NewsFeed;
        const match = feed.items.find((item) => item.id === newsId) ?? null;
        setLiveFeedItem(match);
        setLiveFeedItems(feed.items);
      } catch {
        // Network failure already surfaces via loadNewsFeed's fallback path.
        if (!cancelled) setLiveFeedItem(null);
      } finally {
        if (!cancelled) setIsResolvingItem(false);
      }
    })();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [bundledFeedItem, newsId]);


  useEffect(() => {
    if (!article?.sections.length || typeof IntersectionObserver === "undefined") {
      setActiveSection(article?.sections[0]?.id ?? "");
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntry = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (visibleEntry?.target.id) {
          setActiveSection(visibleEntry.target.id);
        }
      },
      {
        rootMargin: "-18% 0px -64% 0px",
        threshold: [0.12, 0.25, 0.5, 0.75]
      }
    );

    article.sections.forEach((section) => {
      const element = document.getElementById(section.id);
      if (element) {
        observer.observe(element);
      }
    });

    return () => observer.disconnect();
  }, [article]);

  useEffect(() => {
    setActiveSection(article?.sections[0]?.id ?? "");
  }, [article?.id, article?.sections]);

  if (!article && isResolvingItem) {
    return (
      <section className="section section--page-start news-article-page">
        <div className="container">
          <div className="news-article-loading card">
            <span className="news-article-loading__pulse" />
            <strong>Loading full article...</strong>
            <p>Checking the live news feed for the latest article data.</p>
          </div>
        </div>
      </section>
    );
  }

  if (!article) {
    return (
      <section className="section section--page-start news-article-page">
        <div className="container">
          <div className="content-empty-state card">
            <strong>Article not found.</strong>
            <p>This news item is not available in the local or live feed yet.</p>
            <Button href="/news" variant="secondary">
              Back to News
            </Button>
          </div>
        </div>
      </section>
    );
  }

  function scrollToSection(sectionId: string) {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
    setActiveSection(sectionId);
  }

  async function copyCurrentLink() {
    try {
      await navigator.clipboard?.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section className={`section section--page-start news-article-page ${article.isPatchNotes ? "news-article-page--patch" : ""}`}>
      <div className="container">
        <div className="news-article-shell">
          <div className="news-article-topline">
            <Link className="news-article-back" to="/news">
              Back to News
            </Link>
            <div className="news-article-actions">
              <button className="news-article-action" onClick={copyCurrentLink} type="button">
                {copied ? "Copied" : "Copy Link"}
              </button>
              <a className="news-article-action" href={article.sourceUrl} rel="noreferrer" target="_blank">
                Official Source
              </a>
            </div>
          </div>

          <header className="news-article-hero card">
            {article.image ? (
              <img alt="" className="news-article-hero__image" decoding="async" loading="lazy" src={article.image} />
            ) : null}
            <div className="news-article-hero__overlay" />
            <div className="news-article-hero__content">
              <div className="news-article-badges">
                <span>{article.region.toUpperCase()}</span>
                <span>{article.category.replace("-", " ")}</span>
                {article.isPatchNotes ? <span className="news-article-badge--patch">Patch Notes</span> : null}
              </div>
              <p className="news-article-kicker">{formatNewsMetaDate(article.date)} · {article.sourceName}</p>
              <h1>{article.title}</h1>
              <p>{article.summary}</p>
              {articleError ? <small className="news-article-live-status">Live parser unavailable, showing cached article structure.</small> : null}
            </div>
          </header>

          <details className="news-article-mobile-toc card">
            <summary>Article Sections</summary>
            <ArticleToc activeSection={activeSection} onSelect={scrollToSection} sections={article.sections} />
          </details>

          <div className="news-article-layout">
            <aside className="news-article-toc card" aria-label="Article sections">
              <span className="news-article-toc__eyebrow">Contents</span>
              <ArticleToc activeSection={activeSection} onSelect={scrollToSection} sections={article.sections} />
            </aside>

            <article className="news-article-content">
              {article.sections.map((section) => (
                <ArticleSection isPatchNotes={Boolean(article.isPatchNotes)} key={section.id} section={section} />
              ))}

              <nav className="news-article-nextprev" aria-label="Article navigation">
                {adjacent.previous ? (
                  <Button href={`/news/${adjacent.previous.id}`} variant="ghost">
                    Previous: {adjacent.previous.title}
                  </Button>
                ) : <span />}
                {adjacent.next ? (
                  <Button href={`/news/${adjacent.next.id}`} variant="secondary">
                    Next: {adjacent.next.title}
                  </Button>
                ) : null}
              </nav>
            </article>
          </div>
        </div>
      </div>
    </section>
  );
}

function ArticleToc({
  activeSection,
  onSelect,
  sections
}: {
  activeSection: string;
  onSelect: (sectionId: string) => void;
  sections: NewsSection[];
}) {
  return (
    <ol className="news-article-toc__list">
      {sections.map((section) => (
        <li key={section.id}>
          <button
            className={activeSection === section.id ? "is-active" : ""}
            onClick={() => onSelect(section.id)}
            type="button"
          >
            <span>{sectionIcons[section.type ?? "default"]}</span>
            {section.title}
          </button>
        </li>
      ))}
    </ol>
  );
}

function extractNewsItemPayload(payload: NewsItem | { item?: NewsItem } | null): NewsItem | null {
  if (!payload) return null;
  if (isNewsItem(payload)) return payload;
  return payload.item ?? null;
}

function isNewsItem(payload: NewsItem | { item?: NewsItem }): payload is NewsItem {
  return "id" in payload && "title" in payload && "region" in payload;
}

export function ArticleSection({ isPatchNotes, section }: { isPatchNotes: boolean; section: NewsSection }) {
  const type = section.type ?? "default";
  const paragraphs = section.content.split(/\n{2,}/).map((paragraph) => paragraph.trim()).filter(Boolean);
  const isCommerceList = Boolean(section.items?.some(isCommerceLine));
  const shouldUseRewardGrid = type === "reward" && !isCommerceList && Number(section.items?.length ?? 0) <= 12;
  const hasStructuredDetails = Boolean(section.details?.length);

  return (
    <section className={`news-section-block news-section-block--${type} ${isPatchNotes ? "news-section-block--patch" : ""}`} id={section.id}>
      <div className="news-section-block__header">
        <span className="news-section-block__icon">{sectionIcons[type]}</span>
        <h2>{section.title}</h2>
      </div>

      {hasStructuredDetails ? (
        <ArticleDetails details={section.details ?? []} sectionId={section.id} />
      ) : (
        paragraphs.map((paragraph, index) => (
          <p key={`${section.id}-p-${index}`}>{paragraph}</p>
        ))
      )}

      {!hasStructuredDetails && section.items?.length ? (
        shouldUseRewardGrid ? (
          <div className="patch-reward-grid">
            {section.items.map((item, index) => (
              <div className="patch-reward-card" key={`${section.id}-reward-${index}`}>
                <span className="patch-reward-card__icon">$</span>
                <strong>{item}</strong>
                <small>Reward</small>
              </div>
            ))}
          </div>
        ) : isCommerceList ? (
          <div className="news-commerce-list">
            {section.items.map((item, index) => (
              <CommerceListItem item={item} key={`${section.id}-shop-${index}`} />
            ))}
          </div>
        ) : (
          <ul className={type === "warning" ? "patch-warning-list" : "news-section-list"}>
            {section.items.map((item, index) => (
              <li key={`${section.id}-item-${index}`}>{item}</li>
            ))}
          </ul>
        )
      ) : null}

      {!hasStructuredDetails && section.images?.length ? (
        <div className="news-section-images">
          {section.images.map((image) => (
            <img alt={image.alt} decoding="async" key={image.src} loading="lazy" src={image.src} />
          ))}
        </div>
      ) : null}
    </section>
  );
}

function ArticleDetails({ details, sectionId }: { details: NewsArticleDetail[]; sectionId: string }) {
  const renderableDetails = dedupeRenderableDetails(details);

  return (
    <div className="news-detail-flow">
      {renderableDetails.map((detail, index) => (
        <ArticleDetail detail={detail} key={`${sectionId}-detail-${index}`} />
      ))}
    </div>
  );
}

function ArticleDetail({ detail }: { detail: NewsArticleDetail }) {
  if (detail.type === "text") {
    return <p>{detail.value}</p>;
  }

  if (detail.type === "subheading") {
    return <h3 className="news-detail-subheading">{detail.value}</h3>;
  }

  if (detail.type === "image") {
    return (
      <figure className="news-detail-figure">
        <img alt={detail.alt} decoding="async" loading="lazy" src={detail.src} />
        {detail.caption ? <figcaption>{detail.caption}</figcaption> : null}
      </figure>
    );
  }

  if (detail.type === "link") {
    return (
      <a className="news-detail-link" href={detail.href} rel="noreferrer" target="_blank">
        <span>Official link</span>
        <strong>{detail.label}</strong>
      </a>
    );
  }

  if (detail.type === "table") {
    return (
      <div className="news-detail-table-wrap">
        {detail.caption ? <strong className="news-detail-table-caption">{detail.caption}</strong> : null}
        <table className="news-detail-table">
          {detail.headers.length ? (
            <thead>
              <tr>
                {detail.headers.map((header, index) => (
                  <th key={`${header}-${index}`}>{header}</th>
                ))}
              </tr>
            </thead>
          ) : null}
          <tbody>
            {detail.rows.map((row, rowIndex) => (
              <tr key={`row-${rowIndex}`}>
                {row.map((cell, cellIndex) => (
                  <td key={`${rowIndex}-${cellIndex}`}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <ul className="news-detail-list">
      {detail.items.map((item, index) => (
        <li key={`${item.text}-${index}`}>
          <span>{item.text}</span>
          {item.children.length ? (
            <ul>
              {item.children.map((child) => (
                <li key={child}>{child}</li>
              ))}
            </ul>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function CommerceListItem({ item }: { item: string }) {
  const parsed = parseCommerceLine(item);

  return (
    <div className="news-commerce-list__item">
      <span className="news-commerce-list__icon">$</span>
      <div>
        <strong>{parsed.title}</strong>
        {parsed.details.length ? (
          <div className="news-commerce-list__details">
            {parsed.details.map((detail) => (
              <span key={detail}>{detail}</span>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function parseCommerceLine(value: string) {
  const text = value.replace(/\s+/g, " ").trim();
  const markerMatch = /\b(?:Price|Duration|Sale Duration|Water Balloon Price|Paper Plane Price|Energy Ball Price|Super Star Price|Football Price):/i.exec(text);
  const title = markerMatch && markerMatch.index > 0 ? text.slice(0, markerMatch.index).trim() : text;
  const detailSource = markerMatch && markerMatch.index > 0 ? text.slice(markerMatch.index).trim() : "";
  const details = detailSource
    ? detailSource
        .split(/(?=\b(?:Price|Duration|Sale Duration|Water Balloon Price|Paper Plane Price|Energy Ball Price|Super Star Price|Football Price):)/i)
        .map((detail) => detail.trim())
        .filter(Boolean)
    : [];

  return {
    title: title || "Cash Shop Item",
    details
  };
}

function isCommerceLine(value: string) {
  return /\b(?:price|duration|nx|available in all worlds|sale duration):/i.test(value);
}

function dedupeRenderableDetails(details: NewsArticleDetail[]) {
  const seen = new Set<string>();
  return details.filter((detail) => {
    const key = getRenderableDetailKey(detail);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function getRenderableDetailKey(detail: NewsArticleDetail) {
  if (detail.type === "text" || detail.type === "subheading") {
    return normalizeRenderedText(detail.value);
  }

  if (detail.type === "list") {
    return detail.items
      .map((item) => normalizeRenderedText(`${item.text} ${item.children.join(" ")}`))
      .filter(Boolean)
      .join("|");
  }

  if (detail.type === "table") {
    return [...detail.headers, ...detail.rows.flat()].map(normalizeRenderedText).filter(Boolean).join("|");
  }

  if (detail.type === "image") {
    return `image:${detail.src}`;
  }

  return `link:${detail.href}:${normalizeRenderedText(detail.label)}`;
}

function normalizeRenderedText(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}
