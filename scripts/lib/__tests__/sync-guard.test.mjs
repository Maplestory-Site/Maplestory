/**
 * sync-guard.test.mjs — regression tests for the empty-feed preservation rule.
 *
 * The rule the audit asked for:
 *   "If forceRefresh returns 0 items for items/maps/quests/monsters/news when
 *    a previous public/cache feed exists, keep the existing feed."
 *
 * These tests pin that rule down so a future refactor can't quietly break it.
 */
import { describe, expect, it } from "vitest";
import { countFeedItems, decideFeedWrite } from "../sync-guard.mjs";

describe("countFeedItems", () => {
  it("counts { items: [...] } shapes", () => {
    expect(countFeedItems({ items: [1, 2, 3] })).toBe(3);
  });
  it("counts { entries: [...] } shapes", () => {
    expect(countFeedItems({ entries: [1, 2] })).toBe(2);
  });
  it("counts { data: [...] } shapes", () => {
    expect(countFeedItems({ data: [1] })).toBe(1);
  });
  it("counts bare arrays", () => {
    expect(countFeedItems([1, 2, 3, 4])).toBe(4);
  });
  it("falls back to meta.itemCount", () => {
    expect(countFeedItems({ meta: { itemCount: 7 } })).toBe(7);
  });
  it("returns 0 for null / undefined / unknown shapes", () => {
    expect(countFeedItems(null)).toBe(0);
    expect(countFeedItems(undefined)).toBe(0);
    expect(countFeedItems({})).toBe(0);
    expect(countFeedItems({ foo: "bar" })).toBe(0);
  });
});

describe("decideFeedWrite", () => {
  it("PRESERVES when fresh is empty but existing is non-empty", () => {
    const result = decideFeedWrite({
      fresh: { items: [] },
      existing: { items: [{ id: "a" }, { id: "b" }] },
      label: "item"
    });
    expect(result.action).toBe("preserve");
    expect(result.reason).toContain("0 entries");
    expect(result.reason).toContain("cached 2");
  });

  it("PRESERVES when fresh is null but existing is non-empty", () => {
    const result = decideFeedWrite({
      fresh: null,
      existing: { items: [{ id: "a" }] },
      label: "monster"
    });
    expect(result.action).toBe("preserve");
  });

  it("FAILS when fresh is null and existing is null/empty", () => {
    expect(decideFeedWrite({ fresh: null, existing: null, label: "x" }).action).toBe("fail");
    expect(decideFeedWrite({ fresh: null, existing: { items: [] }, label: "x" }).action).toBe("fail");
  });

  it("WRITES when fresh has data (regardless of existing)", () => {
    expect(decideFeedWrite({
      fresh: { items: [1, 2] },
      existing: { items: [{ id: "a" }, { id: "b" }, { id: "c" }] },
      label: "item"
    }).action).toBe("write");
    expect(decideFeedWrite({
      fresh: { items: [1, 2, 3] },
      existing: null,
      label: "item"
    }).action).toBe("write");
  });

  it("WRITES when both fresh and existing are empty (allows initial seed)", () => {
    expect(decideFeedWrite({ fresh: { items: [] }, existing: null, label: "x" }).action).toBe("write");
    expect(decideFeedWrite({ fresh: { items: [] }, existing: { items: [] }, label: "x" }).action).toBe("write");
  });

  it("handles { meta: { itemCount } }-style news feed shape", () => {
    const result = decideFeedWrite({
      fresh: { items: [], meta: { itemCount: 0 } },
      existing: { items: [], meta: { itemCount: 42 } },
      label: "news"
    });
    expect(result.action).toBe("preserve");
  });
});
