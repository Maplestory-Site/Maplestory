/**
 * IdleStory World — Game Engine (barrel / entry point)
 *
 * This file is the public surface of the engine. Implementation is split across:
 *   - gameTypes.ts          — all shared type definitions
 *   - stateNormalization.ts — DEFAULT_STATE, parseAndNormalize, buildFreshState
 *   - tickEngine.ts         — gameTick, calculateOfflineGains, huntBurst, raidBoss
 *   - gameActions.ts        — all purchase, train, change, select, claim actions
 *   - resetActions.ts       — prestigeWorld, rebirthWorld
 *
 * All historical exports are preserved here for backward compatibility.
 */

import {
  writeSave,
  readSaveRaw,
  stashCorruptedPayload,
  exportSaveToString,
  importSaveFromString
} from "./persistence";
import { buildFreshState, parseAndNormalize, FALLBACK_ZONES } from "./stateNormalization";
import type { IdleGameState, DatabaseMap, WorldZone } from "./gameTypes";

// ─── Subsystem re-exports ─────────────────────────────────────────────────────

export type { WorldEvent } from "./eventSystem";
export type { MicroMission, MicroMissionReward } from "./microMissionSystem";
export { initMicroMissions, getMissionProgressPct } from "./microMissionSystem";
export {
  ACHIEVEMENT_DEFINITIONS,
  MISSION_DEFINITIONS,
  DAILY_REWARD_CYCLE,
  claimDailyReward,
  claimComebackReward,
  claimMissionReward,
  getClaimableMissionIds,
  getCompletedAchievementCount,
  getRetentionSummary,
  getUnreadNotificationCount,
  isDailyRewardAvailable,
  markNotificationsRead,
  syncLoginRetention,
  type AchievementId,
  type DailyChallengeProgress,
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
export type {
  CraftMaterialId,
  CraftingMaterials,
  CraftRecipeDefinition,
  CraftRecipeId,
  EquippedItems,
  IdleItemInstance,
  IdleItemRarity,
  IdleItemStats,
  IdleItemType,
  RerollMode
} from "./itemSystem";
export {
  EMPTY_CRAFTING_MATERIALS,
  getCraftRecipeDefinition,
  getCraftRecipeDefinitions,
  getEnhanceCost,
  getItemPower,
  getRerollCost,
  getSalvageYield
} from "./itemSystem";
export { calculateTotalEquipmentStats, getSetBonusStats } from "./inventorySystem";
export type { ActiveSetBonusState, SetBonusTierState } from "./inventorySystem";
export { getActiveSetBonuses } from "./inventorySystem";
export type { ItemSetDefinition, ItemSetId, ItemSetTheme } from "./setSystem";
export { getItemSetDefinition, getItemSetDefinitions } from "./setSystem";
export type { GuildState } from "./guildSystem";
export { DEFAULT_GUILD_STATE, getGuildPassiveBonuses, syncGuildState } from "./guildSystem";
export type {
  LeaderboardCategory,
  LeaderboardEntry,
  LeaderboardState,
  WeeklyRankingEntry,
  WeeklyRankingState
} from "./leaderboardSystem";
export {
  LEADERBOARD_CATEGORIES,
  canClaimWeeklyReward,
  createDefaultWeeklyRankingState,
  getCurrentWeekKey,
  getWeeklyRewardForRank,
  setWeeklyResolvedRank
} from "./leaderboardSystem";
export type { PvpState, ShadowSnapshot, ShadowBattleResult } from "./pvpSystem";
export { createShadowSnapshot } from "./pvpSystem";
export type {
  ActiveMonetizationBoost,
  DailyDeal,
  MonetizationOfferId,
  RewardedAdPlacement,
  SeasonPassTier,
  SeasonPassTrack,
  ShopOfferDef,
  ShopState
} from "./shopSystem";
export {
  DEFAULT_SHOP_STATE,
  PREMIUM_CURRENCY_LABEL,
  REWARDED_AD_COOLDOWNS,
  SEASON_PASS_TIERS,
  SHOP_OFFERS,
  getAdCooldownRemaining,
  getClaimableSeasonPassTiers,
  getPremiumTrackProgress,
  getShopBoostMultipliers,
  syncMonetizationState,
  syncShopState
} from "./shopSystem";
export type { ActiveBuff } from "./skillSystem";
export type { BuildFocusId, SkillBranchId } from "./skillBuildSystem";
export type { CollectionBonuses, CollectionEntry, CollectionProgress, CollectionState } from "./collectionSystem";
export {
  getCollectionBonuses,
  getItemCollectionProgress,
  getMonsterCollectionProgress,
  getTotalCollectibleItemCount,
  getTotalCollectibleMonsterCount
} from "./collectionSystem";

// ─── Core types (re-exported from gameTypes.ts) ───────────────────────────────

export type {
  ActionResult,
  ClassId,
  ClassSkillId,
  DatabaseItem,
  DatabaseMap,
  DatabaseMonster,
  EngagementObjective,
  EngagementObjectiveType,
  EngagementPulse,
  GameContext,
  GearId,
  GlobalMultId,
  HeroId,
  IdleGameState,
  RelicUpgradeId,
  SkillId,
  UpgradeId,
  WorldZone
} from "./gameTypes";
export type { TalentNodeId } from "./talentSystem";

// ─── State normalization ──────────────────────────────────────────────────────

export {
  DEFAULT_STATE,
  FALLBACK_ZONES,
  buildFreshState,
  createEngagementObjective,
  parseAndNormalize,
  formatNumber,
  getCostHint
} from "./stateNormalization";

// ─── Storage key ──────────────────────────────────────────────────────────────

export { STORAGE_KEY } from "./persistence";
export type { SaveResult } from "./persistence";

// ─── Save / Load ──────────────────────────────────────────────────────────────

export function loadGameState(): IdleGameState {
  if (typeof window === "undefined") return buildFreshState();

  const { primary, backup } = readSaveRaw();

  // 1. Try primary slot.
  if (primary) {
    const result = parseAndNormalize(primary);
    if (result) return result;
    // Primary is corrupt — stash it so a dev can inspect, then try backup.
    stashCorruptedPayload(primary);
  }

  // 2. Fallback to backup slot.
  if (backup) {
    const result = parseAndNormalize(backup);
    if (result) return result;
  }

  // 3. Both slots failed — return fresh state.
  return buildFreshState();
}

export type LocalSaveStatus = {
  hasValidSave: boolean;
  source: "primary" | "backup" | null;
  lastSavedAt: number | null;
  level: number | null;
  stage: number | null;
};

function emptyLocalSaveStatus(): LocalSaveStatus {
  return {
    hasValidSave: false,
    source: null,
    lastSavedAt: null,
    level: null,
    stage: null
  };
}

function getStatusFromState(state: IdleGameState, source: "primary" | "backup"): LocalSaveStatus {
  return {
    hasValidSave: true,
    source,
    lastSavedAt: Number.isFinite(state.lastSavedAt) ? state.lastSavedAt : null,
    level: Number.isFinite(state.level) ? state.level : null,
    stage: Number.isFinite(state.stage) ? state.stage : null
  };
}

export function getLocalSaveStatus(): LocalSaveStatus {
  if (typeof window === "undefined") return emptyLocalSaveStatus();

  const { primary, backup } = readSaveRaw();
  const primaryState = primary ? parseAndNormalize(primary) : null;
  if (primaryState) return getStatusFromState(primaryState, "primary");

  const backupState = backup ? parseAndNormalize(backup) : null;
  if (backupState) return getStatusFromState(backupState, "backup");

  return emptyLocalSaveStatus();
}

/**
 * Persist state to localStorage.
 * Automatically backs up the previous save before overwriting.
 * Returns a SaveResult so callers can surface a non-blocking warning on failure.
 */
export function saveGameState(state: IdleGameState): import("./persistence").SaveResult {
  if (typeof window === "undefined") return { ok: true };
  return writeSave(state);
}

/**
 * Encode the current state to a portable base64 string for manual backup.
 */
export function exportSave(state: IdleGameState): string {
  return exportSaveToString(state);
}

/**
 * Decode and normalize an exported save string.
 * Returns the restored state, or null if the string is invalid.
 */
export function importSave(encoded: string): IdleGameState | null {
  const json = importSaveFromString(encoded);
  if (!json) return null;
  return parseAndNormalize(json);
}

// ─── Zone helpers ─────────────────────────────────────────────────────────────

export function buildZones(maps: DatabaseMap[], maxMaps = Number.POSITIVE_INFINITY): WorldZone[] {
  if (!maps.length) return FALLBACK_ZONES;
  return maps.slice(0, maxMaps).map((map, index) => {
    const levelStep = index <= 3 ? 3 : index <= 9 ? 4 : 5;
    const requirement = index === 0 ? 1 : Math.max(1, Math.round(1 + index * levelStep));
    const rewardBoost = Number((1 + index * 0.14 + Math.max(0, index - 8) * 0.03).toFixed(2));
    return {
      id: map.id || String(map.mapId ?? index),
      name: map.name,
      region: map.region || map.streetName || "Maple World",
      requirement,
      rewardBoost,
      color: (["#7ee3b2", "#93f0ff", "#ffb168", "#d8a4ff", "#ffd36b", "#7ca8ff"] as const)[index % 6],
      image: map.imageLarge || map.imageMedium || map.image
    };
  });
}

export function getActiveZone(state: IdleGameState, zones: WorldZone[]): WorldZone {
  return zones.find((zone) => zone.id === state.zone) ?? zones[0] ?? FALLBACK_ZONES[0];
}

// ─── Action functions (from extracted modules) ────────────────────────────────

export {
  activateClassSkill,
  autoEquipBestLoot,
  buyBestGear,
  buyBestHero,
  buyBestUpgrade,
  buyGear,
  buyGlobalMult,
  buyHero,
  buyShopOffer,
  buyTalent,
  buyUpgrade,
  changeZone,
  claimBossKillFreeUpgrade,
  claimMicroMissionReward,
  claimSeasonPassTier,
  claimWeeklyPveReward,
  craftLootRecipe,
  enhanceLootItem,
  equipLootItem,
  rerollLootItem,
  resolveShadowBattle,
  salvageLootItem,
  selectClass,
  setBuildFocus,
  setSkillBranchChoice,
  startDungeon,
  trainBestSkill,
  trainSkill,
  unequipLootItem,
  updateSocialRanks,
  upgradeRelic,
  watchRewardedAd
} from "./gameActions";

export {
  prestigeWorld,
  rebirthWorld
} from "./resetActions";

export {
  calculateOfflineGains,
  gameTick,
  huntBurst,
  raidBoss
} from "./tickEngine";

// ─── Economy helpers re-exported for callers ──────────────────────────────────

export { getGlobalMultCost } from "./economySystem";
export { getRelicUpgradeCost } from "./rebirthSystem";
