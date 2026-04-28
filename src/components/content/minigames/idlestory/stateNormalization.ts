/**
 * IdleStory World — state normalization, DEFAULT_STATE, and engagement helpers.
 *
 * Extracted from gameEngine.ts to keep that file manageable.
 * All exports here are re-exported through gameEngine.ts for backward compat.
 */

import {
  refreshAiState,
  DEFAULT_AI_STATE,
  DEFAULT_PLAYER_BEHAVIOR
} from "./aiSystem";
import {
  DEFAULT_ACHIEVEMENTS,
  DEFAULT_COMEBACK_REWARD,
  DEFAULT_DAILY_CHALLENGES,
  DEFAULT_DAILY_REWARD,
  DEFAULT_MISSIONS,
  DEFAULT_WEEKLY_GOAL,
  syncLoginRetention
} from "./retentionSystem";
import {
  EMPTY_CRAFTING_MATERIALS,
  EMPTY_EQUIPMENT,
  normalizeCraftingMaterials,
  normalizeItemArray,
  type CraftMaterialId,
  type IdleItemInstance
} from "./itemSystem";
import { normalizeEquipment } from "./inventorySystem";
import { getDefaultBuildFocus } from "./skillBuildSystem";
import { DEFAULT_GUILD_STATE, syncGuildState } from "./guildSystem";
import {
  createDefaultWeeklyRankingState,
  DEFAULT_LEADERBOARD_STATE
} from "./leaderboardSystem";
import { DEFAULT_PVP_STATE } from "./pvpSystem";
import { DEFAULT_SHOP_STATE, syncMonetizationState, syncShopState } from "./shopSystem";
import { DEFAULT_COLLECTION_STATE } from "./collectionSystem";
import { DEFAULT_REPLAYABILITY_STATE, syncReplayabilityState } from "./replayabilitySystem";
import { DEFAULT_DUNGEON_STATE, syncDungeonState, type DungeonType } from "./dungeonSystem";
import type {
  ClassId,
  EngagementObjective,
  EngagementObjectiveType,
  GlobalMultId,
  IdleGameState,
  WorldZone
} from "./gameTypes";

// ─── UI helpers (pure, no deps — kept here to avoid circular imports) ────────

export function formatNumber(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}m`;
  if (value >= 1_000) return `${(value / 1000).toFixed(1)}k`;
  return Math.floor(value).toLocaleString();
}

export function getCostHint(mesos: number, cost: number): string {
  return mesos >= cost ? "Ready" : `${formatNumber(cost - mesos)} short`;
}

// ─── Shared helpers (also used by tickEngine.ts / gameActions.ts) ─────────────

export function clampNumber(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function getMomentumTierFromStreak(streak: number): number {
  return clampNumber(Math.floor(streak / 20), 0, 5);
}

export function softenMultiplier(multiplier: number, effectiveness: number): number {
  const safeMultiplier = Math.max(0, multiplier);
  const safeEffectiveness = clampNumber(effectiveness, 0, 1);
  return 1 + (safeMultiplier - 1) * safeEffectiveness;
}

// ─── Constants ────────────────────────────────────────────────────────────────

/** Maximum offline accumulation: 8 hours */
export const MAX_OFFLINE_SECONDS = 60 * 60 * 8;

export const FALLBACK_ZONES: WorldZone[] = [
  { id: "henesys", name: "Henesys Field",        region: "Victoria Island", requirement: 1,  rewardBoost: 1.0,  color: "#7ee3b2" },
  { id: "ellinia", name: "Ellinia Canopy",        region: "Victoria Island", requirement: 4,  rewardBoost: 1.14, color: "#93f0ff" },
  { id: "perion",  name: "Perion Ridge",          region: "Victoria Island", requirement: 8,  rewardBoost: 1.26, color: "#ffb168" },
  { id: "ludibrium", name: "Ludibrium Clocktower", region: "Ludus Lake",     requirement: 13, rewardBoost: 1.4,  color: "#d8a4ff" }
];

// ─── Engagement objective factory ─────────────────────────────────────────────

export function createEngagementObjective(level: number, stage: number, completions: number): EngagementObjective {
  const objectivePool: EngagementObjectiveType[] = ["kills", "crits", "gold", "boss"];
  const rotationIndex = (Math.max(1, level) + Math.max(1, stage) + completions) % objectivePool.length;
  const type = objectivePool[rotationIndex];
  const tier = clampNumber(Math.floor((Math.max(1, level) - 1) / 10), 0, 12);

  if (type === "kills") {
    const target = 40 + tier * 10;
    return {
      id: `obj-kills-${completions + 1}`,
      type,
      label: `Defeat ${target} enemies`,
      progress: 0,
      target,
      rewardMesos: 100 + tier * 40,
      rewardXp: 10 + tier * 4,
      rewardCrystals: tier >= 10 ? 1 : 0
    };
  }
  if (type === "crits") {
    const target = 20 + tier * 4;
    return {
      id: `obj-crits-${completions + 1}`,
      type,
      label: `Land ${target} critical hits`,
      progress: 0,
      target,
      rewardMesos: 95 + tier * 38,
      rewardXp: 12 + tier * 4,
      rewardCrystals: tier >= 11 ? 1 : 0
    };
  }
  if (type === "boss") {
    const target = 2 + Math.floor((tier + 1) / 2);
    return {
      id: `obj-boss-${completions + 1}`,
      type,
      label: `Defeat ${target} bosses`,
      progress: 0,
      target,
      rewardMesos: 160 + tier * 62,
      rewardXp: 18 + tier * 6,
      rewardCrystals: tier >= 10 ? 1 + Math.floor(tier / 12) : 0
    };
  }
  const targetGold = 7600 + tier * 3000;
  return {
    id: `obj-gold-${completions + 1}`,
    type,
    label: `Gain ${targetGold.toLocaleString()} mesos`,
    progress: 0,
    target: targetGold,
    rewardMesos: 125 + tier * 48,
    rewardXp: 12 + tier * 5,
    rewardCrystals: tier >= 11 ? 1 : 0
  };
}

// ─── Default state ────────────────────────────────────────────────────────────

export const DEFAULT_STATE: IdleGameState = {
  mesos: 70, // Early pacing: keeps first Snailguard upgrade in the 20-35s target window.
  crystals: 0,
  fame: 0,
  materials: EMPTY_CRAFTING_MATERIALS,
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
  buildFocus: "speed",
  skillBranches: {},
  relics: 0,
  totalGoldEarned: 0,
  rebirthCount: 0,
  globalMults: { gold_income: 0, dps_amp: 0, xp_boost: 0, crystal_luck: 0 },
  relicUpgrades: { gold_mastery: 0, dps_mastery: 0, crystal_mastery: 0, rebirth_momentum: 0, relic_echo: 0 },
  lastSavedAt: 0,
  totalPlayTime: 0,
  dailyReward: DEFAULT_DAILY_REWARD,
  dailyChallenges: DEFAULT_DAILY_CHALLENGES,
  weeklyGoal: DEFAULT_WEEKLY_GOAL,
  comebackReward: DEFAULT_COMEBACK_REWARD,
  achievements: DEFAULT_ACHIEVEMENTS,
  missions: DEFAULT_MISSIONS,
  notifications: [],
  lifetimeKills: 0,
  lifetimeBossKills: 0,
  collection: DEFAULT_COLLECTION_STATE,
  replayability: DEFAULT_REPLAYABILITY_STATE,
  shop: DEFAULT_SHOP_STATE,
  ai: DEFAULT_AI_STATE,
  behavior: DEFAULT_PLAYER_BEHAVIOR,
  guildState: DEFAULT_GUILD_STATE,
  leaderboardState: DEFAULT_LEADERBOARD_STATE,
  weeklyRankingState: createDefaultWeeklyRankingState(),
  pvpState: DEFAULT_PVP_STATE,
  bossSurgeSecondsLeft: 0,
  talentPoints: 0,
  talentNodes: {},
  activeEvents: [],
  nextEventAt: 0,
  microMissions: [],
  dungeonState: DEFAULT_DUNGEON_STATE,
  killStreak: 0,
  bestKillStreak: 0,
  streakWindowLeft: 0,
  activeObjective: createEngagementObjective(1, 1, 0),
  objectiveCompletions: 0,
  engagementPulse: null,
  engagementPulseSeq: 0
};

// ─── State building / parsing ─────────────────────────────────────────────────

export function buildFreshState(): IdleGameState {
  return refreshAiState(syncLoginRetention(syncMonetizationState({ ...DEFAULT_STATE, lastSavedAt: Date.now() })));
}

export function parseAndNormalize(raw: string): IdleGameState | null {
  try {
    const parsed = JSON.parse(raw) as Partial<IdleGameState>;
    const loaded: IdleGameState = {
      ...DEFAULT_STATE,
      ...parsed,
      heroLevels: { ...DEFAULT_STATE.heroLevels, ...parsed.heroLevels },
      heroXp: { ...DEFAULT_STATE.heroXp, ...parsed.heroXp },
      upgrades: { ...DEFAULT_STATE.upgrades, ...parsed.upgrades },
      gearLevels: { ...DEFAULT_STATE.gearLevels, ...parsed.gearLevels },
      skillLevels: { ...DEFAULT_STATE.skillLevels, ...parsed.skillLevels },
      inventory: Array.isArray(parsed.inventory) ? normalizeItemArray(parsed.inventory as IdleItemInstance[]) : [],
      equipment: normalizeEquipment(parsed.equipment),
      lastLootDrops: Array.isArray(parsed.lastLootDrops) ? normalizeItemArray(parsed.lastLootDrops as IdleItemInstance[]) : [],
      classId: (parsed.classId as ClassId) ?? null,
      resource: Number(parsed.resource) || 0,
      skillCooldowns: parsed.skillCooldowns ?? {},
      activeBuffs: parsed.activeBuffs ?? [],
      buildFocus: parsed.buildFocus ?? getDefaultBuildFocus((parsed.classId as ClassId) ?? null),
      skillBranches: parsed.skillBranches ?? {},
      relics: Number(parsed.relics) || 0,
      totalGoldEarned: Number(parsed.totalGoldEarned) || 0,
      rebirthCount: Number(parsed.rebirthCount) || 0,
      globalMults: (Object.fromEntries(
        (Object.keys(DEFAULT_STATE.globalMults) as GlobalMultId[]).map((key) => {
          const rawVal = (parsed.globalMults as Record<string, unknown>)?.[key];
          const v = Math.floor(Number(rawVal) || 0);
          return [key, Number.isFinite(v) && v >= 0 ? Math.min(1000, v) : 0];
        })
      ) as Record<GlobalMultId, number>),
      relicUpgrades: { ...DEFAULT_STATE.relicUpgrades, ...parsed.relicUpgrades },
      lastSavedAt: Number(parsed.lastSavedAt) || Date.now(),
      totalPlayTime: Number(parsed.totalPlayTime) || 0,
      prestigeCount: Number(parsed.prestigeCount) || 0,
      stage: Number(parsed.stage) || 1,
      materials: normalizeCraftingMaterials((parsed as { materials?: Partial<Record<CraftMaterialId, number>> }).materials),
      dailyReward: { ...DEFAULT_DAILY_REWARD, ...parsed.dailyReward },
      dailyChallenges: {
        ...DEFAULT_DAILY_CHALLENGES,
        ...(parsed.dailyChallenges ?? {}),
        challenges: Array.isArray(parsed.dailyChallenges?.challenges)
          ? parsed.dailyChallenges.challenges
          : []
      },
      weeklyGoal: {
        ...DEFAULT_WEEKLY_GOAL,
        ...(parsed.weeklyGoal ?? {}),
        milestoneClaims: Array.isArray(parsed.weeklyGoal?.milestoneClaims)
          ? parsed.weeklyGoal.milestoneClaims.filter((value) => Number.isFinite(value)).map((value) => Math.max(0, Math.floor(value)))
          : []
      },
      comebackReward: {
        ...DEFAULT_COMEBACK_REWARD,
        ...(parsed.comebackReward ?? {}),
        reward: parsed.comebackReward?.reward
          ? {
              mesos: Math.max(0, Math.floor(Number(parsed.comebackReward.reward.mesos) || 0)),
              fame: Math.max(0, Math.floor(Number(parsed.comebackReward.reward.fame) || 0)),
              crystals: Math.max(0, Math.floor(Number(parsed.comebackReward.reward.crystals) || 0))
            }
          : null
      },
      achievements: { ...DEFAULT_ACHIEVEMENTS, ...parsed.achievements },
      missions: { ...DEFAULT_MISSIONS, ...parsed.missions },
      notifications: Array.isArray(parsed.notifications) ? parsed.notifications : [],
      lifetimeKills: Number(parsed.lifetimeKills) || 0,
      lifetimeBossKills: Number(parsed.lifetimeBossKills) || 0,
      collection: {
        monsters: parsed.collection?.monsters ?? {},
        items: parsed.collection?.items ?? {}
      },
      replayability: syncReplayabilityState(parsed.replayability),
      shop: syncShopState({
        ...DEFAULT_SHOP_STATE,
        ...(parsed.shop ?? {}),
        rewardedAds: {
          ...DEFAULT_SHOP_STATE.rewardedAds,
          ...((parsed.shop ?? {}).rewardedAds ?? {})
        },
        seasonPass: {
          ...DEFAULT_SHOP_STATE.seasonPass,
          ...((parsed.shop ?? {}).seasonPass ?? {})
        }
      }),
      ai: { ...DEFAULT_AI_STATE, ...parsed.ai },
      behavior: { ...DEFAULT_PLAYER_BEHAVIOR, ...parsed.behavior },
      guildState: syncGuildState(DEFAULT_GUILD_STATE, parsed.guildState),
      leaderboardState: {
        ...DEFAULT_LEADERBOARD_STATE,
        ...parsed.leaderboardState,
        currentRanks: {
          ...DEFAULT_LEADERBOARD_STATE.currentRanks,
          ...(parsed.leaderboardState?.currentRanks ?? {})
        }
      },
      weeklyRankingState: {
        ...createDefaultWeeklyRankingState(),
        ...parsed.weeklyRankingState,
        claimedWeeks: Array.isArray(parsed.weeklyRankingState?.claimedWeeks)
          ? parsed.weeklyRankingState.claimedWeeks
          : []
      },
      pvpState: {
        ...DEFAULT_PVP_STATE,
        ...parsed.pvpState,
        lastResults: Array.isArray(parsed.pvpState?.lastResults)
          ? parsed.pvpState.lastResults
          : []
      },
      dungeonState: syncDungeonState({
        ...DEFAULT_DUNGEON_STATE,
        ...(parsed.dungeonState ?? {}),
        dailyRunsUsed: {
          ...DEFAULT_DUNGEON_STATE.dailyRunsUsed,
          ...(parsed.dungeonState?.dailyRunsUsed ?? {})
        }
      }),
      // Boss surge doesn't persist across sessions (it's a short-lived buff)
      bossSurgeSecondsLeft: 0,
      // Talent tree — permanent, carry forward always
      talentPoints: Number(parsed.talentPoints) || 0,
      talentNodes: { ...DEFAULT_STATE.talentNodes, ...(parsed.talentNodes ?? {}) },
      // Events & micro missions — safe defaults on migration
      activeEvents: [],   // never persist active events across sessions
      nextEventAt:  Number(parsed.nextEventAt) || 0,
      microMissions: Array.isArray(parsed.microMissions) ? parsed.microMissions : [],
      killStreak: Math.max(0, Number(parsed.killStreak) || 0),
      bestKillStreak: Math.max(0, Number(parsed.bestKillStreak) || 0),
      streakWindowLeft: Math.max(0, Number(parsed.streakWindowLeft) || 0),
      activeObjective: parsed.activeObjective
        ? {
            ...createEngagementObjective(
              Number(parsed.level) || DEFAULT_STATE.level,
              Number(parsed.stage) || DEFAULT_STATE.stage,
              Number(parsed.objectiveCompletions) || 0
            ),
            ...parsed.activeObjective
          }
        : createEngagementObjective(
            Number(parsed.level) || DEFAULT_STATE.level,
            Number(parsed.stage) || DEFAULT_STATE.stage,
            Number(parsed.objectiveCompletions) || 0
          ),
      objectiveCompletions: Math.max(0, Number(parsed.objectiveCompletions) || 0),
      engagementPulse: parsed.engagementPulse ?? null,
      engagementPulseSeq: Math.max(0, Number(parsed.engagementPulseSeq) || 0)
    };
    const safeLevel = Math.max(1, Math.floor(Number(loaded.level) || DEFAULT_STATE.level));
    const safeStage = Math.max(1, Math.floor(Number(loaded.stage) || DEFAULT_STATE.stage));
    const safeEnemyMaxHp = Math.max(1, Math.floor(Number(loaded.enemyMaxHp) || DEFAULT_STATE.enemyMaxHp));
    const safeEnemyHp = clampNumber(
      Math.floor(Number(loaded.enemyHp) || safeEnemyMaxHp),
      0,
      safeEnemyMaxHp
    );
    const safeRun = loaded.dungeonState.activeRun
      ? (() => {
          const run = loaded.dungeonState.activeRun;
          const safeTotalWaves = Math.max(1, Math.floor(Number(run.totalWaves) || 1));
          const safeWave = clampNumber(Math.floor(Number(run.wave) || 1), 1, safeTotalWaves);
          const safeRunEnemyMaxHp = Math.max(1, Math.floor(Number(run.enemyMaxHp) || 1));
          const safeRunEnemyHp = clampNumber(
            Math.floor(Number(run.enemyHp) || safeRunEnemyMaxHp),
            0,
            safeRunEnemyMaxHp
          );
          const safeType: DungeonType =
            run.type === "gold" || run.type === "xp" || run.type === "boss" ? run.type : "gold";
          return {
            ...run,
            type: safeType,
            zoneId: run.zoneId || loaded.zone,
            wave: safeWave,
            totalWaves: safeTotalWaves,
            enemyHp: safeRunEnemyHp,
            enemyMaxHp: safeRunEnemyMaxHp,
            startedAt: Math.max(0, Math.floor(Number(run.startedAt) || Date.now()))
          };
        })()
      : null;
    const normalizedLoaded: IdleGameState = {
      ...loaded,
      mesos: Math.max(0, Number(loaded.mesos) || 0),
      crystals: Math.max(0, Number(loaded.crystals) || 0),
      fame: Math.max(0, Number(loaded.fame) || 0),
      materials: normalizeCraftingMaterials(loaded.materials),
      level: safeLevel,
      xp: Math.max(0, Number(loaded.xp) || 0),
      prestigeCount: Math.max(0, Math.floor(Number(loaded.prestigeCount) || 0)),
      stage: safeStage,
      enemyHp: safeEnemyHp,
      enemyMaxHp: safeEnemyMaxHp,
      resource: Math.max(0, Number(loaded.resource) || 0),
      relics: Math.max(0, Number(loaded.relics) || 0),
      totalGoldEarned: Math.max(0, Number(loaded.totalGoldEarned) || 0),
      rebirthCount: Math.max(0, Math.floor(Number(loaded.rebirthCount) || 0)),
      lastSavedAt: Math.max(0, Number(loaded.lastSavedAt) || Date.now()),
      totalPlayTime: Math.max(0, Number(loaded.totalPlayTime) || 0),
      lifetimeKills: Math.max(0, Math.floor(Number(loaded.lifetimeKills) || 0)),
      lifetimeBossKills: Math.max(0, Math.floor(Number(loaded.lifetimeBossKills) || 0)),
      talentPoints: Math.max(0, Math.floor(Number(loaded.talentPoints) || 0)),
      dungeonState: {
        ...loaded.dungeonState,
        activeRun: safeRun
      }
    };

    return refreshAiState(syncLoginRetention(syncMonetizationState(normalizedLoaded)));
  } catch {
    return null;
  }
}
