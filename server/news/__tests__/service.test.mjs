import { describe, expect, it } from "vitest";
import { dedupeNewsItems } from "../service.mjs";

const item = (overrides = {}) => ({
  id: overrides.id ?? "1",
  title: overrides.title ?? "Cash Shop Update",
  region: overrides.region ?? "gms",
  publishedAt: overrides.publishedAt ?? "2026-05-01T00:00:00.000Z",
  sourceUrl: overrides.sourceUrl ?? "https://maplestory.nexon.net/news/1",
  ...overrides
});

describe("news service dedupe", () => {
  it("dedupes by id", () => {
    const result = dedupeNewsItems([item({ id: "a" }), item({ id: "a", title: "Duplicate" })]);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Cash Shop Update");
  });

  it("dedupes by normalized sourceUrl before title/date", () => {
    const result = dedupeNewsItems([
      item({ id: "a", sourceUrl: "https://maplestory.nexon.net/news/1" }),
      item({ id: "b", sourceUrl: "https://maplestory.nexon.net/news/1" })
    ]);
    expect(result.map((entry) => entry.id)).toEqual(["a"]);
  });

  it("keeps distinct regions when only titles match", () => {
    const result = dedupeNewsItems([
      item({ id: "gms", region: "gms", sourceUrl: "", title: "Patch Notes" }),
      item({ id: "kms", region: "kms", sourceUrl: "", title: "Patch Notes" })
    ]);
    expect(result.map((entry) => entry.id)).toEqual(["gms", "kms"]);
  });
});
