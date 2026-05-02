import { describe, expect, it } from "vitest";
import {
  getVideoDisplayDescription,
  inferContentTags,
  inferDisplayCategory,
  inferPrimaryCategory
} from "../contentDiscovery";

describe("contentDiscovery video classification", () => {
  it("does not label chill streams as bossing", () => {
    const item = {
      category: "Bossing",
      title: "Chill stream come lets cheat",
      description: "Hey! I'm SnailSlayer, MapleStory grinder, boss..."
    };

    expect(inferDisplayCategory(item)).toBe("Live Stream");
    expect(inferPrimaryCategory(item)).toBe("progression");
    expect(inferContentTags(item)).toContain("Live Session");
    expect(getVideoDisplayDescription(item)).toContain("live session");
  });

  it("labels Inkwell-style update videos as news", () => {
    const item = {
      category: "Bossing",
      title: "INKWELL'S NOTE SUMMER IS HERE",
      description: "Summer is here, and yeah... you can feel it everywhere."
    };

    expect(inferDisplayCategory(item)).toBe("News");
    expect(inferPrimaryCategory(item)).toBe("progression");
    expect(inferContentTags(item)).toContain("News");
  });

  it("keeps real boss content in the boss lane", () => {
    const item = {
      category: "Bossing",
      title: "Hard Lucid solo clear",
      description: "Boss setup, burst timing, and weekly boss clear."
    };

    expect(inferDisplayCategory(item)).toBe("Bossing");
    expect(inferPrimaryCategory(item)).toBe("boss");
    expect(inferContentTags(item)).toContain("Boss Fight");
  });
});
