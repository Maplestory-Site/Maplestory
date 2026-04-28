/**
 * Tests for the persistence layer:
 *   - backup save / primary-corrupt fallback
 *   - export / import round-trips
 *   - quota-exceeded graceful failure
 *   - item ID uniqueness after batch loot drops
 *   - normalizeItemList deduplication
 *   - seededRng determinism
 *   - rollRarity distribution consistency with fixed seed
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_STATE,
  exportSave,
  importSave,
  loadGameState,
  saveGameState,
  type IdleGameState
} from "../gameEngine";
import {
  BACKUP_STORAGE_KEY,
  RECOVERY_STORAGE_KEY,
  STORAGE_KEY,
} from "../persistence";
import {
  createItem,
  generateItemId,
  normalizeItemList,
  rollRarity
} from "../itemSystem";
import { createSeededRng } from "../seededRng";
import { generateLootDrops } from "../lootSystem";

// ─── localStorage mock ────────────────────────────────────────────────────────

class MemoryStorage {
  private map = new Map<string, string>();
  getItem(key: string): string | null { return this.map.get(key) ?? null; }
  setItem(key: string, value: string): void { this.map.set(key, value); }
  removeItem(key: string): void { this.map.delete(key); }
  clear(): void { this.map.clear(); }
  get length(): number { return this.map.size; }
  key(index: number): string | null { return [...this.map.keys()][index] ?? null; }
}

let storage: MemoryStorage;

function installStorage() {
  storage = new MemoryStorage();
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    writable: true,
    value: { localStorage: storage }
  });
}

afterEach(() => {
  Reflect.deleteProperty(globalThis, "window");
});

function freshState(overrides: Partial<IdleGameState> = {}): IdleGameState {
  return { ...structuredClone(DEFAULT_STATE), ...overrides };
}

// ─── Backup save / recovery ───────────────────────────────────────────────────

describe("persistence — backup save", () => {
  it("promotes previous primary save to backup before overwriting", () => {
    installStorage();
    const s1 = freshState({ level: 5 });
    const s2 = freshState({ level: 10 });

    saveGameState(s1);
    expect(storage.getItem(BACKUP_STORAGE_KEY)).toBeNull(); // nothing to back up yet on first write

    // First write doesn't have an existing primary to back up
    saveGameState(s2);
    const backupRaw = storage.getItem(BACKUP_STORAGE_KEY);
    expect(backupRaw).not.toBeNull();
    const backup = JSON.parse(backupRaw!) as IdleGameState;
    expect(backup.level).toBe(5); // backup holds the first save
  });

  it("loads from backup when primary save is corrupted JSON", () => {
    installStorage();
    const s1 = freshState({ level: 42, mesos: 9999 });
    const s2 = freshState({ level: 100, mesos: 0 });

    // First save: s1 → primary (nothing to back up yet)
    saveGameState(s1);
    // Second save: s1 → backup, s2 → primary
    saveGameState(s2);
    // Corrupt the primary (s2)
    storage.setItem(STORAGE_KEY, "{ BROKEN JSON");

    const loaded = loadGameState();
    // Should recover from backup (which holds s1 with level 42)
    expect(loaded.level).toBe(42);
    expect(loaded.mesos).toBe(9999);
  });

  it("stashes corrupted primary under recovery key", () => {
    installStorage();
    const good = freshState({ level: 7 });
    saveGameState(good);
    storage.setItem(STORAGE_KEY, "not valid json");

    loadGameState();
    const recovery = storage.getItem(RECOVERY_STORAGE_KEY);
    expect(recovery).toBe("not valid json");
  });

  it("returns fresh default state when both primary and backup are corrupted", () => {
    installStorage();
    storage.setItem(STORAGE_KEY, "BAD");
    storage.setItem(BACKUP_STORAGE_KEY, "ALSO BAD");

    const loaded = loadGameState();
    expect(loaded.level).toBe(DEFAULT_STATE.level);
    expect(loaded.stage).toBe(DEFAULT_STATE.stage);
  });

  it("saveGameState returns ok:false on QuotaExceededError without throwing", () => {
    installStorage();
    vi.spyOn(storage, "setItem").mockImplementation(() => {
      throw new DOMException("QuotaExceededError", "QuotaExceededError");
    });

    const result = saveGameState(freshState());
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/quota|QuotaExceeded/i);
  });
});

// ─── Export / Import ──────────────────────────────────────────────────────────

describe("persistence — export / import", () => {
  it("round-trips a save through export → import without data loss", () => {
    const original = freshState({
      level: 55,
      mesos: 123456,
      crystals: 88,
      stage: 230,
      prestigeCount: 3
    });

    const encoded = exportSave(original);
    expect(typeof encoded).toBe("string");
    expect(encoded.length).toBeGreaterThan(0);

    installStorage();
    const restored = importSave(encoded);
    expect(restored).not.toBeNull();
    expect(restored!.level).toBe(55);
    expect(restored!.mesos).toBe(123456);
    expect(restored!.crystals).toBe(88);
    expect(restored!.stage).toBe(230);
    expect(restored!.prestigeCount).toBe(3);
  });

  it("returns null for a malformed import string", () => {
    installStorage();
    expect(importSave("this is not base64!!!@#$")).toBeNull();
    expect(importSave("")).toBeNull();
    expect(importSave("aW52YWxpZA==")).toBeNull(); // base64("invalid") — not valid JSON state
  });
});

// ─── Item ID uniqueness ───────────────────────────────────────────────────────

describe("item system — ID uniqueness", () => {
  it("generateItemId never produces the same value twice in rapid succession", () => {
    const ids = Array.from({ length: 500 }, () => generateItemId("weapon", "common"));
    const unique = new Set(ids);
    expect(unique.size).toBe(500);
  });

  it("createItem returns unique IDs even when called 100 times in the same millisecond", () => {
    // Freeze Date.now to simulate same-millisecond creation
    const frozen = 1700000000000;
    vi.spyOn(Date, "now").mockReturnValue(frozen);

    const ids = Array.from({ length: 100 }, () =>
      createItem({ type: "weapon", rarity: "common", zoneIndex: 1, levelRequirement: 1 }).id
    );
    const unique = new Set(ids);
    expect(unique.size).toBe(100);

    vi.restoreAllMocks();
  });

  it("normalizeItemList deduplicates items with the same ID and reassigns fresh IDs", () => {
    const base = createItem({ type: "armor", rarity: "uncommon", zoneIndex: 2, levelRequirement: 5 });
    const duplicate = { ...base }; // same ID

    const result = normalizeItemList([base, duplicate, base]);
    expect(result.length).toBe(3);
    const ids = result.map((item) => item.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(3); // all three should now be unique
  });

  it("batch loot drop for 14 boss kills produces no duplicate item IDs", () => {
    const drops = generateLootDrops({
      monster: null,
      zoneIndex: 20,
      playerLevel: 100,
      stage: 150,
      normalKills: 50,
      eliteKills: 5,
      bossKills: 3,
      maxDrops: 14
    });
    const ids = drops.map((d) => d.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });
});

// ─── Seeded RNG ───────────────────────────────────────────────────────────────

describe("seededRng", () => {
  it("produces the same sequence when reset to the same seed", () => {
    const rng = createSeededRng(12345);
    const run1 = Array.from({ length: 20 }, () => rng.next());
    rng.reset();
    const run2 = Array.from({ length: 20 }, () => rng.next());
    expect(run1).toEqual(run2);
  });

  it("different seeds produce different sequences", () => {
    const rng1 = createSeededRng(1);
    const rng2 = createSeededRng(2);
    const seq1 = Array.from({ length: 10 }, () => rng1.next());
    const seq2 = Array.from({ length: 10 }, () => rng2.next());
    expect(seq1).not.toEqual(seq2);
  });

  it("all values are in [0, 1)", () => {
    const rng = createSeededRng(99);
    for (let i = 0; i < 1000; i++) {
      const v = rng.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("rollRarity with a seeded RNG produces identical results on repeated calls", () => {
    const rng = createSeededRng(42);
    const results1 = Array.from({ length: 50 }, () => rollRarity(10, 5, rng.next.bind(rng)));
    rng.reset();
    const results2 = Array.from({ length: 50 }, () => rollRarity(10, 5, rng.next.bind(rng)));
    expect(results1).toEqual(results2);
  });

  it("rollRarity at high zone produces higher-rarity distribution", () => {
    const rng = createSeededRng(7);
    const lowZone  = Array.from({ length: 200 }, () => rollRarity(1,  0, rng.next.bind(rng)));
    rng.reset();
    const highZone = Array.from({ length: 200 }, () => rollRarity(30, 0, rng.next.bind(rng)));

    const countRare = (arr: string[], target: string) => arr.filter((v) => v === target).length;
    expect(countRare(highZone, "legendary") + countRare(highZone, "epic"))
      .toBeGreaterThanOrEqual(countRare(lowZone, "legendary") + countRare(lowZone, "epic"));
  });
});

// ─── Monster ID uniqueness ────────────────────────────────────────────────────

describe("monster system — ID uniqueness", () => {
  it("all monster IDs per map are unique (normals + elite + boss)", async () => {
    const { getAllMonstersByMap, MAP_MONSTER_CONTENT } = await import("../monsterSystem");
    // Spot-check the first 8 maps to keep the test fast.
    const mapsToCheck = MAP_MONSTER_CONTENT.slice(0, 8);
    for (const map of mapsToCheck) {
      const all = getAllMonstersByMap(map.mapId);
      const ids = all.map((m) => m.id);
      const unique = new Set(ids);
      expect(unique.size).toBe(ids.length);
    }
  });

  it("no two maps define a boss with the same ID", async () => {
    const { MAP_MONSTER_CONTENT, getBossByMap } = await import("../monsterSystem");
    const bossIds = MAP_MONSTER_CONTENT
      .map((map) => getBossByMap(map.mapId)?.id)
      .filter(Boolean) as string[];
    const unique = new Set(bossIds);
    expect(unique.size).toBe(bossIds.length);
  });
});
