/**
 * Library content invariants.
 *
 * These tests fail if a guide is added without real visual data, if an asset
 * path points to a missing public file, if class data is shallow, or if skill
 * icon sections are empty.
 */

import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  libraryGuides,
  type LibraryGuide
} from "../../data/libraryGuides";
import {
  libraryCategoryAssets,
  LIBRARY_ICON_PATHS,
  type LibraryCategoryAsset
} from "../../data/libraryAssets";
import {
  filterClasses,
  getClassById,
  getClassesByGroup,
  libraryClasses,
  libraryClassGroups,
  type LibraryClass
} from "../../data/libraryClasses";
import {
  getSkillIconsForClass,
  librarySkillIconSections,
  librarySkillIconsByClassId
} from "../../data/librarySkillIcons";
import { grandisClassSkillCatalog, type GrandisClassSkillCatalog } from "../../data/grandisClassSkillCatalog";

const isFiniteString = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0;

const publicAssetExists = (assetPath: string): boolean => {
  if (!assetPath.startsWith("/")) return false;
  return existsSync(join(process.cwd(), "public", assetPath.replace(/^\//, "")));
};

describe("LibraryGuide required visual fields", () => {
  it.each(libraryGuides)("guide '$id' has a non-empty iconKey", (guide: LibraryGuide) => {
    expect(isFiniteString(guide.iconKey)).toBe(true);
    expect(LIBRARY_ICON_PATHS[guide.iconKey]).toBeTruthy();
  });

  it.each(libraryGuides)("guide '$id' has an existing cardImage", (guide: LibraryGuide) => {
    expect(isFiniteString(guide.cardImage)).toBe(true);
    expect(publicAssetExists(guide.cardImage), `${guide.id} cardImage missing: ${guide.cardImage}`).toBe(true);
  });

  it.each(libraryGuides)("guide '$id' has an existing heroImage", (guide: LibraryGuide) => {
    expect(isFiniteString(guide.heroImage)).toBe(true);
    expect(publicAssetExists(guide.heroImage), `${guide.id} heroImage missing: ${guide.heroImage}`).toBe(true);
  });

  it.each(libraryGuides)(
    "guide '$id' has a complete visualTheme",
    (guide: LibraryGuide) => {
      expect(guide.visualTheme).toBeDefined();
      expect(isFiniteString(guide.visualTheme.gradient)).toBe(true);
      expect(isFiniteString(guide.visualTheme.accent)).toBe(true);
    }
  );
});

describe("LibraryGuide content depth", () => {
  it.each(libraryGuides)("guide '$id' has at least 4 sections", (guide: LibraryGuide) => {
    expect(guide.sections.length).toBeGreaterThanOrEqual(4);
  });

  it.each(libraryGuides)("guide '$id' has at least 5 key points", (guide: LibraryGuide) => {
    expect(guide.keyPoints.length).toBeGreaterThanOrEqual(5);
  });

  it.each(libraryGuides)("guide '$id' has a non-trivial summary", (guide: LibraryGuide) => {
    expect(guide.summary.trim().length).toBeGreaterThan(20);
  });

  it.each(libraryGuides)("guide '$id' sections all have useful body text", (guide: LibraryGuide) => {
    for (const section of guide.sections) {
      expect(section.body.trim().length, `section '${section.heading}' empty in '${guide.id}'`).toBeGreaterThan(20);
    }
  });
});

describe("LibraryGuide uniqueness and references", () => {
  it("has at least 30 guides", () => {
    expect(libraryGuides.length).toBeGreaterThanOrEqual(30);
  });

  it("has no duplicate guide IDs", () => {
    const ids = new Set<string>();
    for (const guide of libraryGuides) {
      expect(ids.has(guide.id), `duplicate guide id: ${guide.id}`).toBe(false);
      ids.add(guide.id);
    }
  });

  it("resolves every related guide reference", () => {
    const allIds = new Set(libraryGuides.map((g) => g.id));
    for (const guide of libraryGuides) {
      for (const ref of guide.relatedGuideIds) {
        expect(allIds.has(ref), `guide '${guide.id}' references missing '${ref}'`).toBe(true);
      }
    }
  });
});

describe("libraryCategoryAssets", () => {
  const allCategories = Object.keys(libraryCategoryAssets) as Array<keyof typeof libraryCategoryAssets>;

  it("every category exposes complete existing visual assets", () => {
    for (const cat of allCategories) {
      const asset: LibraryCategoryAsset = libraryCategoryAssets[cat];
      expect(isFiniteString(asset.cardImage)).toBe(true);
      expect(isFiniteString(asset.heroImage)).toBe(true);
      expect(isFiniteString(asset.fallbackImage)).toBe(true);
      expect(publicAssetExists(asset.cardImage), `${cat} cardImage missing`).toBe(true);
      expect(publicAssetExists(asset.heroImage), `${cat} heroImage missing`).toBe(true);
      expect(publicAssetExists(asset.fallbackImage), `${cat} fallbackImage missing`).toBe(true);
      expect(isFiniteString(asset.gradient)).toBe(true);
      expect(isFiniteString(asset.accent)).toBe(true);
      expect(LIBRARY_ICON_PATHS[asset.icon]).toBeTruthy();
    }
  });

  it("uses downloaded Grandis visuals for the main category images", () => {
    expect(libraryCategoryAssets.Content.cardImage).toBe("/library/grandis/headers/grandis-library.png");
    expect(libraryCategoryAssets.Classes.cardImage).toBe("/library/grandis/headers/verdel-block.png");
    expect(libraryCategoryAssets.Events.cardImage).toBe("/library/grandis/headers/fox-valley-block.png");
    expect(libraryCategoryAssets.Resources.cardImage).toBe("/library/grandis/headers/ristonia-block.png");
  });

  it("no two categories share the same cardImage", () => {
    const seen = new Map<string, string>();
    for (const cat of allCategories) {
      const url = libraryCategoryAssets[cat].cardImage;
      const previous = seen.get(url);
      expect(previous, `categories '${previous}' and '${cat}' share cardImage ${url}`).toBeUndefined();
      seen.set(url, cat);
    }
  });

  it("no two categories share the same heroImage", () => {
    const seen = new Map<string, string>();
    for (const cat of allCategories) {
      const url = libraryCategoryAssets[cat].heroImage;
      const previous = seen.get(url);
      expect(previous, `categories '${previous}' and '${cat}' share heroImage ${url}`).toBeUndefined();
      seen.set(url, cat);
    }
  });
});

describe("LibraryClass required class data", () => {
  it("has class entries across every declared group", () => {
    for (const group of libraryClassGroups) {
      const inGroup = getClassesByGroup(group);
      expect(inGroup.length, `group '${group}' has no classes`).toBeGreaterThan(0);
    }
  });

  it("has no duplicate class IDs", () => {
    const ids = new Set<string>();
    for (const cls of libraryClasses) {
      expect(ids.has(cls.id), `duplicate class id: ${cls.id}`).toBe(false);
      ids.add(cls.id);
    }
  });

  it.each(libraryClasses)("class '$id' has every required field", (cls: LibraryClass) => {
    expect(isFiniteString(cls.name)).toBe(true);
    expect(libraryClassGroups).toContain(cls.classGroup);
    expect(libraryClassGroups).toContain(cls.group);
    expect(isFiniteString(cls.jobGroup)).toBe(true);
    expect(isFiniteString(cls.role)).toBe(true);
    expect(isFiniteString(cls.style)).toBe(true);
    expect(["Easy", "Medium", "Hard"]).toContain(cls.difficulty);
    expect(["STR", "DEX", "INT", "LUK", "HP"]).toContain(cls.primaryStat);
    expect(isFiniteString(cls.secondaryStat)).toBe(true);
    expect(isFiniteString(cls.weapon)).toBe(true);
    expect(isFiniteString(cls.secondaryWeapon)).toBe(true);
    expect([1, 2, 3, 4, 5]).toContain(cls.mobbing);
    expect([1, 2, 3, 4, 5]).toContain(cls.bossing);
    expect([1, 2, 3, 4, 5]).toContain(cls.mobility);
    expect([1, 2, 3, 4, 5]).toContain(cls.survivability);
    expect(cls.mobbingRating).toBe(cls.mobbing);
    expect(cls.bossingRating).toBe(cls.bossing);
    expect(cls.mobilityRating).toBe(cls.mobility);
    expect(cls.survivabilityRating).toBe(cls.survivability);
    expect(isFiniteString(cls.burstProfile)).toBe(true);
    expect(isFiniteString(cls.linkSkill)).toBe(true);
    expect(isFiniteString(cls.linkSkillSummary)).toBe(true);
    expect(isFiniteString(cls.legionBonus)).toBe(true);
    expect(cls.pros.length).toBeGreaterThan(0);
    expect(cls.cons.length).toBeGreaterThan(0);
    expect(isFiniteString(cls.audience)).toBe(true);
    expect(isFiniteString(cls.iconKey)).toBe(true);
    expect(LIBRARY_ICON_PATHS[cls.iconKey]).toBeTruthy();
    expect(isFiniteString(cls.cardImage)).toBe(true);
    expect(isFiniteString(cls.heroImage)).toBe(true);
    expect(publicAssetExists(cls.cardImage), `${cls.id} cardImage missing`).toBe(true);
    expect(publicAssetExists(cls.heroImage), `${cls.id} heroImage missing`).toBe(true);
    expect(isFiniteString(cls.visualTheme.gradient)).toBe(true);
    expect(isFiniteString(cls.visualTheme.accent)).toBe(true);
    expect(cls.relatedGuideIds.length).toBeGreaterThan(0);
  });

  it("uses downloaded Grandis visuals for class cards", () => {
    const classesWithGrandisArt = libraryClasses.filter((cls) => cls.cardImage.startsWith("/library/grandis/"));
    expect(classesWithGrandisArt.length).toBe(libraryClasses.length);
  });

  it("getClassById returns the same object for every id", () => {
    for (const cls of libraryClasses) {
      expect(getClassById(cls.id)).toBe(cls);
    }
  });

  it("getClassById returns null for unknown id", () => {
    expect(getClassById("not-a-real-class")).toBeNull();
  });
});

describe("librarySkillIconsByClassId", () => {
  it("has Grandis skill catalog coverage for every class", () => {
    for (const cls of libraryClasses) {
      const catalog = grandisClassSkillCatalog[cls.id as keyof typeof grandisClassSkillCatalog];
      expect(catalog, `missing Grandis skill catalog for ${cls.id}`).toBeDefined();
      expect(catalog.sourceUrl, `${cls.id} missing Grandis source URL`).toContain("grandislibrary.com");
    }
  });

  it("covers the complete current Grandis class sitemap", () => {
    expect(Object.keys(grandisClassSkillCatalog).length).toBeGreaterThanOrEqual(52);
    for (const classId of ["dual-blade", "marksman", "cannoneer", "ren", "mo-xuan", "sia-astelle"]) {
      expect(getClassById(classId), `${classId} missing from local class library`).toBeTruthy();
      expect(grandisClassSkillCatalog[classId as keyof typeof grandisClassSkillCatalog], `${classId} missing Grandis skills`).toBeTruthy();
    }
  });

  it("has real skill icon data for every class", () => {
    for (const cls of libraryClasses) {
      const icons = librarySkillIconsByClassId[cls.id];
      expect(icons, `missing skill icon bundle for ${cls.id}`).toBeDefined();
      expect(icons.skillPreviewIcons.length, `${cls.id} has empty skill preview`).toBeGreaterThan(0);
      expect(
        librarySkillIconSections.some((section) => icons[section.key].length > 0),
        `${cls.id} has no Grandis active sections`
      ).toBe(true);
    }
  });

  it("all skill icon paths exist", () => {
    for (const cls of libraryClasses) {
      const icons = getSkillIconsForClass(cls.id);
      for (const skill of icons.skillPreviewIcons) {
        expect(publicAssetExists(skill.icon), `${skill.id} preview icon missing: ${skill.icon}`).toBe(true);
      }
      for (const section of librarySkillIconSections) {
        for (const skill of icons[section.key]) {
          expect(publicAssetExists(skill.icon), `${skill.id} icon missing: ${skill.icon}`).toBe(true);
        }
      }
    }
  });

  it("all generated Grandis skill assets exist locally", () => {
    for (const catalog of Object.values(grandisClassSkillCatalog) as GrandisClassSkillCatalog[]) {
      const sections = [
        catalog.skillPreviewIcons,
        catalog.activeBuffIcons,
        catalog.toggleIcons,
        catalog.summonIcons,
        catalog.cooldownSkillIcons,
        catalog.bindSkillIcons,
        catalog.iframeSkillIcons,
        catalog.damageReductionIcons
      ];

      for (const section of sections) {
        for (const skill of section) {
          expect(publicAssetExists(skill.icon), `${catalog.classId} generated icon missing: ${skill.icon}`).toBe(true);
        }
      }
    }
  });

  it("uses real local Grandis Bishop skill icons", () => {
    const icons = getSkillIconsForClass("bishop");
    expect(icons.skillPreviewIcons.some((skill) => skill.icon === "/library/grandis/class-icons/explorers/bishop/angel-ray.png")).toBe(true);
    expect(icons.skillPreviewIcons.some((skill) => skill.icon === "/library/grandis/class-icons/explorers/bishop/heal.png")).toBe(true);
    expect(icons.skillPreviewIcons.some((skill) => skill.icon === "/library/grandis/class-icons/explorers/mage/teleport.png")).toBe(true);
    expect(icons.activeBuffIcons.some((skill) => skill.icon === "/library/grandis/class-icons/explorers/bishop/holy-symbol.png")).toBe(true);
    expect(icons.cooldownSkillIcons.some((skill) => skill.icon === "/library/grandis/class-icons/explorers/mage/infinity.png")).toBe(true);
    expect(icons.damageReductionIcons.some((skill) => skill.icon === "/library/grandis/class-icons/explorers/bishop/divine-punishment.png")).toBe(true);
    const allBishopSkills = [
      ...icons.skillPreviewIcons,
      ...icons.activeBuffIcons,
      ...icons.toggleIcons,
      ...icons.summonIcons,
      ...icons.cooldownSkillIcons,
      ...icons.bindSkillIcons,
      ...icons.iframeSkillIcons,
      ...icons.damageReductionIcons
    ];
    expect(allBishopSkills.filter((skill) => skill.icon.startsWith("/library/grandis/")).length).toBeGreaterThan(25);
  });
});

describe("filterClasses", () => {
  it("filters by group", () => {
    const result = filterClasses({ group: "Heroes" });
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((c) => c.group === "Heroes")).toBe(true);
  });

  it("filters by difficulty", () => {
    const result = filterClasses({ difficulty: "Easy" });
    expect(result.every((c) => c.difficulty === "Easy")).toBe(true);
  });

  it("matches a free-text query across class metadata", () => {
    const result = filterClasses({ query: "boss" });
    expect(result.length).toBeGreaterThan(0);
    expect(
      result.every((c) =>
        [
          c.name,
          c.role,
          c.classGroup,
          c.jobGroup,
          c.audience,
          c.pros.join(" "),
          c.cons.join(" "),
          c.linkSkill,
          c.legionBonus
        ]
          .join(" ")
          .toLowerCase()
          .includes("boss")
      )
    ).toBe(true);
  });

  it("returns empty when no class matches", () => {
    expect(filterClasses({ query: "zzz-no-match-zzz" })).toEqual([]);
  });
});
