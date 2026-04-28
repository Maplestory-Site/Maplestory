import type { IdleGameState, WorldZone } from "./gameEngine";
import ZONES_RAW from "./zones.json";
import { getEncounterTypeForStage, getStageInMap } from "./progressionSystem";
import {
  getAllMonstersByMap,
  getMapMonsterContent,
  getStageMonsterByMap,
  type MapMonster
} from "./monsterSystem";
import { sanitizeGameText, sanitizeMonsterPortrait } from "./textSanitizer";

export {
  getBossByMap,
  getEliteByMap,
  getMapMonsterContent,
  getMonstersByMap,
  getRecommendedMapForLevel,
  getRecommendedMapForPower,
  getTotalMapMonsterCount
} from "./monsterSystem";

export type ZoneEnemy = MapMonster;

export type FullZone = WorldZone & {
  description: string;
  background: string;
  bossName: string;
  bossIcon: string;
  bossMechanic: string;
  theme: string;
  prestigeRequired: number;
  enemies: ZoneEnemy[];
  monsterPool: ZoneEnemy[];
  eliteMonster: ZoneEnemy | null;
  bossMonster: ZoneEnemy | null;
  recommendedPower: number;
  difficultyTier: string;
  flavorText: string;
};

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

export const ALL_ZONES: FullZone[] = (ZONES_RAW as RawZone[]).map((raw) => {
  const monsterContent = getMapMonsterContent(raw.id);
  const enemyList = getAllMonstersByMap(raw.id);
  const monsterPool = monsterContent?.monsterPool ?? [];
  const eliteMonster = monsterContent?.eliteMonster ?? null;
  const bossMonster = monsterContent?.bossMonster ?? null;

  return {
    id: raw.id,
    name: sanitizeGameText(raw.name, raw.id),
    region: sanitizeGameText(raw.region, "Unknown Region"),
    requirement: raw.requirement,
    rewardBoost: raw.rewardBoost,
    color: raw.color,
    background: raw.background ?? raw.color,
    description: sanitizeGameText(raw.description ?? monsterContent?.flavorText ?? "", "A mysterious area."),
    bossName: sanitizeGameText(bossMonster?.name ?? raw.bossName ?? "Zone Boss", "Zone Boss"),
    bossIcon: sanitizeMonsterPortrait(raw.bossIcon, "👾"),
    bossMechanic: sanitizeGameText(raw.bossMechanic ?? "Powerful attack pattern.", "Powerful attack pattern."),
    theme: sanitizeGameText(monsterContent?.theme ?? raw.theme ?? "default", "default"),
    prestigeRequired: raw.prestigeRequired ?? 0,
    enemies: enemyList,
    monsterPool,
    eliteMonster,
    bossMonster,
    recommendedPower: monsterContent?.recommendedPower ?? Math.round(raw.requirement * raw.rewardBoost * 100),
    difficultyTier: monsterContent?.difficultyTier ?? "starter",
    flavorText: sanitizeGameText(monsterContent?.flavorText ?? raw.description ?? "", ""),
    image: undefined
  };
});

const ZONE_MAP = new Map<string, FullZone>(ALL_ZONES.map((z) => [z.id, z]));

export function getFullZone(id: string): FullZone | undefined {
  return ZONE_MAP.get(id);
}

export function getFullZoneOrFirst(id: string): FullZone {
  return ZONE_MAP.get(id) ?? ALL_ZONES[0]!;
}

export function getZoneIndex(id: string): number {
  return ALL_ZONES.findIndex((z) => z.id === id);
}

export function getNextZone(currentId: string): FullZone | null {
  const idx = getZoneIndex(currentId);
  return idx >= 0 && idx < ALL_ZONES.length - 1 ? (ALL_ZONES[idx + 1] ?? null) : null;
}

export function getPrevZone(currentId: string): FullZone | null {
  const idx = getZoneIndex(currentId);
  return idx > 0 ? (ALL_ZONES[idx - 1] ?? null) : null;
}

export type UnlockStatus =
  | { unlocked: true }
  | { unlocked: false; reason: string };

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
      reason: `Requires Prestige x${zone.prestigeRequired} (you have x${state.prestigeCount})`
    };
  }
  return { unlocked: true };
}

export function getUnlockedZones(state: IdleGameState): FullZone[] {
  return ALL_ZONES.filter((z) => getZoneUnlockStatus(z, state).unlocked);
}

export function getLockedZones(state: IdleGameState): FullZone[] {
  return ALL_ZONES.filter((z) => !getZoneUnlockStatus(z, state).unlocked);
}

export function getNextLockedZone(state: IdleGameState): FullZone | null {
  return ALL_ZONES.find((z) => !getZoneUnlockStatus(z, state).unlocked) ?? null;
}

export function getZoneRegularEnemies(zone: FullZone): ZoneEnemy[] {
  return zone.monsterPool.length ? zone.monsterPool : zone.enemies.filter((e) => e.type === "normal");
}

export function getZoneElite(zone: FullZone): ZoneEnemy | null {
  return zone.eliteMonster ?? zone.enemies.find((e) => e.type === "elite") ?? null;
}

export function getZoneBoss(zone: FullZone): ZoneEnemy | null {
  return zone.bossMonster ?? zone.enemies.find((e) => e.isBoss || e.type === "boss") ?? null;
}

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

export type BossEffect = {
  name: string;
  icon: string;
  mechanic: string;
  modifier: number;
  modifierTarget: "dps_mult" | "gold_mult" | "hp_mult" | "none";
};

export function getZoneBossEffect(zone: FullZone): BossEffect {
  const themeEffects: Record<string, BossEffect> = {
    meadow: { name: "Mushroom Shield", icon: "MUSH", mechanic: zone.bossMechanic, modifier: 0, modifierTarget: "none" },
    forest: { name: "Curse Debuff", icon: "CURSE", mechanic: zone.bossMechanic, modifier: 0.5, modifierTarget: "dps_mult" },
    sewer: { name: "Meso Drain", icon: "DRAIN", mechanic: zone.bossMechanic, modifier: 0.85, modifierTarget: "gold_mult" },
    wasteland: { name: "Stone Armor", icon: "STONE", mechanic: zone.bossMechanic, modifier: 2.0, modifierTarget: "hp_mult" },
    dungeon: { name: "Slime Absorb", icon: "ABSORB", mechanic: zone.bossMechanic, modifier: 0, modifierTarget: "none" },
    clocktower: { name: "Time Rewind", icon: "TIME", mechanic: zone.bossMechanic, modifier: 1.5, modifierTarget: "hp_mult" },
    "sci-fi": { name: "Energy Shield", icon: "SHIELD", mechanic: zone.bossMechanic, modifier: 0.6, modifierTarget: "dps_mult" },
    frozen: { name: "Blizzard Freeze", icon: "ICE", mechanic: zone.bossMechanic, modifier: 0, modifierTarget: "none" },
    ice_cave: { name: "Dark Aura", icon: "DARK", mechanic: zone.bossMechanic, modifier: 1.8, modifierTarget: "hp_mult" },
    underwater: { name: "Twin Form", icon: "TWIN", mechanic: zone.bossMechanic, modifier: 0, modifierTarget: "none" },
    dragon_forest: { name: "Dragon Breath", icon: "DRAGON", mechanic: zone.bossMechanic, modifier: 0, modifierTarget: "none" },
    cliff: { name: "Aerial Phase", icon: "AERO", mechanic: zone.bossMechanic, modifier: 0.5, modifierTarget: "dps_mult" },
    oriental: { name: "Stance Immunity", icon: "STANCE", mechanic: zone.bossMechanic, modifier: 0, modifierTarget: "none" },
    desert: { name: "Sandstorm", icon: "SAND", mechanic: zone.bossMechanic, modifier: 0, modifierTarget: "none" },
    alchemy: { name: "HP Regen", icon: "ALCH", mechanic: zone.bossMechanic, modifier: 1.6, modifierTarget: "hp_mult" },
    urban: { name: "Eye Split", icon: "EYE", mechanic: zone.bossMechanic, modifier: 0, modifierTarget: "none" },
    shadow_city: { name: "Rage Form", icon: "RAGE", mechanic: zone.bossMechanic, modifier: 2.2, modifierTarget: "hp_mult" },
    fortress: { name: "Headless Phase", icon: "FORT", mechanic: zone.bossMechanic, modifier: 0, modifierTarget: "none" },
    shrine: { name: "Illusion Split", icon: "ILL", mechanic: zone.bossMechanic, modifier: 0, modifierTarget: "none" },
    sky: { name: "Storm Charge", icon: "SKY", mechanic: zone.bossMechanic, modifier: 0, modifierTarget: "none" },
    time: { name: "Timer Reset", icon: "CLOCK", mechanic: zone.bossMechanic, modifier: 2.5, modifierTarget: "hp_mult" },
    abyss: { name: "World Seal", icon: "VOID", mechanic: zone.bossMechanic, modifier: 0.2, modifierTarget: "dps_mult" }
  };

  return themeEffects[zone.theme] ?? {
    name: "Boss",
    icon: zone.bossIcon,
    mechanic: zone.bossMechanic,
    modifier: 0,
    modifierTarget: "none"
  };
}

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
  const nextLocked = getNextLockedZone(state);
  const unlockedCount = ALL_ZONES.filter((z) => getZoneUnlockStatus(z, state).unlocked).length;

  const levelsToNext = nextLocked ? Math.max(0, nextLocked.requirement - state.level) : 0;
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

export function toWorldZones(zones: FullZone[]): WorldZone[] {
  return zones.map(({ id, name, region, requirement, rewardBoost, color, image }) => ({
    id, name, region, requirement, rewardBoost, color, image
  }));
}

export const ALL_WORLD_ZONES: WorldZone[] = toWorldZones(ALL_ZONES);
