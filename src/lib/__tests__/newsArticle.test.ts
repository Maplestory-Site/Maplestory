import { describe, expect, it } from "vitest";
import { fallbackNewsFeed, type NewsItem } from "../../data/newsHub";
import { buildNewsArticle, buildNewsArticleFromPayload, getAdjacentNewsArticles, getNewsArticleById } from "../newsArticle";

describe("newsArticle", () => {
  it("builds full article sections from bundled structured breakdowns", () => {
    const item = fallbackNewsFeed.items.find((entry) => entry.kmsBreakdown?.sections?.length);
    expect(item).toBeTruthy();

    const article = buildNewsArticle(item as NewsItem);

    expect(article.sections.length).toBeGreaterThan(5);
    expect(article.sections[0].title).toBe("Overview");
    expect(article.sections.every((section) => section.id && section.title)).toBe(true);
  });

  it("marks patch-note category articles as patch notes", () => {
    const item = fallbackNewsFeed.items.find((entry) => entry.category === "patch-notes");
    expect(item).toBeTruthy();

    const article = buildNewsArticle(item as NewsItem);

    expect(article.isPatchNotes).toBe(true);
    expect(article.sections.length).toBeGreaterThanOrEqual(2);
  });

  it("builds reward and event sections from live parser payloads", () => {
    const baseItem = fallbackNewsFeed.items[0] as NewsItem;
    const article = buildNewsArticleFromPayload(baseItem, {
      title: "Sample Event Rewards",
      sourceName: baseItem.sourceName,
      sourceUrl: baseItem.sourceUrl,
      summary: "Event reward summary.",
      sections: [
        {
          title: "Rewards",
          summary: "Claim prizes during the event.",
          details: [{ type: "list", items: ["Growth Potion", "Event Ring Coupon", "Symbol Selector"] }],
          topic: { key: "rewards", label: "Rewards" }
        },
        {
          title: "Event Schedule",
          summary: "Complete missions before the event ends.",
          details: [{ type: "text", value: "Daily missions reset at server reset." }],
          topic: { key: "events", label: "Events" }
        }
      ]
    });

    expect(article.sections.some((section) => section.type === "reward" && section.items?.length === 3)).toBe(true);
    expect(article.sections.some((section) => section.type === "event")).toBe(true);
  });

  it("builds full maintenance text from live GMS parser payloads", () => {
    const baseItem = fallbackNewsFeed.items.find((entry) => entry.id === "40437") as NewsItem;
    expect(baseItem).toBeTruthy();

    const article = buildNewsArticleFromPayload(baseItem, {
      title: baseItem.title,
      sourceName: baseItem.sourceName,
      sourceUrl: baseItem.sourceUrl,
      summary: baseItem.summary,
      sections: [
        {
          title: "Changes and Updates",
          summary: "MapleStory will be updated to v.268.3.0.",
          details: [
            {
              type: "list",
              items: [
                "MapleStory will be updated to v.268.3.0.",
                "Monthly Windows update.",
                "Resolved an issue where some players were unable to participate in the Punch King event.",
                "Resolved an issue where certain boss names appeared incorrectly in the Campus Life Internship event UI."
              ]
            }
          ],
          topic: { key: "fixes", label: "Fixes" }
        }
      ]
    });

    const changes = article.sections.find((section) => section.title === "Changes and Updates");
    expect(changes?.items?.length).toBe(4);
    expect(changes?.items?.join(" ")).toContain("Punch King");
  });

  it("returns adjacent articles for next and previous navigation", () => {
    const item = fallbackNewsFeed.items[2];
    const adjacent = getAdjacentNewsArticles(item.id);

    expect(adjacent.next?.id).toBeTruthy();
    expect(adjacent.previous?.id).toBeTruthy();
  });

  it("returns null for unknown article ids", () => {
    expect(getNewsArticleById("missing-news-id")).toBeNull();
  });
});
