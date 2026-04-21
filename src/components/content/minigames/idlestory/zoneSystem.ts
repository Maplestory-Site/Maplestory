/**
 * IdleStory World — Zone System
 *
 * Data-driven zone and enemy management.
 * Loads 22 hand-crafted zones from zones.json and fallback enemies from enemies.json.
 *
 * Responsibilities:
 *  - Augment the base WorldZone type with boss / theme metadata
 *  - Zone unlock validation (level + optional prestige gate)
 *  - Zone-to-enemy mapping with fallback to JSON enemy pool
 *  - Boss mechanic descriptions for UI
 *  - Zone progression helpers (next zone, zone index, nearest unlocked)
 *
 * All functions are pure — no side effects, no I/O.
 */

import type { IdleGameState, WorldZone } from "./gameEngine";
import ZONES_RAW from "./zones.json";
import { getEncounterTypeForStage, getStageInMap } from "./progressionSystem";
import {
  getAllMonstersByMap,
  getMapMonsterContent,
  getStageMonsterByMap,
  type MapMonster
} from "./monsterSystem";

export {
  getBossByMap,
  getEliteByMap,
  getMapMonsterContent,
  getMonstersByMap,
  getRecommendedMapForLevel,
  getRecommendedMapForPower,
  getTotalMapMonsterCount
} from "./monsterSystem";

// ─── Extended zone type ───────────────────────────────────────────────────────

export type ZoneEnemy = MapMonster;

export type FullZone = WorldZone & {
  /** Short description / flavor text */
  description: string;
  /** CSS gradient string for zone card background */
  background: string;
  /** Boss name for stage × 10 encounters */
  bossName: string;
  /** Single emoji representing the boss */
  bossIcon: string;
  /** One-line description of the boss's special mechanic */
  bossMechanic: string;
  /** Visual theme key for theming components */
  theme: string;
  /** Prestige count required to enter (0 = always unlocked at level requirement) */
  prestigeRequired: number;
  /** Fallback enemy pool for this zone */
  enemies: ZoneEnemy[];
  /** Normal monsters that belong to this map. */
  monsterPool: ZoneEnemy[];
  /** Stage 9 elite for this map. */
  eliteMonster: ZoneEnemy | null;
  /** Stage 10 boss for this map. */
  bossMonster: ZoneEnemy | null;
  /** Editable map balance target. */
  recommendedPower: number;
  /** Content tier used for future routing / quests. */
  difficultyTier: string;
  /** Short map identity text from monster content. */
  flavorText: string;
};

// ─── Zone data loading ────────────────────────────────────────────────────────

type RawZone = {
  id: string;
  name: string;
  region: string;
  requirement: number;
  rewardBoost: number;
  color: string;
  background?: string;
  description?: string;
  bossName?: string;
  bossIcon?: string;
  bossMechanic?: string;
  theme?: string;
  prestigeRequired?: number;
};

/** All 22 zones loaded from zones.json, enriched with map-specific monster ecosystems. */
export const ALL_ZONES: FullZone[] = (ZONES_RAW as RawZone[]).map((raw) => {
  const monsterContent = getMapMonsterContent(raw.id);
  const enemyList = getAllMonstersByMap(raw.id);
  const monsterPool = monsterContent?.monsterPool ?? [];
  const eliteMonster = monsterContent?.eliteMonster ?? null;
  const bossMonster = monsterContent?.bossMonster ?? null;

  return {
    id: raw.id,
    name: raw.name,
    region: raw.region,
    requirement: raw.requirement,
    rewardBoost: raw.rewardBoost,
    color: raw.color,
    background: raw.background ?? raw.color,
    description: raw.description ?? monsterContent?.flavorText ?? "",
    bossName: bossMonster?.name ?? raw.bossName ?? "Zone Boss",
    bossIcon: raw.bossIcon ?? "👾",
    bossMechanic: raw.bossMechanic ?? "Powerful attack pattern.",
    theme: monsterContent?.theme ?? raw.theme ?? "default",
    prestigeRequired: raw.prestigeRequired ?? 0,
    enemies: enemyList,
    monsterPool,
    eliteMonster,
    bossMonster,
    recommendedPower: monsterContent?.recommendedPower ?? Math.round(raw.requirement * raw.rewardBoost * 100),
    difficultyTier: monsterContent?.difficultyTier ?? "starter",
    flavorText: monsterContent?.flavorText ?? raw.description ?? "",
    image: undefined
  };
});

/** Zone lookup map for O(1) access. */
const ZONE_MAP = new Map<string, FullZone>(ALL_ZONES.map((z) => [z.id, z]));

// ─── Zone access helpers ──────────────────────────────────────────────────────

export function getFullZone(id: string): FullZone | undefined {
  return ZONE_MAP.get(id);
}

export function getFullZoneOrFirst(id: string): FullZone {
  return ZONE_MAP.get(id) ?? ALL_ZONES[0]!;
}

/** Index of a zone in the ordered ALL_ZONES array (-1 if not found). */
export function getZoneIndex(id: string): number {
  return ALL_ZONES.findIndex((z) => z.id === id);
}

/** The zone immediately after the current one, or null if at the end. */
export function getNextZone(currentId: string): FullZone | null {
  const idx = getZoneIndex(currentId);
  return idx >= 0 && idx < ALL_ZONES.length - 1 ? (ALL_ZONES[idx + 1] ?? null) : null;
}

/** The zone immediately before the current one, or null if at the start. */
export function getPrevZone(currentId: string): FullZone | null {
  const idx = getZoneIndex(currentId);
  return idx > 0 ? (ALL_ZONES[idx - 1] ?? null) : null;
}

// ─── Unlock validation ────────────────────────────────────────────────────────

export type UnlockStatus =
  | { unlocked: true }
  | { unlocked: false; reason: string };

/**
 * Checks whether a player can enter a zone.
 * Gated by player level AND optional prestige count.
 */
export function getZoneUnlockStatus(
  zone: FullZone,
  state: IdleGameState
): UnlockStatus {
  if (state.level < zone.requirement) {
    return {
      unlocked: false,
      reason: `Reach level ${zone.requirement} (you are ${state.level})`
    };
  }
  if (zone.prestigeRequired > 0 && state.prestigeCount < zone.prestigeRequired) {
    return {
      unlocked: false,
      reason: `Requires Prestige ×${zone.prestigeRequired} (you have ×${state.prestigeCount})`
    };
  }
  return { unlocked: true };
}

/** Returns all zones the player has unlocked. */
export function getUnlockedZones(state: IdleGameState): FullZone[] {
  return ALL_ZONES.filter((z) => getZoneUnlockStatus(z, state).unlocked);
}

/** Returns all zones not yet unlocked. */
export function getLockedZones(state: IdleGameState): FullZone[] {
  return ALL_ZONES.filter((z) => !getZoneUnlockStatus(z, state).unlocked);
}

/** The next locked zone — useful for "you're close to unlocking…" UI hints. */
export function getNextLockedZone(state: IdleGameState): FullZone | null {
  return ALL_ZONES.find((z) => !getZoneUnlockStatus(z, state).unlocked) ?? null;
}

// ─── Zone enemy helpers ───────────────────────────────────────────────────────

/** All non-boss enemies in a zone. */
export function getZoneRegularEnemies(zone: FullZone): ZoneEnemy[] {
  return zone.monsterPool.length ? zone.monsterPool : zone.enemies.filter((e) => e.type === "normal");
}

export function getZoneElite(zone: FullZone): ZoneEnemy | null {
  return zone.eliteMonster ?? zone.enemies.find((e) => e.type === "elite") ?? null;
}

/** The boss enemy for a zone (the `isBoss: true` entry). */
export function getZoneBoss(zone: FullZone): ZoneEnemy | null {
  return zone.bossMonster ?? zone.enemies.find((e) => e.isBoss || e.type === "boss") ?? null;
}

/**
 * Returns the active enemy for a given stage in a zone.
 * Boss stages (stage % 10 === 0) always return the boss.
 * Other stages cycle through regular enemies.
 */
export function getStageEnemy(zone: FullZone, stage: number): ZoneEnemy | null {
  const mappedEnemy = getStageMonsterByMap(zone.id, stage);
  if (mappedEnemy) return mappedEnemy;

  const encounterType = getEncounterTypeForStage(stage);
  if (encounterType === "boss") {
    return getZoneBoss(zone) ?? zone.enemies[0] ?? null;
  }
  if (encounterType === "elite") {
    return getZoneElite(zone) ?? getZoneBoss(zone) ?? zone.enemies[0] ?? null;
  }
  const regulars = getZoneRegularEnemies(zone);
  if (!regulars.length) return zone.enemies[0] ?? null;
  return regulars[(getStageInMap(stage) - 1) % regulars.length] ?? regulars[0] ?? null;
}

// ─── Boss mechanic overlay ────────────────────────────────────────────────────

export type BossEffect = {
  name: string;
  icon: string;
  mechanic: string;
  /** Numeric modifier applied to gameplay, if any (0 = purely visual / flavour) */
  modifier: number;
  /** What the modifier affects */
  modifierTarget: "dps_mult" | "gold_mult" | "hp_mult" | "none";
};

/**
 * Returns the gameplay-relevant boss effect for a zone's boss.
 * These map zone theme → mechanical impact so the engine can apply them.
 *
 * For MVP the modifiers are informational only — the UI shows them as flavour text
 * and the raidBoss action already handles boss difficulty via HP scaling.
 */
export function getZoneBossEffect(zone: FullZone): BossEffect {
  const themeEffects: Record<string, BossEffect> = {
    meadow:       { name: "Mushroom Shield", icon: "🍄", mechanic: zone.bossMechanic, modifier: 0,   modifierTarget: "none"     },
    forest:       { name: "Curse Debuff",    icon: "👁️",  mechanic: zone.bossMechanic, modifier: 0.5, modifierTarget: "dps_mult" },
    sewer:        { name: "Meso Drain",      icon: "🐊", mechanic: zone.bossMechanic, modifier: 0.85,modifierTarget: "gold_mult"},
    wasteland:    { name: "Stone Armor",     icon: "🗿", mechanic: zone.bossMechanic, modifier: 2.0, modifierTarget: "hp_mult"  },
    dungeon:      { name: "Slime Absorb",    icon: "👑", mechanic: zone.bossMechanic, modifier: 0,   modifierTarget: "none"     },
    clocktower:   { name: "Time Rewind",     icon: "🕰️", mechanic: zone.bossMechanic, modifier: 1.5, modifierTarget: "hp_mult"  },
    "sci-fi":     { name: "Energy Shield",   icon: "🛸", mechanic: zone.bossMechanic, modifier: 0.6, modifierTarget: "dps_mult" },
    frozen:       { name: "Blizzard Freeze", icon: "🦣", mechanic: zone.bossMechanic, modifier: 0,   modifierTarget: "none"     },
    ice_cave:     { name: "Dark Aura",       icon: "😈", mechanic: zone.bossMechanic, modifier: 1.8, modifierTarget: "hp_mult"  },
    underwater:   { name: "Twin Form",       icon: "🐟", mechanic: zone.bossMechanic, modifier: 0,   modifierTarget: "none"     },
    dragon_forest:{ name: "Dragon Breath",   icon: "🐉", mechanic: zone.bossMechanic, modifier: 0,   modifierTarget: "none"     },
    cliff:        { name: "Aerial Phase",    icon: "🦅", mechanic: zone.bossMechanic, modifier: 0.5, modifierTarget: "dps_mult" },
    oriental:     { name: "Stance Immunity", icon: "🐼", mechanic: zone.bossMechanic, modifier: 0,   modifierTarget: "none"     },
    desert:       { name: "Sandstorm",       icon: "🏜️", mechanic: zone.bossMechanic, modifier: 0,   modifierTarget: "none"     },
    alchemy:      { name: "HP Regen",        icon: "⚗️", mechanic: zone.bossMechanic, modifier: 1.6, modifierTarget: "hp_mult"  },
    urban:        { name: "Eye Split",       icon: "🌆", mechanic: zone.bossMechanic, modifier: 0,   modifierTarget: "none"     },
    shadow_city:  { name: "Rage Form",       icon: "🔴", mechanic: zone.bossMechanic, modifier: 2.2, modifierTarget: "hp_mult"  },
    fortress:     { name: "Headless Phase",  icon: "🐎", mechanic: zone.bossMechanic, modifier: 0,   modifierTarget: "none"     },
    shrine:       { name: "Illusion Split",  icon: "👺", mechanic: zone.bossMechanic, modifier: 0,   modifierTarget: "none"     },
    sky:          { name: "Storm Charge",    icon: "🌤️", mechanic: zone.bossMechanic, modifier: 0,   modifierTarget: "none"     },
    time:         { name: "Timer Reset",     icon: "⏳", mechanic: zone.bossMechanic, modifier: 2.5, modifierTarget: "hp_mult"  },
    abyss:        { name: "World Seal",      icon: "🌑", mechanic: zone.bossMechanic, modifier: 0.2, modifierTarget: "dps_mult" }
  };

  return themeEffects[zone.theme] ?? {
    name: "Boss",
    icon: zone.bossIcon,
    mechanic: zone.bossMechanic,
    modifier: 0,
    modifierTarget: "none"
  };
}

// ─── Zone progression summary ─────────────────────────────────────────────────

export type ZoneProgressSummary = {
  currentIndex: number;
  totalZones: number;
  unlockedCount: number;
  nextLocked: FullZone | null;
  levelsToNext: number;
  prestigesToNext: number;
  progressPct: number;
};

export function getZoneProgressSummary(
  state: IdleGameState,
  currentZoneId: string
): ZoneProgressSummary {
  const currentIndex = getZoneIndex(currentZoneId);
  const nextLocked   = getNextLockedZone(state);
  const unlockedCount = ALL_ZONES.filter((z) => getZoneUnlockStatus(z, state).unlocked).length;

  const levelsToNext    = nextLocked ? Math.max(0, nextLocked.requirement - state.level) : 0;
  const prestigesToNext = nextLocked
    ? Math.max(0, nextLocked.prestigeRequired - state.prestigeCount)
    : 0;
  const progressPct = Math.round((unlockedCount / ALL_ZONES.length) * 100);

  return {
    currentIndex,
    totalZones: ALL_ZONES.length,
    unlockedCount,
    nextLocked,
    levelsToNext,
    prestigesToNext,
    progressPct
  };
}

// ─── WorldZone compatibility shim ─────────────────────────────────────────────

/**
 * Convert ALL_ZONES to the minimal WorldZone shape expected by gameEngine.
 * Used when passing to functions that take `WorldZone[]`.
 */
export function toWorldZones(zones: FullZone[]): WorldZone[] {
  return zones.map(({ id, name, region, requirement, rewardBoost, color, image }) => ({
    id, name, region, requirement, rewardBoost, color, image
  }));
}

export const ALL_WORLD_ZONES: WorldZone[] = toWorldZones(ALL_ZONES);
