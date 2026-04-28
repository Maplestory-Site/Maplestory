import { describe, expect, it } from "vitest";
import { parseArticleHtml } from "../articleParser.mjs";

describe("articleParser", () => {
  it("extracts sections and images from a valid article", () => {
    const parsed = parseArticleHtml(
      `
        <article class="entry-content">
          <h2>Patch Notes</h2>
          <p>New class balance changes arrive this week.</p>
          <img src="/hero.png" alt="Hero" />
          <h2>Rewards</h2>
          <ul><li>Event coins</li><li>Growth potion</li></ul>
        </article>
      `,
      "https://example.com/posts/update"
    );

    expect(parsed.sections.length).toBeGreaterThanOrEqual(2);
    expect(parsed.heroImage).toBe("https://example.com/hero.png");
    expect(parsed.categories.length).toBeGreaterThan(0);
  });

  it("does not throw on malformed article HTML", () => {
    const parsed = parseArticleHtml("<article><h2>Broken<p>Still readable<ul><li>Reward", "https://example.com/");

    expect(parsed.sections.length).toBeGreaterThan(0);
    expect(parsed.fullText).toContain("Still readable");
  });

  it("returns a safe fallback for missing content", () => {
    const parsed = parseArticleHtml("", "https://example.com/");

    expect(parsed.sections[0]?.title).toBe("Full Article");
    expect(parsed.stats.tokenCount).toBe(0);
  });

  it("preserves image-only articles", () => {
    const parsed = parseArticleHtml('<main><img src="/notice.jpg" alt="Notice image"></main>', "https://example.com/news/");

    expect(parsed.heroImage).toBe("https://example.com/notice.jpg");
    expect(parsed.sections[0]?.details[0]).toMatchObject({ type: "image", src: "https://example.com/notice.jpg" });
  });

  it("converts tables into readable list details", () => {
    const parsed = parseArticleHtml(
      `
        <main>
          <h2>Event Shop</h2>
          <table>
            <tr><th>Item</th><th>Cost</th></tr>
            <tr><td>Coupon</td><td>100 coins</td></tr>
          </table>
        </main>
      `,
      "https://example.com/"
    );

    const list = parsed.sections[0]?.details.find((detail) => detail.type === "list");
    expect(list?.items).toContain("Item | Cost");
    expect(list?.items).toContain("Coupon | 100 coins");
  });

  it("categorizes patch-note style content without crashing", () => {
    const parsed = parseArticleHtml(
      `
        <main>
          <h2>Bug Fixes</h2>
          <p>Fixed an issue where rewards were not shown.</p>
          <h2>UI / QoL</h2>
          <p>Improved menu clarity.</p>
        </main>
      `,
      "https://example.com/"
    );

    expect(parsed.categories.map((category) => category.key)).toEqual(expect.arrayContaining(["fixes", "ui-qol"]));
  });
});
