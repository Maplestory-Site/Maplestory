import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { usePageMeta } from "../app/usePageMeta";
import { Button } from "../components/ui/Button";
import { getAdjacentNewsArticles, getNewsArticleById, getNewsItemById, buildNewsArticleFromPayload, type NewsArticle, type NewsArticlePayload, type NewsSection } from "../lib/newsArticle";
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
  const feedItem = useMemo(() => getNewsItemById(newsId), [newsId]);
  const fallbackArticle = useMemo(() => getNewsArticleById(newsId), [newsId]);
  const [liveArticle, setLiveArticle] = useState<NewsArticle | null>(null);
  const [articleError, setArticleError] = useState<string | null>(null);
  const hasBundledFullArticle = Boolean(feedItem?.gmsBreakdown?.sections?.length || feedItem?.kmsBreakdown?.sections?.length);
  const article = liveArticle ?? fallbackArticle;
  const adjacent = useMemo(() => getAdjacentNewsArticles(newsId), [newsId]);
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

  if (!article) {
    return (
      <section className="section section--page-start news-article-page">
        <div className="container">
          <div className="content-empty-state card">
            <strong>Article not found.</strong>
            <p>This news item is not available in the local feed yet.</p>
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

export function ArticleSection({ isPatchNotes, section }: { isPatchNotes: boolean; section: NewsSection }) {
  const type = section.type ?? "default";
  const paragraphs = section.content.split(/\n{2,}/).map((paragraph) => paragraph.trim()).filter(Boolean);

  return (
    <section className={`news-section-block news-section-block--${type} ${isPatchNotes ? "news-section-block--patch" : ""}`} id={section.id}>
      <div className="news-section-block__header">
        <span className="news-section-block__icon">{sectionIcons[type]}</span>
        <h2>{section.title}</h2>
      </div>

      {paragraphs.map((paragraph, index) => (
        <p key={`${section.id}-p-${index}`}>{paragraph}</p>
      ))}

      {section.items?.length ? (
        type === "reward" ? (
          <div className="patch-reward-grid">
            {section.items.map((item, index) => (
              <div className="patch-reward-card" key={`${section.id}-reward-${index}`}>
                <span className="patch-reward-card__icon">$</span>
                <strong>{item}</strong>
                <small>Reward detail</small>
              </div>
            ))}
          </div>
        ) : (
          <ul className={type === "warning" ? "patch-warning-list" : "patch-change-list"}>
            {section.items.map((item, index) => (
              <li key={`${section.id}-item-${index}`}>{item}</li>
            ))}
          </ul>
        )
      ) : null}

      {section.images?.length ? (
        <div className="news-section-images">
          {section.images.map((image) => (
            <img alt={image.alt} decoding="async" key={image.src} loading="lazy" src={image.src} />
          ))}
        </div>
      ) : null}
    </section>
  );
}
