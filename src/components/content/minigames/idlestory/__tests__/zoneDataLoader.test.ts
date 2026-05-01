import { describe, expect, it } from "vitest";
import { normalizeLoadedZoneIdForGame } from "../hooks/useIdleStoryDataLoader";

describe("useIdleStoryDataLoader zone normalization", () => {
  it("keeps valid game zone ids even when they are not database map ids", () => {
    expect(normalizeLoadedZoneIdForGame("florina_beach")).toBe("florina_beach");
    expect(normalizeLoadedZoneIdForGame("ellinia")).toBe("ellinia");
  });

  it("falls back only for invalid saved zone ids", () => {
    expect(normalizeLoadedZoneIdForGame("100000000")).toBe("henesys");
  });
});
