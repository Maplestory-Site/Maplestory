/**
 * IdleStory World — Progression System
 *
 * Hero and upgrade data, XP/leveling formulas, resource rates, prestige gate.
 * All functions are pure — no side effects, no I/O.
 */

import type { GearId, IdleGameState, SkillId, UpgradeId, WorldZone, DatabaseMonster } from "./gameEngine";
import { getClassDpsMult, getResolvedPassiveDpsMult } from "./classSystem";
import { getActiveBuffDpsMult } from "./skillSystem";
import { getDpsAmpMult, getGoldIncomeMult } from "./economySystem";
import { getRelicDpsBonus, getRelicGoldBonus } from "./rebirthSystem";
import {
  getMilestoneDpsMult,
  getMilestoneMesosMult,
  BOSS_SURGE_DPS_MULT
} from "./powerSpikeSystem";
import { getTalentDpsMult, getTalentGoldMult } from "./talentSystem";
import { calculateTotalEquipmentStats } from "./inventorySystem";
import { calculateHeroTeamDps } from "./heroSystem";
import {
  getMonstersByMap,
  getStageMonsterByMap,
  toDatabaseMonster,
  type MapMonster
} from "./monsterSystem";

// ─── Hero data ────────────────────────────────────────────────────────────────

export {
  HEROES,
  getHeroCost,
  getHeroRequiredXp,
  getHeroRuntime,
  getHeroStats,
  getPartySynergyMult,
  getUnlockedHeroSkills,
  type HeroBaseStats,
  type HeroDefinition,
  type HeroRarity,
  type HeroRuntime
} from "./heroSystem";

// ─── Upgrade data ─────────────────────────────────────────────────────────────

export type UpgradeDefinition = {
  name: string;
  label: string;
  baseCost: number;
  /** Fractional boost per level (e.g. 0.14 → +14 % per level) */
  boost: number;
};

export const UPGRADES: Record<UpgradeId, UpgradeDefinition> = {
  market: { name: "Free Market", label: "Mesos / sec",  baseCost: 260, boost: 0.14 },
  forge:  { name: "Star Forge",  label: "Hero DPS",     baseCost: 420, boost: 0.18 },
  guild:  { name: "World Guild", label: "Fame gain",    baseCost: 520, boost: 0.22 }
};

export type GearDefinition = {
  name: string;
  role: string;
  baseCost: number;
  flatDps: number;
};

export const GEAR: Record<GearId, GearDefinition> = {
  weapon: { name: "Maple Blade", role: "Flat attack power", baseCost: 360, flatDps: 8 },
  armor: { name: "Explorer Armor", role: "Sustain and boss pressure", baseCost: 520, flatDps: 5 },
  charm: { name: "Lucky Charm", role: "Loot-driven power", baseCost: 680, flatDps: 4 }
};

export type SkillDefinition = {
  name: string;
  role: string;
  baseCost: number;
  dpsMultiplier: number;
};

export const SKILLS: Record<SkillId, SkillDefinition> = {
  slash: { name: "Power Slash", role: "Core auto-combat damage", baseCost: 18, dpsMultiplier: 0.035 },
  meteor: { name: "Meteor Call", role: "Boss burst scaling", baseCost: 34, dpsMultiplier: 0.055 },
  blessing: { name: "Maple Blessing", role: "Global idle efficiency", baseCost: 48, dpsMultiplier: 0.045 }
};

// ─── Cost formulas ────────────────────────────────────────────────────────────

/** Cost to upgrade a town building from `currentLevel` to `currentLevel + 1`. */
export function getUpgradeCost(id: UpgradeId, currentLevel: number): number {
  return Math.round(UPGRADES[id].baseCost * Math.pow(1.62, currentLevel));
}

export function getGearCost(id: GearId, currentLevel: number): number {
  return Math.round(GEAR[id].baseCost * Math.pow(1.5, currentLevel));
}

export function getSkillCost(id: SkillId, currentLevel: number): number {
  return Math.round(SKILLS[id].baseCost * Math.pow(1.56, currentLevel));
}

// ─── Upgrade effect descriptions ─────────────────────────────────────────────

export function getUpgradeEffect(id: UpgradeId, level: number): string {
  const boost = UPGRADES[id].boost;
  const pct = Math.round(level * boost * 100);
  switch (id) {
    case "market": return `+${pct}% mesos/sec`;
    case "forge":  return `+${pct}% hero DPS`;
    case "guild":  return `+${pct}% fame gain`;
  }
}

export function getGearEffect(id: GearId, level: number): string {
  return `+${Math.round(GEAR[id].flatDps * level)} gear DPS`;
}

export function getSkillEffect(id: SkillId, level: number): string {
  return `+${Math.round(SKILLS[id].dpsMultiplier * level * 100)}% skill DPS`;
}

// ─── XP / leveling ────────────────────────────────────────────────────────────

export type EncounterType = "normal" | "elite" | "boss";

export const MAP_STAGE_COUNT = 10;
export const ELITE_STAGE_IN_MAP = 9;
export const BOSS_STAGE_IN_MAP = 10;

export function getXpTarget(level: number): number {
  const safeLevel = Math.max(1, level);
  const postTenRamp = safeLevel > 10 ? 1 + (safeLevel - 10) * 0.035 : 1;
  return Math.floor(75 * Math.pow(safeLevel, 1.8) * postTenRamp);
}

export function getStageInMap(stage: number): number {
  return ((Math.max(1, stage) - 1) % MAP_STAGE_COUNT) + 1;
}

export function getEncounterTypeForStage(stage: number): EncounterType {
  const stageInMap = getStageInMap(stage);
  if (stageInMap === BOSS_STAGE_IN_MAP) return "boss";
  if (stageInMap === ELITE_STAGE_IN_MAP) return "elite";
  return "normal";
}

export function getMonsterHpForStage(stage: number, mapLevel: number, monster?: Pick<MapMonster, "hp" | "type">): number {
  const cycle = Math.floor((Math.max(1, stage) - 1) / MAP_STAGE_COUNT);
  if (monster) {
    const repeatMapRamp = Math.pow(1.1 + Math.min(0.04, mapLevel * 0.0008), cycle);
    return Math.max(1, Math.floor(monster.hp * repeatMapRamp));
  }

  const stageInMap = getStageInMap(stage);
  const normalHp = Math.floor(40 * Math.pow(stageInMap, 1.5));
  const mapMultiplier = 1 + Math.max(0, mapLevel - 1) * 0.18;
  const scaledNormalHp = Math.floor(normalHp * mapMultiplier);
  const encounterType = getEncounterTypeForStage(stage);

  if (encounterType === "boss") return Math.floor(scaledNormalHp * 8);
  if (encounterType === "elite") return Math.floor(scaledNormalHp * 3);
  return scaledNormalHp;
}

export function getMonsterXpReward(
  encounterType: EncounterType,
  playerLevel: number,
  mapLevel: number,
  stage: number,
  monster?: Pick<MapMonster, "xpReward">
): number {
  const cycle = Math.floor((Math.max(1, stage) - 1) / MAP_STAGE_COUNT);
  const antiFarmMultiplier = playerLevel > mapLevel + 5 ? 0.5 : 1;
  if (monster) {
    return Math.max(1, Math.floor(monster.xpReward * antiFarmMultiplier * Math.pow(1.03, cycle)));
  }

  const stageInMap = getStageInMap(stage);
  const lowBase = Math.max(2, Math.floor(3 + mapLevel * 0.35 + stageInMap * 0.45));
  const multiplier = encounterType === "boss" ? 10 : encounterType === "elite" ? 3 : 1;
  return Math.max(1, Math.floor(lowBase * multiplier * antiFarmMultiplier));
}

export type XpResult = {
  level: number;
  xp: number;
  crystalsEarned: number;
};

/**
 * Apply `xpGain` to the current `(level, xp)` pair.
 * Handles multi-level-ups in one call.
 * Returns the new level, remaining XP, and how many crystals were earned.
 */
export function applyXpGain(currentLevel: number, currentXp: number, xpGain: number): XpResult {
  let level = currentLevel;
  let xp = currentXp + xpGain;
  let crystalsEarned = 0;

  while (xp >= getXpTarget(level)) {
    xp -= getXpTarget(level);
    level += 1;
    crystalsEarned += 1;
  }

  return { level, xp, crystalsEarned };
}

// ─── Resource rates ───────────────────────────────────────────────────────────

/**
 * Total DPS from all heroes, modified by the Star Forge upgrade.
 * Prestige provides a small permanent bonus.
 */
/**
 * Total DPS with all multipliers applied in order:
 *  (heroDps + gearDps) × forgeBoost × trainingBoost × prestigeBonus
 *  × classDpsMult × passiveDpsMult × activeBuffMult
 *
 * Each layer is independently testable and togglable.
 */
export function calculateDPS(state: IdleGameState): number {
  // ── Base damage from heroes and gear ─────────────────────────────────────
  const forgeBoost = 1 + state.upgrades.forge * UPGRADES.forge.boost;
  const prestigeBonus = 1 + state.prestigeCount * 0.05;

  const heroDps = calculateHeroTeamDps(state.heroLevels);
  const gearDps = (Object.entries(state.gearLevels) as [GearId, number][]).reduce(
    (sum, [id, level]) => sum + GEAR[id].flatDps * level,
    0
  );
  const equipmentStats = calculateTotalEquipmentStats(state.equipment);
  const equipmentDps = equipmentStats.attack * (1 + equipmentStats.attackSpeed)
    * (1 + equipmentStats.critChance * equipmentStats.critDamage);
  // Training skills add a fractional multiplier (stacking additively in the sum, then applied)
  const trainingBoost = (Object.entries(state.skillLevels) as [SkillId, number][]).reduce(
    (sum, [id, level]) => sum + SKILLS[id].dpsMultiplier * level,
    1
  );

  const baseDps = (heroDps + gearDps + equipmentDps) * forgeBoost * trainingBoost * prestigeBonus;

  // ── Class, passive, active buff multipliers ───────────────────────────────
  const classMult   = getClassDpsMult(state);
  const passiveMult = getResolvedPassiveDpsMult(state);
  const buffMult    = getActiveBuffDpsMult(state.activeBuffs);

  // ── Global & permanent (economy / relic) multipliers ─────────────────────
  const globalDpsMult   = getDpsAmpMult(state.globalMults);      // crystal-tier, resets on rebirth
  const relicDpsMult    = getRelicDpsBonus(state.relicUpgrades); // permanent

  // ── Power spike multipliers ───────────────────────────────────────────────
  // Milestone: cumulative permanent bonus every 5 levels
  const milestoneMult  = getMilestoneDpsMult(state.level);
  // Boss surge: +100% DPS for 30s after every boss kill
  const bossurgeMult   = (state.bossSurgeSecondsLeft ?? 0) > 0 ? BOSS_SURGE_DPS_MULT : 1.0;

  // ── Talent tree (permanent) ───────────────────────────────────────────────
  const talentDpsMult  = getTalentDpsMult(state.talentNodes ?? {});

  return Math.max(1,
    baseDps
    * classMult * passiveMult * buffMult
    * globalDpsMult * relicDpsMult
    * milestoneMult * bossurgeMult
    * talentDpsMult
  );
}

/**
 * Mesos earned per real-world second.
 * Influenced by: DPS, zone reward boost, active monster farming score,
 * loot diversity, and the Free Market upgrade.
 */
export function getMesosPerSecond(
  state: IdleGameState,
  zone: WorldZone,
  monster: DatabaseMonster | null,
  lootCount: number
): number {
  const dps = calculateDPS(state);
  const farmBoost    = monster ? 1 + (monster.farmingScore ?? monster.level) / 140 : 1;
  const lootBoost    = 1 + lootCount * 0.035;
  const marketBoost  = 1 + state.upgrades.market * UPGRADES.market.boost;
  const globalGoldMult   = getGoldIncomeMult(state.globalMults);  // crystal-tier
  const relicGoldMult    = getRelicGoldBonus(state.relicUpgrades); // permanent
  const milestoneMesosMult = getMilestoneMesosMult(state.level);  // permanent level bonus
  const talentGoldMult   = getTalentGoldMult(state.talentNodes ?? {}); // talent tree permanent
  return (7 + dps * 0.9) * zone.rewardBoost * farmBoost * lootBoost * marketBoost
    * globalGoldMult * relicGoldMult * milestoneMesosMult * talentGoldMult;
}

/**
 * Fame earned per real-world second.
 */
export function getFamePerSecond(state: IdleGameState, monster: DatabaseMonster | null): number {
  const bossBonus = monster?.isBoss ? 0.04 : 0;
  const guildBoost = 1 + state.upgrades.guild * UPGRADES.guild.boost;
  return (0.02 + bossBonus) * guildBoost;
}

// ─── Prestige gate ────────────────────────────────────────────────────────────

/** Minimum crystals required to trigger a world prestige. */
export const PRESTIGE_CRYSTAL_COST = 8;

export function canPrestige(state: IdleGameState): boolean {
  return state.crystals >= PRESTIGE_CRYSTAL_COST;
}

// ─── Zone-relative monster / loot helpers ────────────────────────────────────

/** Enrich an authored monster with a real image from the API database by name match. */
function enrichWithApiImage(
  monster: DatabaseMonster,
  apiMonsters: DatabaseMonster[]
): DatabaseMonster {
  if (monster.image) return monster;
  if (!apiMonsters.length) return monster;
  const needle = monster.name.toLowerCase();
  const exact = apiMonsters.find(m => m.name.toLowerCase() === needle);
  if (exact?.image) return { ...monster, image: exact.image };
  const partial = apiMonsters.find(
    m => m.name.toLowerCase().includes(needle) || needle.includes(m.name.toLowerCase())
  );
  if (partial?.image) return { ...monster, image: partial.image };
  return monster;
}

// Zone index → target monster level band (matches MapleStory progression)
const ZONE_LEVEL_TARGETS: Record<string, [number, number]> = {
  henesys:        [1,   25],
  ellinia:        [20,  45],
  kerning:        [35,  60],
  perion:         [50,  80],
  sleepywood:     [70, 100],
  ludibrium:      [90, 120],
  omega_sector:   [100, 130],
  elnath:         [120, 150],
  ice_valley:     [140, 170],
  aqua_road:      [150, 180],
  minar_forest:   [160, 190],
  dragon_nest:    [170, 200],
  mu_lung:        [180, 210],
  nihal_desert:   [190, 220],
  magatia:        [200, 230],
  singapore:      [210, 240],
  masteria:       [220, 250],
  crimsonwood:    [230, 260],
  zipangu:        [240, 265],
  leafre_sky:     [250, 270],
  temple_of_time: [260, 280],
  black_mage_lair:[270, 290],
};

export function getZoneMonsters(zone: WorldZone, monsters: DatabaseMonster[]): DatabaseMonster[] {
  if (monsters.length) {
    // 1. Level band match using explicit per-zone ranges
    const band = ZONE_LEVEL_TARGETS[zone.id];
    if (band) {
      const [minLv, maxLv] = band;
      const inBand = monsters
        .filter((m) => m.level >= minLv && m.level <= maxLv && m.image)
        .sort((a, b) => a.level - b.level);
      if (inBand.length >= 3) {
        // Spread picks: some from start, middle, end + any boss
        const bossInBand = inBand.filter((m) => m.isBoss).slice(0, 1);
        const normals = inBand.filter((m) => !m.isBoss);
        const step = Math.max(1, Math.floor(normals.length / 6));
        const picked = normals.filter((_, i) => i % step === 0).slice(0, 6);
        return [...picked, ...bossInBand].slice(0, 8);
      }
    }

    // 2. Closest-level fallback
    const targetLevel = (band ? (band[0] + band[1]) / 2 : zone.requirement * 8);
    const byLevel = monsters
      .filter((m) => m.image)
      .slice()
      .sort((a, b) => Math.abs(a.level - targetLevel) - Math.abs(b.level - targetLevel))
      .slice(0, 8);
    if (byLevel.length) return byLevel;
  }

  // Final fallback: authored emoji monsters
  return getMonstersByMap(zone.id).map(toDatabaseMonster);
}

export function getCurrentMonster(
  state: IdleGameState,
  zone: WorldZone,
  monsters: DatabaseMonster[]
): DatabaseMonster | null {
  const zoneMonsters = getZoneMonsters(zone, monsters);
  if (!zoneMonsters.length) return null;

  const encounterType = getEncounterTypeForStage(state.stage);
  const boss = zoneMonsters.find((m) => m.isBoss);
  const regulars = zoneMonsters.filter((m) => !m.isBoss);
  const elite = regulars[regulars.length - 1] ?? boss ?? zoneMonsters[0] ?? null;
  const normals = regulars.slice(0, Math.max(1, regulars.length - 1));

  if (encounterType === "boss") return boss ?? elite;
  if (encounterType === "elite") return elite;
  return normals[(getStageInMap(state.stage) - 1) % normals.length] ?? elite;
}

export function getFeaturedLoot(
  monster: DatabaseMonster | null,
  items: { id: string; name: string; image: string | null; type: string; rarity: string; level: number | null; sourceMonsters: string[] }[]
): typeof items {
  if (!monster) return items.slice(0, 4);
  const direct = items.filter((item) =>
    item.sourceMonsters.some((source) => source.toLowerCase() === monster.name.toLowerCase())
  );
  if (direct.length) return direct.slice(0, 4);
  const dropNames = new Set((monster.drops ?? []).map((drop) => drop.name.toLowerCase()));
  const fromDrops = items.filter((item) => dropNames.has(item.name.toLowerCase()));
  return fromDrops.length ? fromDrops.slice(0, 4) : items.slice(0, 4);
}

// ─── Score ────────────────────────────────────────────────────────────────────

export function computeScore(
  state: IdleGameState,
  dps: number,
  mapCount: number,
  monsterCount: number,
  itemCount: number
): number {
  return Math.round(
    state.level * 120 +
    dps * 20 +
    state.fame * 35 +
    state.crystals * 90 +
    state.stage * 15 +
    state.prestigeCount * 500 +
    mapCount + monsterCount + itemCount
  );
}
