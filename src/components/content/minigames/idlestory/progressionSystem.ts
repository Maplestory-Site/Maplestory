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
import { getGuildPassiveBonuses } from "./guildSystem";
import { getSkillBuildBonuses } from "./skillBuildSystem";
import { getReplayabilityBonuses } from "./replayabilitySystem";
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
/** Fractional boost per level (e.g. 0.14 -> +14% per level) */
  boost: number;
};

export const UPGRADES: Record<UpgradeId, UpgradeDefinition> = {
  market: { name: "Free Market", label: "Mesos / sec",  baseCost: 380, boost: 0.14 },
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
  // Balance pass 3: XP curve targets a long idle game, not a same-session run.
  //   Lv 1->2:  ~140 XP   (was 220)   - reachable in 5-10 min
  //   Lv 5->6:  ~3.5K XP  (was 4.8K)  - reachable around 45-90 min
  //   Lv 10->11: ~22K XP  (was 14K)   - reachable in several hours
  //   Lv 40+:   exponent steepens so end-game prestige is a real milestone.
  if (safeLevel <= 10) {
    return Math.floor(140 * Math.pow(safeLevel, 2.20));
  }
  if (safeLevel <= 40) {
    return Math.floor(420 * Math.pow(safeLevel, 2.15));
  }
  return Math.floor(680 * Math.pow(safeLevel, 2.30));
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
    const repeatMapRamp = Math.pow(1.09 + Math.min(0.03, mapLevel * 0.0005), cycle);
    return Math.max(1, Math.floor(monster.hp * repeatMapRamp));
  }

  const stageInMap = getStageInMap(stage);
  const normalHp = Math.floor(260 * Math.pow(stageInMap, 1.58));
  const mapMultiplier = 1 + Math.max(0, mapLevel - 1) * 0.19;
  const scaledNormalHp = Math.floor(normalHp * mapMultiplier);
  const encounterType = getEncounterTypeForStage(stage);

  if (encounterType === "boss") return Math.floor(scaledNormalHp * 8.8);
  if (encounterType === "elite") return Math.floor(scaledNormalHp * 3.6);
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
  // Graduated anti-farm: full XP when on-level, drops fast when overleveled
  const levelGap = playerLevel - mapLevel;
  const antiFarmMultiplier =
    levelGap > 20 ? 0.05 :
    levelGap > 12 ? 0.15 :
    levelGap > 6  ? 0.40 :
    levelGap > 2  ? 0.70 : 1.0;
  if (monster) {
    return Math.max(1, Math.floor(monster.xpReward * antiFarmMultiplier * Math.pow(1.015, cycle)));
  }

  const stageInMap = getStageInMap(stage);
  // Balance: base was (2 + map*0.28 + stage*0.34) = 2 XP at stage 1.
  // Now (4 + map*0.40 + stage*0.55) = 5 XP at stage 1 — still slow enough to feel earned.
  // Boss mult: 6.5→4.2; elite mult: 2.2→1.6 — spikes no longer carry full level-ups.
  const lowBase = Math.max(1, Math.floor(4 + mapLevel * 0.40 + stageInMap * 0.55));
  const multiplier = encounterType === "boss" ? 4.2 : encounterType === "elite" ? 1.6 : 1;
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
  // Softened multipliers to prevent snowballing too fast
  const forgeBoost = 1 + state.upgrades.forge * UPGRADES.forge.boost * 0.4;
  const prestigeBonus = 1 + state.prestigeCount * 0.02;

  const heroDps = calculateHeroTeamDps(state.heroLevels);
  const gearDps = (Object.entries(state.gearLevels) as [GearId, number][]).reduce(
    (sum, [id, level]) => sum + GEAR[id].flatDps * level,
    0
  );
  const equipmentStats = calculateTotalEquipmentStats(state.equipment, {
    buildFocus: state.buildFocus,
    talentNodes: state.talentNodes
  });
  const effectiveCritChance = Math.min(0.85, Math.max(0, equipmentStats.critChance));
  const equipmentDamageMult = 1 + Math.min(0.42, Math.max(0, equipmentStats.damageMultiplier));
  const equipmentDps = equipmentStats.attack
    * (1 + equipmentStats.attackSpeed)
    * (1 + effectiveCritChance * equipmentStats.critDamage)
    * equipmentDamageMult;
  // Training skills add a fractional multiplier (stacking additively in the sum, then applied)
  const trainingBoost = (Object.entries(state.skillLevels) as [SkillId, number][]).reduce(
    (sum, [id, level]) => sum + SKILLS[id].dpsMultiplier * level,
    1
  );

  const levelForDamage = Math.max(1, state.level);
  const levelDpsMult =
    levelForDamage <= 20
      ? 1 + (levelForDamage - 1) * 0.017
      : levelForDamage <= 60
        ? 1.32 + (levelForDamage - 20) * 0.009
        : 1.68 + Math.min(0.4, (levelForDamage - 60) * 0.0038);

  const baseDps = (heroDps + gearDps + equipmentDps) * forgeBoost * trainingBoost * prestigeBonus * levelDpsMult;

  // ── Class, passive, active buff multipliers ───────────────────────────────
  const classMult   = getClassDpsMult(state);
  const passiveMult = getResolvedPassiveDpsMult(state);
  const buffMult    = getActiveBuffDpsMult(state.activeBuffs);
  const buildMults  = getSkillBuildBonuses(state);

  // ── Global & permanent (economy / relic) multipliers ─────────────────────
  const globalDpsMult   = getDpsAmpMult(state.globalMults);      // crystal-tier, resets on rebirth
  const relicDpsMult    = getRelicDpsBonus(state.relicUpgrades); // permanent

  // ── Power spike multipliers ───────────────────────────────────────────────
  // Milestone: cumulative permanent bonus every 5 levels
  const milestoneMult  = getMilestoneDpsMult(state.level);
  // Boss surge: temporary DPS spike after every boss kill
  const bossurgeMult   = (state.bossSurgeSecondsLeft ?? 0) > 0 ? BOSS_SURGE_DPS_MULT : 1.0;

  // ── Talent tree (permanent) ───────────────────────────────────────────────
  const talentDpsMult  = getTalentDpsMult(state.talentNodes ?? {});
  const guildDpsMult   = getGuildPassiveBonuses(state.guildState).damageMult;
  const replayabilityBonuses = getReplayabilityBonuses(
    state.replayability,
    state.prestigeCount,
    state.rebirthCount
  );

  return Math.max(1,
    baseDps
    * classMult * passiveMult * buffMult
    * buildMults.passiveDpsMult
    * buildMults.attackSpeedMult
    * globalDpsMult * relicDpsMult
    * milestoneMult * bossurgeMult
    * talentDpsMult
    * guildDpsMult
    * replayabilityBonuses.dpsMult
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
  const equipmentStats = calculateTotalEquipmentStats(state.equipment, {
    buildFocus: state.buildFocus,
    talentNodes: state.talentNodes
  });
  const equipmentGoldMult = 1 + Math.min(0.35, Math.max(0, equipmentStats.goldMultiplier));
  const farmBoost    = monster ? 1 + (monster.farmingScore ?? monster.level) / 140 : 1;
  const lootBoost    = 1 + lootCount * 0.035;
  const marketBoost  = 1 + state.upgrades.market * UPGRADES.market.boost;
  const globalGoldMult   = getGoldIncomeMult(state.globalMults);  // crystal-tier
  const relicGoldMult    = getRelicGoldBonus(state.relicUpgrades); // permanent
  const milestoneMesosMult = getMilestoneMesosMult(state.level);  // permanent level bonus
  const talentGoldMult   = getTalentGoldMult(state.talentNodes ?? {}); // talent tree permanent
  // Balance pass 3: long-term idle pacing. Heavy early-game nerf with a soft
  // cap on the DPS-driven term so end-game multipliers don't snowball.
  //   Original: (7  + dps*0.9 )    DPS 10 -> 16/s, DPS 100 -> 97/s
  //   Pass 1:   (9  + dps*0.32)    DPS 10 -> 12/s, DPS 100 -> 41/s
  //   Pass 2:   (1.85+dps*0.10)    DPS 10 -> 2.85/s, DPS 100 -> 12/s
  //   Pass 3:   (0.5 + dps*0.07) with sqrt-softened DPS term once dps > 200.
  // Effect at game start (DPS ~5): 0.85/s base. At DPS 100: 7.5/s. At DPS 10k: ~14/s.
  const dpsTerm = dps <= 200 ? dps * 0.07 : 200 * 0.07 + Math.sqrt(dps - 200) * 0.45;
  return (0.5 + dpsTerm) * zone.rewardBoost * farmBoost * lootBoost * marketBoost
    * globalGoldMult * relicGoldMult * milestoneMesosMult * talentGoldMult * equipmentGoldMult;
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


// Zone index -> target monster level band (fallback when keyword match finds < 3 results)
const ZONE_LEVEL_TARGETS: Record<string, [number, number]> = {
  henesys:                  [10,  175],
  ellinia:                  [10,   55],
  kerning:                  [10,  140],
  perion:                   [15,  140],
  sleepywood:               [100, 225],
  ludibrium:                [60,  175],
  omega_sector:             [100, 190],
  elnath:                   [50,  210],
  ice_valley:               [140, 180],
  aqua_road:                [75,  185],
  minar_forest:             [90,  240],
  dragon_nest:              [90,  240],
  mu_lung:                  [100, 210],
  nihal_desert:             [80,  165],
  magatia:                  [80,  170],
  singapore:                [180, 205],
  masteria:                 [165, 220],
  crimsonwood:              [180, 210],
  zipangu:                  [60,  225],
  leafre_sky:               [140, 245],
  temple_of_time:           [155, 240],
  black_mage_lair:          [160, 265],
  arcane_river:             [195, 265],
  moonbridge:               [245, 275],
  labyrinth_of_suffering:   [250, 275],
  limina:                   [120, 280],
  // New zones (v2)
  florina_beach:            [1,   30],
  orbis:                    [30,  100],
  ariant:                   [40,  120],
  phantom_forest:           [50,  130],
  golden_temple:            [60,  140],
  edelstein:                [70,  155],
  ghost_park:               [80,  165],
  azwan:                    [95,  185],
  mirror_world:             [105, 200],
  future_henesys:           [130, 225],
  kritias:                  [155, 250],
  tynerum:                  [170, 255],
  black_heaven:             [185, 260],
  cernium:                  [220, 275],
  hotel_arcus:              [240, 280],
  odium:                    [260, 285],
  reverse_city:             [280, 290],
};

// Zone id -> API location region/map keywords for direct matching.
// These match the actual region names used in the monsters-feed API.
const ZONE_API_KEYWORDS: Record<string, string[]> = {
  henesys:                  ["henesys"],
  ellinia:                  ["ellinia"],
  kerning:                  ["kerning city", "kerning"],
  perion:                   ["perion"],
  sleepywood:               ["sleepywood"],
  ludibrium:                ["ludibrium", "toy city"],
  omega_sector:             ["omega sector"],
  elnath:                   ["el nath", "orbis"],
  ice_valley:               ["ice valley"],
  aqua_road:                ["aquarium"],
  minar_forest:             ["minar forest", "leafre"],
  dragon_nest:              ["dragon nest", "leafre"],
  mu_lung:                  ["mu lung garden", "mu lung"],
  nihal_desert:             ["nihal desert", "ariant"],
  magatia:                  ["magatia"],
  singapore:                ["singapore", "boat quay"],
  masteria:                 ["new leaf city", "masteria"],
  crimsonwood:              ["crimsonwood"],
  zipangu:                  ["mushroom shrine", "zipangu"],
  leafre_sky:               ["leafre"],
  temple_of_time:           ["temple of time"],
  black_mage_lair:          ["black heaven", "black mage"],
  arcane_river:             ["arcane river", "vanishing journey"],
  moonbridge:               ["moonbridge", "tenebris"],
  labyrinth_of_suffering:   ["labyrinth of suffering"],
  limina:                   ["limina"],
  // New zones (v2)
  florina_beach:            ["florina beach", "florina"],
  orbis:                    ["orbis", "cloud park"],
  ariant:                   ["ariant"],
  phantom_forest:           ["phantom forest"],
  golden_temple:            ["golden temple"],
  edelstein:                ["edelstein"],
  ghost_park:               ["ghost park"],
  azwan:                    ["azwan"],
  mirror_world:             ["mirror world"],
  future_henesys:           ["future henesys", "future victoria"],
  kritias:                  ["kritias"],
  tynerum:                  ["tynerum"],
  black_heaven:             ["black heaven"],
  cernium:                  ["cernium", "burning cernium"],
  hotel_arcus:              ["hotel arcus"],
  odium:                    ["odium"],
  reverse_city:             ["reverse city", "tenebris"],
};

// Monster name keyword -> emoji portrait, used when the API monster has no image.
const NAME_EMOJI_MAP: Array<[string, string]> = [
  ["mushmom", "\u{1F344}"], ["mushroom", "\u{1F344}"], ["mushroom","\u{1F344}"],
  ["snail", "\u{1F40C}"],
  ["slime", "\u{1F7E2}"], ["boogie", "\u{1F7E2}"],
  ["wyvern", "\u{1F409}"], ["dragon", "\u{1F409}"], ["drake", "\u{1F409}"],
  ["bat", "\u{1F987}"],
  ["zombie", "\u{1F9DF}"],
  ["golem", "\u{1F5FF}"], ["stump", "\u{1FAB5}"],
  ["boar", "\u{1F417}"], ["pig", "\u{1F437}"],
  ["rat", "\u{1F400}"], ["mouse", "\u{1F401}"],
  ["lizard", "\u{1F98E}"], ["reptile", "\u{1F98E}"],
  ["balrog", "\u{1F608}"], ["demon", "\u{1F608}"], ["dark", "\u{1F311}"],
  ["eye", "\u{1F441}\u{FE0F}"],
  ["ghost", "\u{1F47B}"], ["specter", "\u{1F47B}"], ["spirit", "\u{1F47B}"],
  ["cactus", "\u{1F335}"], ["sand", "\u{1F3DC}\u{FE0F}"],
  ["panda", "\u{1F43C}"], ["bear", "\u{1F43B}"],
  ["penguin", "\u{1F427}"],
  ["yeti", "\u{1F9A3}"],
  ["shark", "\u{1F988}"], ["fish", "\u{1F420}"],
  ["fox", "\u{1F98A}"], ["crow", "\u{1F426}"], ["bird", "\u{1F985}"], ["harp", "\u{1F985}"],
  ["robot", "\u{1F916}"], ["android", "\u{1F916}"], ["mech", "\u{1F916}"],
  ["alien", "\u{1F47D}"], ["gray", "\u{1F47D}"],
  ["fairy", "\u{2728}"], ["wisp", "\u{2728}"], ["sprite", "\u{2728}"],
  ["scorpion", "\u{1F982}"], ["crab", "\u{1F980}"],
  ["knight", "\u{2694}\u{FE0F}"], ["soldier", "\u{2694}\u{FE0F}"], ["warrior", "\u{2694}\u{FE0F}"],
  ["skeleton", "\u{1F480}"], ["bone", "\u{1F480}"], ["skull", "\u{1F480}"],
  ["ice", "\u{2744}\u{FE0F}"], ["snow", "\u{2744}\u{FE0F}"], ["frost", "\u{2744}\u{FE0F}"],
  ["fire", "\u{1F525}"], ["flame", "\u{1F525}"], ["lava", "\u{1F30B}"],
  ["void", "\u{2B1B}"], ["shadow", "\u{1F311}"], ["nightmare", "\u{1F311}"],
  ["clock", "\u{1F570}\u{FE0F}"], ["time", "\u{23F3}"], ["chrono", "\u{23F3}"],
  ["goat", "\u{1F410}"], ["tiger", "\u{1F405}"], ["wolf", "\u{1F43A}"],
  ["pepe", "\u{1F427}"], ["hector", "\u{1F43A}"],
  ["seal", "\u{1F9AD}"],
  ["chimera", "\u{1F432}"], ["mutant", "\u{1F9EB}"],
  ["pirate", "\u{1F3F4}\u{200D}\u{2620}\u{FE0F}"], ["bandit", "\u{1F977}"],
  ["stone", "\u{1FA97}"],
];

function enrichApiPortrait(monster: DatabaseMonster): DatabaseMonster {
  // If the portrait looks like a proper emoji (multi-char or single unicode emoji) keep it.
  // API monsters have portraits like "Bl" (first 2 chars of name) — replace those.
  const p = (monster.portrait ?? "").trim();
  const isGoodPortrait = p.length === 0 || /\p{Emoji}/u.test(p);
  if (isGoodPortrait && p.length > 0) return monster;
  if (monster.isBoss) return { ...monster, portrait: "\u{1F451}" };
  const nameLower = monster.name.toLowerCase();
  for (const [keyword, emoji] of NAME_EMOJI_MAP) {
    if (nameLower.includes(keyword)) return { ...monster, portrait: emoji };
  }
  return { ...monster, portrait: "\u{1F47E}" };
}

function selectFromPool(pool: DatabaseMonster[]): DatabaseMonster[] {
  const sorted = pool.slice().sort((a, b) => a.level - b.level);
  const bosses = sorted.filter((m) => m.isBoss).slice(0, 1);
  const normals = sorted.filter((m) => !m.isBoss);
  const step = Math.max(1, Math.floor(normals.length / 6));
  const picked = normals.filter((_, i) => i % step === 0).slice(0, 6);
  return [...picked, ...bosses].slice(0, 8).map(enrichApiPortrait);
}

// Enrich an authored monster with a real image URL from the API feed by name matching.
function enrichWithApiImage(monster: DatabaseMonster, apiMonsters: DatabaseMonster[]): DatabaseMonster {
  if (monster.image || !apiMonsters.length) return monster;
  const nl = monster.name.toLowerCase();

  // 1. Exact name match.
  const exact = apiMonsters.find(m => m.image && m.name.toLowerCase() === nl);
  if (exact) return { ...monster, image: exact.image };

  // 2. Substring match (e.g. "Blue Snail" inside "Mutant Blue Snail" or vice-versa).
  const sub = apiMonsters.find(m => {
    if (!m.image) return false;
    const ml = m.name.toLowerCase();
    return ml.includes(nl) || nl.includes(ml);
  });
  if (sub) return { ...monster, image: sub.image };

  // 3. Significant word overlap (e.g. "Angry Mushroom Guard" vs "Horny Mushroom").
  const words = nl.split(/\s+/).filter(w => w.length >= 4);
  if (words.length) {
    const wordHit = apiMonsters.find(m => {
      if (!m.image) return false;
      const ml = m.name.toLowerCase();
      return words.some(w => ml.includes(w));
    });
    if (wordHit) return { ...monster, image: wordHit.image };
  }

  return monster;
}

// Enrich a pool of authored monsters with API images.
function enrichPool(pool: DatabaseMonster[], apiMonsters: DatabaseMonster[]): DatabaseMonster[] {
  if (!apiMonsters.length) return pool;
  return pool.map(m => enrichWithApiImage(m, apiMonsters));
}

export function getZoneMonsters(zone: WorldZone, monsters: DatabaseMonster[]): DatabaseMonster[] {
  // Always return the authored zone pool, enriched with API images where possible.
  // This guarantees every zone has UNIQUE monsters designed for that zone.
  const authored = getMonstersByMap(zone.id).map(toDatabaseMonster);
  if (authored.length) return enrichPool(authored, monsters);

  // Fallback for zones not in authored system: API keyword → level band → closest.
  if (monsters.length) {
    const normalize = (v: string | undefined) => (v ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    const keywords = ZONE_API_KEYWORDS[zone.id];
    if (keywords?.length) {
      const kwMatched = monsters.filter((m) =>
        (m.locations ?? []).some((loc) => {
          const locRegion = normalize(loc.region);
          const locMap    = normalize(loc.map);
          return keywords.some((kw) => locRegion.includes(kw) || locMap.includes(kw));
        })
      );
      if (kwMatched.length >= 3) return selectFromPool(kwMatched);
    }
    const band = ZONE_LEVEL_TARGETS[zone.id];
    if (band) {
      const inBand = monsters.filter((m) => m.level >= band[0] && m.level <= band[1]);
      if (inBand.length >= 3) return selectFromPool(inBand);
    }
    const target = (ZONE_LEVEL_TARGETS[zone.id] ?? [zone.requirement * 4, zone.requirement * 8])
      .reduce((a, b) => a + b, 0) / 2;
    return monsters
      .slice()
      .sort((a, b) => Math.abs(a.level - target) - Math.abs(b.level - target))
      .slice(0, 8)
      .map(enrichApiPortrait);
  }
  return [];
}

export function getCurrentMonster(
  state: IdleGameState,
  zone: WorldZone,
  monsters: DatabaseMonster[]
): DatabaseMonster | null {
  // Use the stage-specific authored monster — guarantees a DIFFERENT monster per zone
  // and distinct bosses / elites per map.  Enrich with API image where available.
  const stageMonster = getStageMonsterByMap(zone.id, state.stage);
  if (stageMonster) {
    const base = toDatabaseMonster(stageMonster);
    return monsters.length ? enrichWithApiImage(base, monsters) : base;
  }

  // Fallback: use getZoneMonsters pool (covers any unrecognised zone).
  const pool = getZoneMonsters(zone, monsters);
  if (!pool.length) return null;
  const encounterType = getEncounterTypeForStage(state.stage);
  const boss     = pool.find((m) => m.isBoss);
  const regulars = pool.filter((m) => !m.isBoss);
  const elite    = regulars[regulars.length - 1] ?? boss ?? pool[0] ?? null;
  const normals  = regulars.slice(0, Math.max(1, regulars.length - 1));
  if (encounterType === "boss")  return boss  ?? elite;
  if (encounterType === "elite") return elite;
  return normals[(getStageInMap(state.stage) - 1) % Math.max(1, normals.length)] ?? elite;
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

