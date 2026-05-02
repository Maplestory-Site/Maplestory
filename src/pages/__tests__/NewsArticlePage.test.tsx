import { renderToString } from "react-dom/server";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { fallbackNewsFeed } from "../../data/newsHub";
import { ArticleSection, NewsArticlePage } from "../NewsArticlePage";

function renderNewsArticleRoute(path: string) {
  return renderToString(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/news/:newsId" element={<NewsArticlePage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe("NewsArticlePage", () => {
  it("renders a full article route with hero, TOC, and sections", () => {
    const item = fallbackNewsFeed.items.find((entry) => entry.kmsBreakdown?.sections?.length);
    expect(item).toBeTruthy();

    const html = renderNewsArticleRoute(`/news/${item?.id}`);

    expect(html).toContain("Back to News");
    expect(html).toContain("Contents");
    expect(html).toContain("Overview");
    expect(html).toContain("Official Source");
    expect(html).toContain("news-section-block");
  });

  it("renders patch-note styling for patch-note articles", () => {
    const item = fallbackNewsFeed.items.find((entry) => entry.category === "patch-notes");
    expect(item).toBeTruthy();

    const html = renderNewsArticleRoute(`/news/${item?.id}`);

    expect(html).toContain("news-article-page--patch");
    expect(html).toContain("Patch Notes");
  });

  it("renders reward sections as a reward grid", () => {
    const html = renderToString(
      <ArticleSection
        isPatchNotes
        section={{
          id: "rewards",
          title: "Rewards",
          content: "Claim these rewards during the event.",
          type: "reward",
          items: ["Growth Potion", "Event Ring Coupon"]
        }}
      />
    );

    expect(html).toContain("patch-reward-grid");
    expect(html).toContain("Growth Potion");
    expect(html).toContain("Event Ring Coupon");
  });

  it("renders the missing article empty state", () => {
    const html = renderNewsArticleRoute("/news/not-real");

    expect(html).toContain("Article not found.");
    expect(html).toContain("Back to News");
  });
});
