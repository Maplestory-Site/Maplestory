/**
 * IdleStory World — Game Engine
 *
 * Core state shape, save/load, tick orchestration, and all action functions.
 * Pure functions only — zero React imports. Designed for future multiplayer
 * by keeping state fully serialisable and operations referentially transparent.
 */

import {
  applyXpGain,
  calculateDPS,
  GEAR,
  getFamePerSecond,
  getGearCost,
  getHeroCost,
  getMonsterXpReward,
  getMesosPerSecond,
  getSkillCost,
  getUpgradeCost,
  HEROES,
  SKILLS,
  UPGRADES
} from "./progressionSystem";
import { computeCombatTick, getEnemyMaxHp } from "./combatSystem";
import { tickResource } from "./classSystem";
import { activateSkill as activateClassSkillCore, tickCooldownsAndBuffs, getActiveRegenMult, type ActiveBuff } from "./skillSystem";
import {
  applySoftCapFactor,
  getCrystalsFromBossKill,
  getCrystalLuckMult,
  getGoldSoftCap,
  getGlobalMultCost,
  tryBuyGlobalMult
} from "./economySystem";
import {
  calcBossMesosSpike,
  calcBossFameSpike,
  calcEliteMesosSpike,
  getProgressionMultiplier,
  getZonePowerRequirement
} from "./progressionGates";
import {
  getNewPlayerDpsMult,
  getNewPlayerXpMult,
  getNewPlayerMesosMult
} from "./tutorialSystem";
import { BOSS_SURGE_SECONDS } from "./powerSpikeSystem";
import {
  getTalentXpMult,
  getTalentCrystalMult,
  getTalentBuyResult,
  TALENT_POINTS_PER_PRESTIGE,
  TALENT_POINTS_PER_REBIRTH,
  type TalentNodeId
} from "./talentSystem";
import {
  canPrestige,
  canRebirth,
  calculatePrestigeCrystalCarry,
  calculatePrestigeHeroBonus,
  calculateRelicsEarned,
  getRebirthMomentumGold,
  getRelicUpgradeCost,
  tryBuyRelicUpgrade
} from "./rebirthSystem";
import {
  applyRetentionProgress,
  DEFAULT_ACHIEVEMENTS,
  DEFAULT_DAILY_REWARD,
  DEFAULT_MISSIONS,
  syncLoginRetention,
  type AchievementState,
  type DailyRewardState,
  type GameNotification,
  type MissionProgress
} from "./retentionSystem";
import {
  DEFAULT_AI_STATE,
  DEFAULT_PLAYER_BEHAVIOR,
  getSmartSkillRecommendation,
  refreshAiState,
  tickBehavior,
  trackPlayerAction,
  type AiState,
  type PlayerBehaviorState
} from "./aiSystem";
import { addLootToInventory, autoEquipBestItems, equipItem, enhanceInventoryItem, normalizeEquipment, unequipItem } from "./inventorySystem";
import { generateLootDrops } from "./lootSystem";
import { EMPTY_EQUIPMENT, type EquippedItems, type IdleItemInstance, type IdleItemType } from "./itemSystem";
import { applyPartyHeroXp } from "./heroSystem";
import { getBossByMap, getEliteByMap, getStageMonsterByMap } from "./monsterSystem";
export {
  ACHIEVEMENT_DEFINITIONS,
  MISSION_DEFINITIONS,
  claimDailyReward,
  claimMissionReward,
  getClaimableMissionIds,
  getCompletedAchievementCount,
  getRetentionSummary,
  getUnreadNotificationCount,
  isDailyRewardAvailable,
  markNotificationsRead,
  syncLoginRetention,
  type AchievementId,
  type MissionId,
  type NotificationKind
} from "./retentionSystem";
export {
  getAdaptiveDifficultyMultiplier,
  getSmartSkillRecommendation,
  getUpgradeRecommendations,
  trackPlayerAction,
  type AiState,
  type PlayerBehaviorState,
  type PlayerActionType,
  type UpgradeRecommendation
} from "./aiSystem";
export type { EquippedItems, IdleItemInstance, IdleItemRarity, IdleItemStats, IdleItemType } from "./itemSystem";
export { getItemPower } from "./itemSystem";
export { calculateTotalEquipmentStats, getSetBonusStats } from "./inventorySystem";

// ─── Shared types ────────────────────────────────────────────────────────────

export type HeroId = "snailguard" | "mage" | "archer" | "ironwall" | "pyromancer" | "falconer";
export type UpgradeId = "market" | "forge" | "guild";
export type GearId = "weapon" | "armor" | "charm";
export type SkillId = "slash" | "meteor" | "blessing";

/** The three playable classes. */
export type ClassId = "warrior" | "mage" | "archer";

/** Crystal-bought global multipliers that persist through prestige (reset on rebirth). */
export type GlobalMultId = "gold_income" | "dps_amp" | "xp_boost" | "crystal_luck";

/** Permanent relic upgrades — never reset under any condition. */
export type RelicUpgradeId = "gold_mastery" | "dps_mastery" | "crystal_mastery" | "rebirth_momentum" | "relic_echo";

export type { TalentNodeId } from "./talentSystem";

/**
 * Active skill IDs — one skill tree per class (3 skills each).
 * Distinct from `SkillId` which are passive training upgrades.
 */
export type ClassSkillId =
  | "battle_cry" | "shield_wall" | "execute"   // Warrior
  | "fireball"   | "arcane_nova" | "mana_surge" // Mage
  | "rapid_fire" | "snipe"       | "shadow_step"; // Archer

// Re-export ActiveBuff so callers only need one import
export type { ActiveBuff } from "./skillSystem";

export type DatabaseMap = {
  id: string;
  mapId?: number;
  name: string;
  streetName?: string;
  region?: string;
  image?: string;
  imageMedium?: string;
  imageLarge?: string;
};

export type DatabaseMonster = {
  id: string;
  name: string;
  image: string | null;
  portrait: string;
  level: number;
  hp: number;
  farmingScore?: number;
  isBoss?: boolean;
  drops?: Array<{ name: string; rarity: string; kind: string }>;
  dropTable?: Array<{ name: string; rarity: string; kind: string; weight?: number }>;
  dropChance?: number;
  locations?: Array<{ region: string; map: string }>;
};

export type DatabaseItem = {
  id: string;
  name: string;
  image: string | null;
  type: string;
  rarity: string;
  level: number | null;
  sourceMonsters: string[];
};

export type WorldZone = {
  id: string;
  name: string;
  region: string;
  requirement: number;
  rewardBoost: number;
  color: string;
  image?: string;
};

/**
 * Full serialisable game state.
 * All numeric values use plain numbers (no BigInt) for JSON compat.
 */
export type IdleGameState = {
  // Resources
  mesos: number;
  crystals: number;
  fame: number;

  // Progression
  level: number;
  xp: number;
  prestigeCount: number;

  // Heroes & upgrades
  heroLevels: Record<HeroId, number>;
  heroXp: Record<HeroId, number>;
  upgrades: Record<UpgradeId, number>;
  gearLevels: Record<GearId, number>;
  skillLevels: Record<SkillId, number>;
  inventory: IdleItemInstance[];
  equipment: EquippedItems;
  lastLootDrops: IdleItemInstance[];

  // World
  zone: string;
  stage: number; // 1-based; boss every 10th stage

  // Combat — current enemy
  enemyHp: number;
  enemyMaxHp: number;

  // Class system
  classId: ClassId | null;
  /** Mana (Mage) or Rage (Warrior / Archer). */
  resource: number;
  /** Remaining cooldown per active skill (seconds). Key = ClassSkillId string. */
  skillCooldowns: Record<string, number>;
  /** Currently active temporary buffs. */
  activeBuffs: ActiveBuff[];

  // Economy: third currency
  relics: number;
  /** Lifetime gold earned — used for relic calculation; never resets. */
  totalGoldEarned: number;

  // Rebirth system
  rebirthCount: number;
  /** Crystal-tier multipliers — persist through prestige, reset on rebirth. */
  globalMults: Record<GlobalMultId, number>;
  /** Permanent relic upgrades — never reset under any condition. */
  relicUpgrades: Record<RelicUpgradeId, number>;

  // Persistence
  lastSavedAt: number;
  totalPlayTime: number;

  // Retention
  dailyReward: DailyRewardState;
  achievements: AchievementState;
  missions: MissionProgress;
  notifications: GameNotification[];
  lifetimeKills: number;
  lifetimeBossKills: number;

  // AI systems
  ai: AiState;
  behavior: PlayerBehaviorState;

  // Power spike system
  /**
   * Seconds remaining on the boss-kill DPS surge (counts down in gameTick).
   * While > 0, calculateDPS applies BOSS_SURGE_DPS_MULT (×2).
   */
  bossSurgeSecondsLeft: number;

  // Meta progression — talent tree (NEVER reset under any condition)
  /** Unspent talent points available to spend in the talent tree. */
  talentPoints: number;
  /** Set of unlocked talent node IDs. Persists through prestige AND rebirth. */
  talentNodes: Partial<Record<TalentNodeId, boolean>>;
};

/**
 * Runtime context supplied by the React layer (API data).
 * Engine functions accept this so they stay pure / testable.
 */
export type GameContext = {
  zone: WorldZone;
  monster: DatabaseMonster | null;
  lootCount: number;
  /** DPS multiplier applied during boss fights (0–1). Default 1.0 = no reduction. */
  bossDpsMultiplier?: number;
  /**
   * Progression gate multiplier (0.01–1.0) — reduces effective DPS when player
   * is underpowered for the current zone. Computed from getProgressionMultiplier().
   * Default 1.0 = no reduction.
   */
  progressionMultiplier?: number;
};

export type ActionResult = {
  state: IdleGameState;
  message: string;
  success: boolean;
};

type BestPurchaseTarget<TId extends string> = {
  id: TId;
  cost: number;
};

// ─── Constants ───────────────────────────────────────────────────────────────

const STORAGE_KEY = "snailslayer-idlestory-world";

/** Maximum offline accumulation: 8 hours */
const MAX_OFFLINE_SECONDS = 60 * 60 * 8;

export const FALLBACK_ZONES: WorldZone[] = [
  { id: "henesys", name: "Henesys Field", region: "Victoria Island", requirement: 1, rewardBoost: 1.0, color: "#7ee3b2" },
  { id: "ellinia", name: "Ellinia Canopy", region: "Victoria Island", requirement: 4, rewardBoost: 1.35, color: "#93f0ff" },
  { id: "perion", name: "Perion Ridge", region: "Victoria Island", requirement: 8, rewardBoost: 1.75, color: "#ffb168" },
  { id: "ludibrium", name: "Ludibrium Clocktower", region: "Ludus Lake", requirement: 13, rewardBoost: 2.25, color: "#d8a4ff" }
];

export const DEFAULT_STATE: IdleGameState = {
  mesos: 280,
  crystals: 0,
  fame: 0,
  level: 1,
  xp: 0,
  prestigeCount: 0,
  heroLevels: { snailguard: 1, mage: 0, archer: 0, ironwall: 0, pyromancer: 0, falconer: 0 },
  heroXp: { snailguard: 0, mage: 0, archer: 0, ironwall: 0, pyromancer: 0, falconer: 0 },
  upgrades: { market: 0, forge: 0, guild: 0 },
  gearLevels: { weapon: 0, armor: 0, charm: 0 },
  skillLevels: { slash: 0, meteor: 0, blessing: 0 },
  inventory: [],
  equipment: EMPTY_EQUIPMENT,
  lastLootDrops: [],
  zone: "henesys",
  stage: 1,
  // Henesys stage 1: getZoneBaseHp({ requirement:1 }) = 80 + 1*40 = 120
  enemyHp: 120,
  enemyMaxHp: 120,
  classId: null,
  resource: 0,
  skillCooldowns: {},
  activeBuffs: [],
  relics: 0,
  totalGoldEarned: 0,
  rebirthCount: 0,
  globalMults: { gold_income: 0, dps_amp: 0, xp_boost: 0, crystal_luck: 0 },
  relicUpgrades: { gold_mastery: 0, dps_mastery: 0, crystal_mastery: 0, rebirth_momentum: 0, relic_echo: 0 },
  lastSavedAt: 0,
  totalPlayTime: 0,
  dailyReward: DEFAULT_DAILY_REWARD,
  achievements: DEFAULT_ACHIEVEMENTS,
  missions: DEFAULT_MISSIONS,
  notifications: [],
  lifetimeKills: 0,
  lifetimeBossKills: 0,
  ai: DEFAULT_AI_STATE,
  behavior: DEFAULT_PLAYER_BEHAVIOR,
  bossSurgeSecondsLeft: 0,
  talentPoints: 0,
  talentNodes: {}
};

// ─── Save / Load ─────────────────────────────────────────────────────────────

export function loadGameState(): IdleGameState {
  if (typeof window === "undefined") return refreshAiState(syncLoginRetention({ ...DEFAULT_STATE, lastSavedAt: Date.now() }));
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return refreshAiState(syncLoginRetention({ ...DEFAULT_STATE, lastSavedAt: Date.now() }));
    const parsed = JSON.parse(raw) as Partial<IdleGameState>;
    const loaded: IdleGameState = {
      ...DEFAULT_STATE,
      ...parsed,
      heroLevels: { ...DEFAULT_STATE.heroLevels, ...parsed.heroLevels },
      heroXp: { ...DEFAULT_STATE.heroXp, ...parsed.heroXp },
      upgrades: { ...DEFAULT_STATE.upgrades, ...parsed.upgrades },
      gearLevels: { ...DEFAULT_STATE.gearLevels, ...parsed.gearLevels },
      skillLevels: { ...DEFAULT_STATE.skillLevels, ...parsed.skillLevels },
      inventory: Array.isArray(parsed.inventory) ? parsed.inventory : [],
      equipment: normalizeEquipment(parsed.equipment),
      lastLootDrops: Array.isArray(parsed.lastLootDrops) ? parsed.lastLootDrops : [],
      classId: (parsed.classId as ClassId) ?? null,
      resource: Number(parsed.resource) || 0,
      skillCooldowns: parsed.skillCooldowns ?? {},
      activeBuffs: parsed.activeBuffs ?? [],
      relics: Number(parsed.relics) || 0,
      totalGoldEarned: Number(parsed.totalGoldEarned) || 0,
      rebirthCount: Number(parsed.rebirthCount) || 0,
      globalMults: { ...DEFAULT_STATE.globalMults, ...parsed.globalMults },
      relicUpgrades: { ...DEFAULT_STATE.relicUpgrades, ...parsed.relicUpgrades },
      lastSavedAt: Number(parsed.lastSavedAt) || Date.now(),
      totalPlayTime: Number(parsed.totalPlayTime) || 0,
      prestigeCount: Number(parsed.prestigeCount) || 0,
      stage: Number(parsed.stage) || 1,
      dailyReward: { ...DEFAULT_DAILY_REWARD, ...parsed.dailyReward },
      achievements: { ...DEFAULT_ACHIEVEMENTS, ...parsed.achievements },
      missions: { ...DEFAULT_MISSIONS, ...parsed.missions },
      notifications: Array.isArray(parsed.notifications) ? parsed.notifications : [],
      lifetimeKills: Number(parsed.lifetimeKills) || 0,
      lifetimeBossKills: Number(parsed.lifetimeBossKills) || 0,
      ai: { ...DEFAULT_AI_STATE, ...parsed.ai },
      behavior: { ...DEFAULT_PLAYER_BEHAVIOR, ...parsed.behavior },
      // Boss surge doesn't persist across sessions (it's a short-lived buff)
      bossSurgeSecondsLeft: 0,
      // Talent tree — permanent, carry forward always
      talentPoints: Number(parsed.talentPoints) || 0,
      talentNodes: { ...DEFAULT_STATE.talentNodes, ...(parsed.talentNodes ?? {}) }
    };

    return refreshAiState(syncLoginRetention(loaded));
  } catch {
    return refreshAiState(syncLoginRetention({ ...DEFAULT_STATE, lastSavedAt: Date.now() }));
  }
}

export function saveGameState(state: IdleGameState): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, lastSavedAt: Date.now() }));
}

// ─── Zone helpers ─────────────────────────────────────────────────────────────

export function buildZones(maps: DatabaseMap[], maxMaps = 5): WorldZone[] {
  if (!maps.length) return FALLBACK_ZONES;
  return maps.slice(0, maxMaps).map((map, index) => ({
    id: map.id || String(map.mapId ?? index),
    name: map.name,
    region: map.region || map.streetName || "Maple World",
    requirement: 1 + index * 3,
    rewardBoost: 1 + index * 0.18,
    color: (["#7ee3b2", "#93f0ff", "#ffb168", "#d8a4ff", "#ffd36b", "#7ca8ff"] as const)[index % 6],
    image: map.imageLarge || map.imageMedium || map.image
  }));
}

export function getActiveZone(state: IdleGameState, zones: WorldZone[]): WorldZone {
  return zones.find((zone) => zone.id === state.zone) ?? zones[0] ?? FALLBACK_ZONES[0];
}

// ─── Core tick ───────────────────────────────────────────────────────────────

/**
 * Advances game state by `deltaSeconds`.
 * Pure — no side effects, no I/O.
 *
 * The function:
 * 1. Applies DPS damage to the current enemy; handles multi-kill if DPS is high.
 * 2. Earns mesos, XP, fame per second.
 * 3. Levels up the player when XP threshold is crossed.
 */
export function gameTick(
  state: IdleGameState,
  deltaSeconds: number,
  context: GameContext
): IdleGameState {
  const safeSeconds = Math.min(Math.max(deltaSeconds, 0), MAX_OFFLINE_SECONDS);
  if (!safeSeconds) return state;

  // ── Cooldowns & buffs ─────────────────────────────────────────────────────
  const { skillCooldowns, activeBuffs } = tickCooldownsAndBuffs(
    state.skillCooldowns,
    state.activeBuffs,
    safeSeconds
  );
  const stateWithBuffs = { ...state, skillCooldowns, activeBuffs };

  // ── Resource regen ────────────────────────────────────────────────────────
  const regenMult = getActiveRegenMult(activeBuffs);
  const resource = stateWithBuffs.classId
    ? tickResource(stateWithBuffs.resource, stateWithBuffs.classId, safeSeconds, regenMult)
    : 0;
  const stateWithResource: IdleGameState = { ...stateWithBuffs, resource };
  let aiReadyState = stateWithResource;
  const smartSkillId = stateWithResource.ai.autoSkillEnabled
    ? getSmartSkillRecommendation(stateWithResource)
    : null;
  if (smartSkillId) {
    const skillResult = activateClassSkillCore(stateWithResource, smartSkillId, calculateDPS(stateWithResource));
    if (skillResult.success) {
      aiReadyState = {
        ...skillResult.state,
        ai: {
          ...skillResult.state.ai,
          lastAutoSkillAt: Date.now(),
          lastAutoSkillId: smartSkillId
        }
      };
    }
  }

  // ── Combat — combined DPS multiplier ─────────────────────────────────────
  // Boss mechanics, progression gates, and new-player boost all multiply.
  const zonePowerReq    = getZonePowerRequirement(context.zone);
  const playerDps       = calculateDPS(aiReadyState);
  const autoProgMult    = context.progressionMultiplier
    ?? getProgressionMultiplier(playerDps, zonePowerReq);
  const newPlayerDpsMult = getNewPlayerDpsMult(aiReadyState.totalPlayTime);
  const combinedDpsMult  = (context.bossDpsMultiplier ?? 1.0) * autoProgMult * newPlayerDpsMult;

  const { newState: combatState, kills, bossesKilled, eliteKills } = computeCombatTick(
    aiReadyState, context.zone, safeSeconds, combinedDpsMult
  );
  const normalKills = Math.max(0, kills - eliteKills - bossesKilled);
  const normalRewardMonster = getStageMonsterByMap(context.zone.id, 1) ?? undefined;
  const eliteRewardMonster = getEliteByMap(context.zone.id) ?? undefined;
  const bossRewardMonster = getBossByMap(context.zone.id) ?? undefined;

  // ── Resources ─────────────────────────────────────────────────────────────
  const crystalLuck = getCrystalLuckMult(combatState.globalMults);
  const goldSoftCap = getGoldSoftCap(combatState.prestigeCount, combatState.rebirthCount);
  const capFactor   = applySoftCapFactor(combatState.mesos, goldSoftCap);

  const newPlayerMesosMult = getNewPlayerMesosMult(combatState.totalPlayTime);
  const rawMesosGain   = getMesosPerSecond(combatState, context.zone, context.monster, context.lootCount) * safeSeconds
    * newPlayerMesosMult;
  const mesosPerSecond = rawMesosGain / safeSeconds;
  const mesosGain  = rawMesosGain * capFactor;
  const baseKillMesos =
    normalKills * (normalRewardMonster?.goldReward ?? (18 + combatState.stage * 4)) +
    eliteKills * (eliteRewardMonster?.goldReward ?? (54 + combatState.stage * 12)) +
    bossesKilled * (bossRewardMonster?.goldReward ?? (180 + combatState.stage * 40));
  const killMesos  = baseKillMesos * context.zone.rewardBoost * capFactor;
  const fameGain   = getFamePerSecond(combatState, context.monster) * safeSeconds;
  const bossFame   = bossesKilled * (8 + combatState.prestigeCount * 2);

  // Crystals from boss kills (hard capped, respects crystal luck and talent bonus)
  const talentCrystalMult = getTalentCrystalMult(combatState.talentNodes ?? {});
  const bossCrystals = bossesKilled > 0
    ? getCrystalsFromBossKill(combatState.stage, crystalLuck, combatState.crystals) * bossesKilled * talentCrystalMult
    : 0;

  // XP — scaled by zone boost, stage progression, and global xp multiplier
  const xpBoostMult = 1 + combatState.globalMults.xp_boost * 0.18;
  const newPlayerXpMult = getNewPlayerXpMult(combatState.totalPlayTime);
  const talentXpMult   = getTalentXpMult(combatState.talentNodes ?? {});
  const normalXpGain   = getMonsterXpReward("normal", combatState.level, context.zone.requirement, combatState.stage, normalRewardMonster) * normalKills;
  const eliteXpGain    = getMonsterXpReward("elite", combatState.level, context.zone.requirement, combatState.stage, eliteRewardMonster) * eliteKills;
  const bossXpGain     = getMonsterXpReward("boss", combatState.level, context.zone.requirement, combatState.stage, bossRewardMonster) * bossesKilled;

  // ── Boss reward spikes ────────────────────────────────────────────────────
  const bossMesosBonus = bossesKilled > 0
    ? calcBossMesosSpike(mesosPerSecond, context.zone.rewardBoost, combatState.stage) * bossesKilled * capFactor
    : 0;
  const bossFameBonus  = bossesKilled > 0
    ? calcBossFameSpike(context.zone.rewardBoost, combatState.stage, combatState.prestigeCount) * bossesKilled
    : 0;

  // ── Elite reward spikes ───────────────────────────────────────────────────
  const eliteMesosBonus = eliteKills > 0
    ? calcEliteMesosSpike(mesosPerSecond, context.zone.rewardBoost) * eliteKills * capFactor
    : 0;

  const totalXpGain    = (normalXpGain + eliteXpGain + bossXpGain) * context.zone.rewardBoost * xpBoostMult * newPlayerXpMult * talentXpMult;
  const totalMesosGain = mesosGain + killMesos + bossMesosBonus + eliteMesosBonus;
  const totalFameGain  = fameGain + bossFame + bossFameBonus;

  const { level, xp, crystalsEarned } = applyXpGain(combatState.level, combatState.xp, totalXpGain);
  const heroProgress = applyPartyHeroXp(combatState.heroLevels, combatState.heroXp, totalXpGain * 0.35);

  const goldGained = totalMesosGain;
  const lootDrops = generateLootDrops({
    monster: context.monster,
    zoneIndex: Math.max(1, context.zone.requirement),
    playerLevel: combatState.level,
    stage: combatState.stage,
    normalKills,
    eliteKills,
    bossKills: bossesKilled
  });
  const combatStateWithLoot = addLootToInventory(combatState, lootDrops);

  // ── Boss surge tick-down + refresh ───────────────────────────────────────
  const surgeBase    = combatState.bossSurgeSecondsLeft ?? 0;
  const surgeTickedDown = Math.max(0, surgeBase - safeSeconds);
  // A new boss kill refreshes (or extends) the surge to its full duration
  const newBossSurge = bossesKilled > 0
    ? Math.max(surgeTickedDown, BOSS_SURGE_SECONDS)
    : surgeTickedDown;

  const next: IdleGameState = {
    ...combatStateWithLoot,
    mesos: combatStateWithLoot.mesos + totalMesosGain,
    fame: combatStateWithLoot.fame + totalFameGain,
    level,
    xp,
    heroLevels: heroProgress.heroLevels,
    heroXp: heroProgress.heroXp,
    crystals: Math.min(500, combatStateWithLoot.crystals + crystalsEarned + bossCrystals),
    totalGoldEarned: combatStateWithLoot.totalGoldEarned + goldGained,
    totalPlayTime: combatStateWithLoot.totalPlayTime + safeSeconds,
    bossSurgeSecondsLeft: newBossSurge
  };

  return refreshAiState(tickBehavior(applyRetentionProgress(next, { kills, bossKills: bossesKilled }), safeSeconds));
}

/**
 * Applies accumulated offline time since `state.lastSavedAt`.
 * Call once after the database is loaded so rewards use real zone/monster data.
 */
export function calculateOfflineGains(state: IdleGameState, context: GameContext, now = Date.now()): IdleGameState {
  const elapsed = Math.min((now - state.lastSavedAt) / 1000, MAX_OFFLINE_SECONDS);
  if (elapsed < 1) return state;
  return gameTick(state, elapsed, context);
}

export function equipLootItem(state: IdleGameState, itemId: string): ActionResult {
  return equipItem(trackPlayerAction(state, "gear"), itemId);
}

export function unequipLootItem(state: IdleGameState, type: IdleItemType): ActionResult {
  return unequipItem(trackPlayerAction(state, "gear"), type);
}

export function autoEquipBestLoot(state: IdleGameState): ActionResult {
  return autoEquipBestItems(trackPlayerAction(state, "gear"));
}

export function enhanceLootItem(state: IdleGameState, itemId: string): ActionResult {
  return enhanceInventoryItem(trackPlayerAction(state, "gear"), itemId);
}

// ─── Action functions ─────────────────────────────────────────────────────────
// All return ActionResult so the React layer can display feedback without
// knowing any game logic.

/**
 * Select or reselect a class.
 * Resets resource to 0 and clears all cooldowns/buffs.
 * Does not reset hero/gear/skill investments.
 */
export function selectClass(state: IdleGameState, classId: ClassId): ActionResult {
  return {
    state: trackPlayerAction({
      ...state,
      classId,
      resource: 0,
      skillCooldowns: {},
      activeBuffs: []
    }, "class"),
    message: `Class set to ${classId.charAt(0).toUpperCase() + classId.slice(1)}. Skills unlocked.`,
    success: true
  };
}

export function activateClassSkill(
  state: IdleGameState,
  skillId: ClassSkillId,
  currentDps: number
): ActionResult {
  const result = activateClassSkillCore(state, skillId, currentDps);
  if (!result.success) return result;
  return {
    ...result,
    state: trackPlayerAction(result.state, "skill")
  };
}

export function buyHero(
  state: IdleGameState,
  heroId: HeroId,
  heroName: string,
  cost: number
): ActionResult {
  if (state.mesos < cost) {
    return { state, message: "Need more mesos before recruiting this hero.", success: false };
  }
  const nextLevel = state.heroLevels[heroId] + 1;
  return {
    state: trackPlayerAction({
      ...state,
      mesos: state.mesos - cost,
      heroLevels: { ...state.heroLevels, [heroId]: nextLevel }
    }, "upgrade"),
    message: `${heroName} upgraded to Lv.${nextLevel}.`,
    success: true
  };
}

export function buyUpgrade(
  state: IdleGameState,
  upgradeId: UpgradeId,
  upgradeName: string,
  cost: number
): ActionResult {
  if (state.mesos < cost) {
    return { state, message: "The town needs more mesos for that upgrade.", success: false };
  }
  return {
    state: trackPlayerAction({
      ...state,
      mesos: state.mesos - cost,
      upgrades: { ...state.upgrades, [upgradeId]: state.upgrades[upgradeId] + 1 }
    }, "upgrade"),
    message: `${upgradeName} upgraded.`,
    success: true
  };
}

export function buyGear(
  state: IdleGameState,
  gearId: GearId,
  gearName: string,
  cost: number
): ActionResult {
  if (state.mesos < cost) {
    return { state, message: "Need more mesos before upgrading this gear.", success: false };
  }
  const nextLevel = state.gearLevels[gearId] + 1;
  return {
    state: trackPlayerAction({
      ...state,
      mesos: state.mesos - cost,
      gearLevels: { ...state.gearLevels, [gearId]: nextLevel }
    }, "upgrade"),
    message: `${gearName} upgraded to Lv.${nextLevel}.`,
    success: true
  };
}

export function trainSkill(
  state: IdleGameState,
  skillId: SkillId,
  skillName: string,
  cost: number
): ActionResult {
  if (state.fame < cost) {
    return { state, message: "Need more fame before training this skill.", success: false };
  }
  const nextLevel = state.skillLevels[skillId] + 1;
  return {
    state: trackPlayerAction({
      ...state,
      fame: state.fame - cost,
      skillLevels: { ...state.skillLevels, [skillId]: nextLevel }
    }, "upgrade"),
    message: `${skillName} trained to Lv.${nextLevel}.`,
    success: true
  };
}

function findCheapestAffordable<TId extends string>(
  ids: TId[],
  getCost: (id: TId) => number,
  canBuy: (cost: number) => boolean
): BestPurchaseTarget<TId> | null {
  return ids
    .map((id) => ({ id, cost: getCost(id) }))
    .sort((left, right) => left.cost - right.cost)
    .find((target) => canBuy(target.cost)) ?? null;
}

/**
 * Boss-kill reward: upgrades the cheapest hero for free (no mesos cost).
 * Called from the React layer when `lifetimeBossKills` increases.
 * Picks the hero with the lowest current upgrade cost, regardless of affordability.
 */
export function claimBossKillFreeUpgrade(state: IdleGameState): ActionResult {
  const cheapest = (Object.keys(HEROES) as HeroId[])
    .map(id => ({ id, cost: getHeroCost(id, state.heroLevels[id]) }))
    .sort((a, b) => a.cost - b.cost)[0];
  if (!cheapest) return { state, message: "No hero to upgrade.", success: false };
  const nextLevel = state.heroLevels[cheapest.id] + 1;
  return {
    state: trackPlayerAction({
      ...state,
      heroLevels: { ...state.heroLevels, [cheapest.id]: nextLevel }
    }, "upgrade"),
    message: `💥 Boss Reward: ${HEROES[cheapest.id].name} upgraded to Lv.${nextLevel} for FREE!`,
    success: true
  };
}

export function buyBestHero(state: IdleGameState): ActionResult {
  const target = findCheapestAffordable(
    Object.keys(HEROES) as HeroId[],
    (id) => getHeroCost(id, state.heroLevels[id]),
    (cost) => state.mesos >= cost
  );
  if (!target) return { state, message: "No hero upgrade affordable yet.", success: false };
  return buyHero(state, target.id, HEROES[target.id].name, target.cost);
}

export function buyBestUpgrade(state: IdleGameState): ActionResult {
  const target = findCheapestAffordable(
    Object.keys(UPGRADES) as UpgradeId[],
    (id) => getUpgradeCost(id, state.upgrades[id]),
    (cost) => state.mesos >= cost
  );
  if (!target) return { state, message: "No upgrade affordable yet.", success: false };
  return buyUpgrade(state, target.id, UPGRADES[target.id].name, target.cost);
}

export function buyBestGear(state: IdleGameState): ActionResult {
  const target = findCheapestAffordable(
    Object.keys(GEAR) as GearId[],
    (id) => getGearCost(id, state.gearLevels[id]),
    (cost) => state.mesos >= cost
  );
  if (!target) return { state, message: "No gear upgrade affordable yet.", success: false };
  return buyGear(state, target.id, GEAR[target.id].name, target.cost);
}

export function trainBestSkill(state: IdleGameState): ActionResult {
  const target = findCheapestAffordable(
    Object.keys(SKILLS) as SkillId[],
    (id) => getSkillCost(id, state.skillLevels[id]),
    (cost) => state.fame >= cost
  );
  if (!target) return { state, message: "No skill affordable yet.", success: false };
  return trainSkill(state, target.id, SKILLS[target.id].name, target.cost);
}

export function changeZone(
  state: IdleGameState,
  zone: WorldZone
): ActionResult {
  if (state.level < zone.requirement) {
    return {
      state,
      message: `Reach level ${zone.requirement} to unlock ${zone.name}.`,
      success: false
    };
  }
  // Entering a new zone resets to stage 1 with a fresh enemy
  const enemyMaxHp = getEnemyMaxHp(1, zone);
  return {
    state: { ...state, zone: zone.id, stage: 1, enemyHp: enemyMaxHp, enemyMaxHp },
    message: `${zone.name} selected.`,
    success: true
  };
}

/**
 * Hunt burst — instantly awards 18 + level seconds of combat progress.
 */
export function huntBurst(state: IdleGameState, context: GameContext): ActionResult {
  const burstSeconds = 18 + state.level;
  const next = gameTick(trackPlayerAction(state, "hunt"), burstSeconds, context);
  return {
    state: next,
    message: `${context.monster?.name ?? "Monster"} hunt in ${context.zone.name}: +${formatNumber(next.mesos - state.mesos)} mesos.`,
    success: true
  };
}

/**
 * Raid boss — deals a large burst of damage directly to the current enemy
 * (most useful when a boss is active on a ×10 stage).
 */
export function raidBoss(
  state: IdleGameState,
  zone: WorldZone,
  bossName: string,
  calculateDPS: (s: IdleGameState) => number
): ActionResult {
  const dps = calculateDPS(state);
  const burstDamage = Math.round(dps * (24 + state.level * 1.8));
  const newHp = Math.max(0, state.enemyHp - burstDamage);

  if (newHp > 0) {
    return {
      state: trackPlayerAction({ ...state, enemyHp: newHp }, "raid"),
      message: `${bossName} hit for ${formatNumber(burstDamage)} damage. (${formatNumber(newHp)} HP left)`,
      success: true
    };
  }

  // Boss killed — advance stage and award loot
  const nextStage = state.stage + 1;
  const rewardMesos = 900 + state.level * 140 + dps * 35;
  const rewardCrystals = 2 + Math.floor(state.level / 8);
  const newEnemyMaxHp = getEnemyMaxHp(nextStage, zone);
  const next = refreshAiState(trackPlayerAction(applyRetentionProgress({
      ...state,
      stage: nextStage,
      enemyHp: newEnemyMaxHp,
      enemyMaxHp: newEnemyMaxHp,
      mesos: state.mesos + rewardMesos,
      crystals: state.crystals + rewardCrystals,
      fame: state.fame + 12
    }, { kills: 1, bossKills: 1 }), "raid"));

  return {
    state: next,
    message: `${bossName} cleared: +${formatNumber(rewardMesos)} mesos, +${rewardCrystals} crystals. Stage ${nextStage}!`,
    success: true
  };
}

/** Soft prestige reset — keeps crystals (50 %), fame, class, and global multipliers. */
export function prestigeWorld(
  state: IdleGameState,
  zones: WorldZone[]
): ActionResult {
  if (!canPrestige(state)) {
    return { state, message: `Need ${8} crystals to prestige (have ${Math.floor(state.crystals)}).`, success: false };
  }

  const crystalCarry = calculatePrestigeCrystalCarry(state.crystals);
  const heroBonus    = calculatePrestigeHeroBonus(crystalCarry);
  const startGold    = getRebirthMomentumGold(state.relicUpgrades);
  const firstZone    = zones[0] ?? FALLBACK_ZONES[0];
  const enemyMaxHp   = getEnemyMaxHp(1, firstZone);
  const nextPrestige = state.prestigeCount + 1;

  const next: IdleGameState = {
    ...DEFAULT_STATE,
    // Carry over
    fame: state.fame + state.level * 4,
    classId: state.classId,
    relics: state.relics,
    relicUpgrades: state.relicUpgrades,   // permanent
    globalMults: state.globalMults,       // persist through prestige
    totalGoldEarned: state.totalGoldEarned,
    rebirthCount: state.rebirthCount,
    totalPlayTime: state.totalPlayTime,
    prestigeCount: nextPrestige,
    dailyReward: state.dailyReward,
    achievements: state.achievements,
    missions: state.missions,
    notifications: state.notifications,
    lifetimeKills: state.lifetimeKills,
    lifetimeBossKills: state.lifetimeBossKills,
    ai: state.ai,
    behavior: state.behavior,
    // Talent tree — permanent, always carry forward + award points
    talentNodes: state.talentNodes,
    talentPoints: (state.talentPoints ?? 0) + TALENT_POINTS_PER_PRESTIGE,
    // Starting bonuses
    mesos: startGold,
    crystals: crystalCarry,
    heroLevels: { snailguard: 1 + heroBonus, mage: 0, archer: 0, ironwall: 0, pyromancer: 0, falconer: 0 },
    heroXp: DEFAULT_STATE.heroXp,
    gearLevels: { weapon: Math.min(heroBonus, 3), armor: 0, charm: 0 },
    skillLevels: { slash: Math.min(heroBonus, 3), meteor: 0, blessing: 0 },
    zone: firstZone.id,
    stage: 1,
    enemyHp: enemyMaxHp,
    enemyMaxHp,
    lastSavedAt: Date.now()
  };

  return {
    state: trackPlayerAction(refreshAiState(next), "prestige"),
    message: `Prestige ×${nextPrestige}! Carried ${crystalCarry} crystals. Snailguard starts at Lv.${1 + heroBonus}.`,
    success: true
  };
}

/**
 * Hard rebirth reset — resets everything except relics and relic upgrades.
 * Awards relics based on run performance.
 */
export function rebirthWorld(
  state: IdleGameState,
  zones: WorldZone[]
): ActionResult {
  if (!canRebirth(state)) {
    const parts: string[] = [];
    if (state.level < 50)         parts.push(`level ${state.level}/50`);
    if (state.crystals < 100)     parts.push(`${Math.floor(state.crystals)}/100 crystals`);
    return { state, message: `Rebirth requires: ${parts.join(", ")}.`, success: false };
  }

  const relicsEarned = calculateRelicsEarned(state);
  const startGold    = getRebirthMomentumGold(state.relicUpgrades);
  const firstZone    = zones[0] ?? FALLBACK_ZONES[0];
  const enemyMaxHp   = getEnemyMaxHp(1, firstZone);

  const next: IdleGameState = {
    ...DEFAULT_STATE,
    // Only permanents survive rebirth
    relics: state.relics + relicsEarned,
    relicUpgrades: state.relicUpgrades,
    totalGoldEarned: state.totalGoldEarned,
    rebirthCount: state.rebirthCount + 1,
    totalPlayTime: state.totalPlayTime,
    dailyReward: state.dailyReward,
    achievements: state.achievements,
    missions: state.missions,
    // Talent tree — permanent, always carry forward + award points
    talentNodes: state.talentNodes,
    talentPoints: (state.talentPoints ?? 0) + TALENT_POINTS_PER_REBIRTH,
    notifications: state.notifications,
    lifetimeKills: state.lifetimeKills,
    lifetimeBossKills: state.lifetimeBossKills,
    ai: state.ai,
    behavior: state.behavior,
    // Starting gold from Rebirth Momentum relic
    mesos: startGold,
    zone: firstZone.id,
    stage: 1,
    enemyHp: enemyMaxHp,
    enemyMaxHp,
    lastSavedAt: Date.now()
  };

  return {
    state: trackPlayerAction(refreshAiState(applyRetentionProgress(next)), "rebirth"),
    message: `Rebirth ×${next.rebirthCount}! Earned ${relicsEarned} relics (total ${next.relics}). All progress reset.`,
    success: true
  };
}

/** Buy one level of a crystal-funded global multiplier. */
export function buyGlobalMult(
  state: IdleGameState,
  multId: GlobalMultId
): ActionResult {
  const check = tryBuyGlobalMult(state, multId);
  if (!check.success) return { state, message: check.message, success: false };

  return {
    state: trackPlayerAction({
      ...state,
      crystals: state.crystals - check.cost,
      globalMults: { ...state.globalMults, [multId]: check.nextLevel }
    }, "upgrade"),
    message: check.message,
    success: true
  };
}

/** Buy one level of a relic-funded permanent upgrade. */
export function upgradeRelic(
  state: IdleGameState,
  upgradeId: RelicUpgradeId
): ActionResult {
  const check = tryBuyRelicUpgrade(state, upgradeId);
  if (!check.success) return { state, message: check.message, success: false };

  return {
    state: trackPlayerAction({
      ...state,
      relics: state.relics - check.cost,
      relicUpgrades: { ...state.relicUpgrades, [upgradeId]: check.nextLevel }
    }, "upgrade"),
    message: check.message,
    success: true
  };
}

/** Spend talent points to unlock a talent node. */
export function buyTalent(state: IdleGameState, nodeId: TalentNodeId): ActionResult {
  const result = getTalentBuyResult(
    nodeId,
    state.talentNodes ?? {},
    state.talentPoints ?? 0,
    state.prestigeCount,
    state.rebirthCount
  );
  if (!result.success) return { state, message: result.message, success: false };

  return {
    state: trackPlayerAction({
      ...state,
      talentPoints: (state.talentPoints ?? 0) - result.cost,
      talentNodes: { ...(state.talentNodes ?? {}), [nodeId]: true }
    }, "upgrade"),
    message: result.message,
    success: true
  };
}

// Suppress unused-import warnings — these are re-exported for callers
void getGlobalMultCost;
void getRelicUpgradeCost;

// ─── UI helpers ───────────────────────────────────────────────────────────────

export function formatNumber(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}m`;
  if (value >= 1_000) return `${(value / 1000).toFixed(1)}k`;
  return Math.floor(value).toLocaleString();
}

export function getCostHint(mesos: number, cost: number): string {
  return mesos >= cost ? "Ready" : `${formatNumber(cost - mesos)} short`;
}
