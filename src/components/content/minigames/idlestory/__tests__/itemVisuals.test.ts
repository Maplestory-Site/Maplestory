/**
 * itemVisuals.test.ts — pure-function tests for the item visual resolver.
 *
 * Asserts:
 *  - every IdleItemType resolves to a non-empty fallback icon path
 *  - every IdleItemRarity resolves to a non-empty rarity style
 *  - getItemIcon prefers a database image when present, falls back to local SVG
 *  - getItemPower is non-negative and monotonic for stronger stats
 *  - compareItemStats sorts upgrades first
 *  - the resolver never returns an empty string for any item shape
 *  - the path resolver returns paths under /idlestory/items/ (no /maple-text)
 */

import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { IdleItemInstance, IdleItemRarity, IdleItemStats, IdleItemType } from "../itemSystem";
import {
  compareItemStats,
  getItemDatabaseMatch,
  getItemDatabaseMetadata,
  getItemFallbackIcon,
  getItemIcon,
  getItemImage,
  getItemPower,
  getItemRarityColor,
  getItemRarityGlow,
  getItemRarityStyle,
  getItemTypeLabel,
  isItemUpgrade,
  type ItemDatabaseEntry
} from "../itemVisuals";

const ALL_TYPES: IdleItemType[] = ["weapon", "armor", "helmet", "ring", "amulet"];
const ALL_RARITIES: IdleItemRarity[] = ["common", "uncommon", "rare", "epic", "legendary"];

function blankStats(overrides: Partial<IdleItemStats> = {}): IdleItemStats {
  return {
    attack: 0,
    defense: 0,
    hp: 0,
    critChance: 0,
    critDamage: 0,
    attackSpeed: 0,
    damageMultiplier: 0,
    goldMultiplier: 0,
    xpMultiplier: 0,
    ...overrides
  };
}

function makeItem(overrides: Partial<IdleItemInstance> = {}): IdleItemInstance {
  return {
    id: "item-1",
    name: "Test Sword",
    type: "weapon",
    category: "weapon",
    rarity: "common",
    level: 1,
    levelRequirement: 1,
    zoneIndex: 0,
    baseStats: blankStats({ attack: 5 }),
    affixes: [],
    stats: blankStats({ attack: 5 }),
    value: 10,
    enhanceLevel: 0,
    rerollCount: 0,
    ...overrides
  } as IdleItemInstance;
}

const publicAssetExists = (assetPath: string): boolean => {
  if (!assetPath.startsWith("/")) return false;
  return existsSync(join(process.cwd(), "public", assetPath.replace(/^\//, "")));
};

// ─── Fallback icons ───────────────────────────────────────────────────────────

describe("getItemFallbackIcon", () => {
  it.each(ALL_TYPES)("type '%s' returns a non-empty path under /idlestory/items/", (type) => {
    const path = getItemFallbackIcon({ type });
    expect(path.length).toBeGreaterThan(0);
    expect(path.startsWith("/idlestory/items/")).toBe(true);
    expect(path.endsWith(".svg")).toBe(true);
  });

  it.each(ALL_TYPES)("type '%s' fallback file exists on disk", (type) => {
    const path = getItemFallbackIcon({ type });
    expect(publicAssetExists(path), `fallback file missing for type '${type}': ${path}`).toBe(true);
  });

  it("never reuses /maple-text.png as a generic fallback", () => {
    for (const type of ALL_TYPES) {
      expect(getItemFallbackIcon({ type })).not.toContain("maple-text");
    }
  });

  it("no two item types share the same fallback icon", () => {
    const seen = new Map<string, IdleItemType>();
    for (const type of ALL_TYPES) {
      const icon = getItemFallbackIcon({ type });
      const previous = seen.get(icon);
      expect(previous, `types '${previous}' and '${type}' share fallback ${icon}`).toBeUndefined();
      seen.set(icon, type);
    }
  });

  it("returns weapon fallback for an unknown type (defensive)", () => {
    const path = getItemFallbackIcon({ type: "unknown" as IdleItemType });
    expect(path).toContain("weapon");
  });
});

// ─── Type labels ──────────────────────────────────────────────────────────────

describe("getItemTypeLabel", () => {
  it.each(ALL_TYPES)("returns a label for type '%s'", (type) => {
    expect(getItemTypeLabel(type).length).toBeGreaterThan(0);
  });

  it("returns 'Item' for an unknown type", () => {
    expect(getItemTypeLabel("not-a-type" as IdleItemType)).toBe("Item");
  });
});

// ─── Rarity styles ────────────────────────────────────────────────────────────

describe("rarity styling", () => {
  it.each(ALL_RARITIES)("rarity '%s' has a complete style bundle", (rarity) => {
    const style = getItemRarityStyle(rarity);
    expect(style.color.startsWith("#")).toBe(true);
    expect(style.glow.length).toBeGreaterThan(0);
    expect(style.border.length).toBeGreaterThan(0);
    expect(style.label.length).toBeGreaterThan(0);
  });

  it("getItemRarityColor and getItemRarityGlow proxy to the style bundle", () => {
    const style = getItemRarityStyle("epic");
    expect(getItemRarityColor("epic")).toBe(style.color);
    expect(getItemRarityGlow("epic")).toBe(style.glow);
  });

  it("falls back to common style for an unknown rarity", () => {
    const style = getItemRarityStyle("mythic" as IdleItemRarity);
    expect(style.label).toBe("Common");
  });
});

// ─── Database lookup ──────────────────────────────────────────────────────────

const DATABASE: ItemDatabaseEntry[] = [
  { id: "ms-fairy",  name: "Fairy Wand",      image: "https://cdn.example.com/fairy-wand.png",  category: "Wand" },
  { id: "ms-helm",   name: "Pioneer Helmet",  image: "https://cdn.example.com/pioneer-helm.png", category: "Hat" },
  { id: "ms-ring",   name: "Crystal Ring",    image: "https://cdn.example.com/crystal-ring.png", category: "Ring" },
  { id: "ms-amulet", name: "Sparkling Amulet",image: "https://cdn.example.com/sparkle.png",      category: "Pendant" },
  { id: "ms-armor",  name: "Iron Overall",    image: "https://cdn.example.com/iron-overall.png", category: "Overall" },
  { id: "ms-no-img", name: "Phantom Blade",   category: "Two-Handed Sword" }
];

describe("getItemDatabaseMatch", () => {
  it("falls back to BUNDLED_ITEM_DATABASE when caller supplies no database", () => {
    // The resolver now always tries the bundled curated DB so every IdleStory
    // item resolves to a real MapleStory sprite without callers passing a list.
    const match = getItemDatabaseMatch({ name: "Anything", type: "weapon" }, []);
    expect(match).not.toBeNull();
    expect(match?.image).toBeTruthy();
  });

  it("matches by exact normalized name first", () => {
    const result = getItemDatabaseMatch({ name: "Fairy Wand", type: "weapon" }, DATABASE);
    expect(result?.id).toBe("ms-fairy");
  });

  it("falls back to category match for each item type", () => {
    expect(getItemDatabaseMatch({ name: "Random", type: "ring"   }, DATABASE)?.id).toBe("ms-ring");
    expect(getItemDatabaseMatch({ name: "Random", type: "amulet" }, DATABASE)?.id).toBe("ms-amulet");
    expect(getItemDatabaseMatch({ name: "Random", type: "helmet" }, DATABASE)?.id).toBe("ms-helm");
    expect(getItemDatabaseMatch({ name: "Random", type: "armor"  }, DATABASE)?.id).toBe("ms-armor");
  });

  it("falls back to the bundled DB when supplied list has no match", () => {
    // Pass a junk one-entry DB; the resolver should ignore it and find a ring
    // in the bundled catalog instead of returning null.
    const match = getItemDatabaseMatch(
      { name: "Random", type: "ring" },
      [{ id: "x", name: "Other", category: "Etc" }]
    );
    expect(match).not.toBeNull();
    expect(match?.idleType ?? "").toBe("ring");
  });
});

// ─── Icon resolver ────────────────────────────────────────────────────────────

describe("getItemIcon", () => {
  it("uses the database image when available", () => {
    const url = getItemIcon({ name: "Fairy Wand", type: "weapon" }, DATABASE);
    expect(url).toBe("https://cdn.example.com/fairy-wand.png");
  });

  it("falls back to local SVG when the database match has no image", () => {
    const url = getItemIcon({ name: "Phantom Blade", type: "weapon" }, DATABASE);
    expect(url).toBe(getItemFallbackIcon({ type: "weapon" }));
  });

  it("uses the bundled DB image when no caller-supplied database is given", () => {
    // Prior behaviour: fell back to the local SVG. New behaviour: pulls from
    // the curated bundle. Local SVG remains the LAST-RESORT fallback.
    const url = getItemIcon({ name: "Anything That Has No Match", type: "armor" });
    expect(url.length).toBeGreaterThan(0);
    expect(url).not.toBe("");
    // It's either a CDN URL or — if the bundle had no armor entry — the local SVG.
    expect(url.startsWith("http") || url.startsWith("/idlestory/items/")).toBe(true);
  });

  it.each(ALL_TYPES)("never returns an empty string for type '%s'", (type) => {
    const url = getItemIcon({ name: "Anything", type });
    expect(url.length).toBeGreaterThan(0);
  });

  it("getItemImage proxies to getItemIcon", () => {
    expect(getItemImage({ name: "Fairy Wand", type: "weapon" }, DATABASE))
      .toBe(getItemIcon({ name: "Fairy Wand", type: "weapon" }, DATABASE));
  });
});

describe("getItemDatabaseMetadata", () => {
  it("returns the matched entry with name and category", () => {
    const meta = getItemDatabaseMetadata({ name: "Crystal Ring", type: "ring" }, DATABASE);
    expect(meta?.name).toBe("Crystal Ring");
    expect(meta?.category).toBe("Ring");
  });

  it("returns a bundled entry when no caller-supplied database matches", () => {
    // The bundled DB is now the always-available fallback source.
    const meta = getItemDatabaseMetadata({ name: "Phantom Made-Up Item", type: "weapon" }, []);
    expect(meta).not.toBeNull();
    expect(meta?.image).toBeTruthy();
  });
});

// ─── Power and comparison ─────────────────────────────────────────────────────

describe("getItemPower", () => {
  it("is non-negative for an empty stat sheet", () => {
    expect(getItemPower({ stats: blankStats() })).toBeGreaterThanOrEqual(0);
  });

  it("is monotonic — strictly stronger stats yield strictly higher power", () => {
    const weak  = makeItem({ stats: blankStats({ attack: 5,  defense: 2 }) });
    const stronger = makeItem({ stats: blankStats({ attack: 10, defense: 4 }) });
    expect(getItemPower(stronger)).toBeGreaterThan(getItemPower(weak));
  });

  it("treats negative stats as zero (defensive)", () => {
    const broken = makeItem({ stats: blankStats({ attack: -50 }) });
    expect(getItemPower(broken)).toBeGreaterThanOrEqual(0);
  });
});

describe("compareItemStats", () => {
  it("returns an empty list when stats are identical", () => {
    const a = makeItem({ stats: blankStats({ attack: 10 }) });
    const b = makeItem({ stats: blankStats({ attack: 10 }) });
    expect(compareItemStats(a, b)).toEqual([]);
  });

  it("returns positive deltas first when candidate is stronger", () => {
    const current   = makeItem({ stats: blankStats({ attack: 5,  defense: 5 }) });
    const candidate = makeItem({ stats: blankStats({ attack: 10, defense: 2 }) });
    const deltas = compareItemStats(current, candidate);
    expect(deltas.length).toBe(2);
    expect(deltas[0]!.better).toBe(true);
    expect(deltas[1]!.better).toBe(false);
  });

  it("treats null current as 'first equip' — every candidate stat shows as better", () => {
    const candidate = makeItem({ stats: blankStats({ attack: 5 }) });
    const deltas = compareItemStats(null, candidate);
    expect(deltas.length).toBe(1);
    expect(deltas[0]!.better).toBe(true);
    expect(deltas[0]!.delta).toBe(5);
  });
});

describe("isItemUpgrade", () => {
  it("returns true when current is null", () => {
    const candidate = makeItem();
    expect(isItemUpgrade(null, candidate)).toBe(true);
  });

  it("returns true when candidate has strictly higher power", () => {
    const cur = makeItem({ stats: blankStats({ attack: 1 }) });
    const cand = makeItem({ stats: blankStats({ attack: 100 }) });
    expect(isItemUpgrade(cur, cand)).toBe(true);
  });

  it("returns false when candidate is weaker or equal", () => {
    const cur = makeItem({ stats: blankStats({ attack: 100 }) });
    const cand = makeItem({ stats: blankStats({ attack: 1 }) });
    expect(isItemUpgrade(cur, cand)).toBe(false);
    expect(isItemUpgrade(cur, cur)).toBe(false);
  });
});
