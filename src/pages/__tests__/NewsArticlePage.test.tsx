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

  it("renders cash shop price lists as compact commerce rows", () => {
    const html = renderToString(
      <ArticleSection
        isPatchNotes
        section={{
          id: "cash-shop",
          title: "New Damage Skin",
          content: "Attack your enemies in style.",
          type: "highlight",
          items: ["Water Balloon Price: 5,000 NX 2,500 NX Duration: Permanent"]
        }}
      />
    );

    expect(html).toContain("news-commerce-list");
    expect(html).not.toContain("patch-reward-grid");
    expect(html).toContain("Water Balloon");
  });

  it("renders structured article details including tables and links", () => {
    const html = renderToString(
      <ArticleSection
        isPatchNotes
        section={{
          id: "structured",
          title: "Structured Details",
          content: "",
          type: "highlight",
          details: [
            { type: "table", headers: ["Item", "Cost"], rows: [["Coupon", "100 coins"]] },
            { type: "link", href: "https://example.com/source", label: "Official source" }
          ]
        }}
      />
    );

    expect(html).toContain("news-detail-table");
    expect(html).toContain("Coupon");
    expect(html).toContain("news-detail-link");
    expect(html).toContain("Official source");
  });

  it("does not render duplicate structured text details", () => {
    const repeated = "Take a load off with these new chairs!";
    const html = renderToString(
      <ArticleSection
        isPatchNotes
        section={{
          id: "new-chairs",
          title: "New Chairs",
          content: "",
          type: "highlight",
          details: [
            { type: "text", value: repeated },
            { type: "text", value: repeated },
            { type: "text", value: "My Secret Sanctuary" }
          ]
        }}
      />
    );

    expect(html.match(/Take a load off with these new chairs!/g)).toHaveLength(1);
    expect(html).toContain("My Secret Sanctuary");
  });

  it("renders a live-feed loading state for ids missing from the bundled feed", () => {
    const html = renderNewsArticleRoute("/news/not-real");

    expect(html).toContain("Loading full article...");
    expect(html).toContain("Checking the live news feed");
  });
});
