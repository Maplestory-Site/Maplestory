/**
 * IdleStory World — core game tick, burst actions, offline gains.
 *
 * Extracted from gameEngine.ts to keep that file manageable.
 * All exports here are re-exported through gameEngine.ts for backward compat.
 */

import {
  applyXpGain,
  calculateDPS,
  getEncounterTypeForStage,
  getFamePerSecond,
  getMonsterXpReward,
  getMesosPerSecond
} from "./progressionSystem";
import { computeCombatTick, getEnemyMaxHp } from "./combatSystem";
import { tickResource } from "./classSystem";
import {
  activateSkill as activateClassSkillCore,
  tickCooldownsAndBuffs,
  getActiveRegenMult
} from "./skillSystem";
import {
  applySoftCapFactor,
  getCrystalsFromBossKill,
  getCrystalLuckMult,
  getGoldSoftCap
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
  getTalentCrystalMult
} from "./talentSystem";
import {
  addCraftingMaterialsToState,
  addLootToInventory,
  calculateTotalEquipmentStats
} from "./inventorySystem";
import { generateLootDrops, generateMaterialDrops } from "./lootSystem";
import { applyPartyHeroXp } from "./heroSystem";
import { getBossByMap, getEliteByMap, getStageMonsterByMap } from "./monsterSystem";
import { tickWorldEvents, getEventMultipliers } from "./eventSystem";
import { tickMicroMissions, ensureMicroMissions } from "./microMissionSystem";
import {
  DEFAULT_DUNGEON_STATE,
  syncDungeonState,
  tickDungeonRun
} from "./dungeonSystem";
import { ALL_ZONES } from "./zoneSystem";
import { applyGuildContribution, DEFAULT_GUILD_STATE, getGuildPassiveBonuses } from "./guildSystem";
import {
  createDefaultWeeklyRankingState,
  DEFAULT_LEADERBOARD_STATE,
  syncLeaderboardState,
  syncWeeklyRankingState
} from "./leaderboardSystem";
import {
  getShopBoostMultipliers,
  syncMonetizationState,
  syncShopState,
  tickShopState
} from "./shopSystem";
import { getSkillBuildBonuses } from "./skillBuildSystem";
import {
  DEFAULT_COLLECTION_STATE,
  discoverItems,
  discoverMonster,
  discoverMonsters,
  getCollectionBonuses
} from "./collectionSystem";
import {
  applyRetentionProgress
} from "./retentionSystem";
import { refreshAiState, getSmartSkillRecommendation, tickBehavior } from "./aiSystem";
import {
  getReplayabilityBonuses
} from "./replayabilitySystem";
import {
  clampNumber,
  createEngagementObjective,
  formatNumber,
  getMomentumTierFromStreak,
  MAX_OFFLINE_SECONDS,
  softenMultiplier
} from "./stateNormalization";
import { trackPlayerAction } from "./aiSystem";
import { defaultRng, type RngFn } from "./seededRng";
import type { ActionResult, GameContext, IdleGameState } from "./gameTypes";

// ─── Core tick ────────────────────────────────────────────────────────────────

/**
 * Advances game state by `deltaSeconds`.
 * Pure — no side effects, no I/O.
 */
export function gameTick(
  state: IdleGameState,
  deltaSeconds: number,
  context: GameContext,
  rng: RngFn = defaultRng
): IdleGameState {
  const safeSeconds = Math.min(Math.max(deltaSeconds, 0), MAX_OFFLINE_SECONDS);
  if (!safeSeconds) return state;

  // ── Cooldowns & buffs ─────────────────────────────────────────────────────
  const { skillCooldowns, activeBuffs } = tickCooldownsAndBuffs(
    state.skillCooldowns,
    state.activeBuffs,
    safeSeconds * getSkillBuildBonuses(state).cooldownRecoveryMult
  );
  const shop = tickShopState(syncShopState(state.shop), safeSeconds);
  const stateWithBuffs = {
    ...state,
    skillCooldowns,
    activeBuffs,
    shop,
    dungeonState: syncDungeonState(state.dungeonState ?? DEFAULT_DUNGEON_STATE)
  };

  // ── Resource regen ────────────────────────────────────────────────────────
  const buildBonuses = getSkillBuildBonuses(stateWithBuffs);
  const regenMult = getActiveRegenMult(activeBuffs) * buildBonuses.resourceRegenMult;
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
  const zonePowerReq    = getZonePowerRequirement(context.zone);
  const shopBoosts      = getShopBoostMultipliers(aiReadyState.shop);
  const collectionBonuses = getCollectionBonuses(aiReadyState.collection ?? DEFAULT_COLLECTION_STATE);
  const playerDps       = calculateDPS(aiReadyState) * softenMultiplier(shopBoosts.attackSpeedMult, 0.4);
  const autoProgMultRaw = context.progressionMultiplier
    ?? getProgressionMultiplier(playerDps, zonePowerReq);
  const autoProgMult    = softenMultiplier(autoProgMultRaw, 0.8);
  const newPlayerDpsMult = getNewPlayerDpsMult(aiReadyState.totalPlayTime);
  const eventMults       = getEventMultipliers(aiReadyState.activeEvents ?? []);
  const dungeonRun = aiReadyState.dungeonState.activeRun;
  const stageEncounterType = dungeonRun?.isBossWave
    ? "boss"
    : getEncounterTypeForStage(aiReadyState.stage);
  const encounterBuildMult =
    stageEncounterType === "boss"
      ? buildBonuses.bossDamageMult
      : stageEncounterType === "elite"
        ? buildBonuses.eliteDamageMult
        : 1;
  const momentumTierBase = getMomentumTierFromStreak(aiReadyState.killStreak);
  const momentumDpsMult = 1 + momentumTierBase * 0.015;
  const combinedDpsMultBase = (context.bossDpsMultiplier ?? 1.0)
    * autoProgMult
    * newPlayerDpsMult
    * softenMultiplier(eventMults.dpsMult, 0.5)
    * softenMultiplier(encounterBuildMult, 0.65)
    * softenMultiplier(collectionBonuses.dpsMult, 0.6)
    * momentumDpsMult;

  // Crit spike layer
  const critChance = clampNumber(
    0.05
      + aiReadyState.level * 0.0012
      + buildBonuses.critChargeBonus * 0.028
      + (aiReadyState.skillLevels.blessing ?? 0) * 0.0025,
    0.05,
    0.34
  );
  const critDamageMult = 1.58 + clampNumber(aiReadyState.level * 0.004, 0, 0.32) + buildBonuses.critChargeBonus * 0.08;
  const approxHits = clampNumber(Math.floor(safeSeconds * (1.7 + buildBonuses.attackSpeedMult * 1.45)), 1, 140);
  let critHits = 0;
  for (let i = 0; i < approxHits; i += 1) {
    if (rng() < critChance) critHits += 1;
  }
  const critSpikeMult = 1 + Math.min(0.16, (critHits / Math.max(1, approxHits)) * (critDamageMult - 1) * 0.75);
  const combinedDpsMult = combinedDpsMultBase * critSpikeMult;

  let combatState: IdleGameState;
  let kills = 0;
  let bossesKilled = 0;
  let eliteKills = 0;
  let dungeonMesosReward = 0;
  let dungeonXpReward = 0;
  let dungeonCrystalReward = 0;
  let dungeonRelicReward = 0;
  let dungeonFameReward = 0;

  if (dungeonRun) {
    const dungeonZone = ALL_ZONES.find((zone) => zone.id === dungeonRun.zoneId) ?? context.zone;
    const dungeonTick = tickDungeonRun(
      dungeonRun,
      dungeonZone,
      safeSeconds,
      calculateDPS(aiReadyState) * combinedDpsMult,
      aiReadyState.level
    );
    combatState = {
      ...aiReadyState,
      dungeonState: {
        ...aiReadyState.dungeonState,
        activeRun: dungeonTick.run,
        lastRewardSummary: dungeonTick.summary ?? aiReadyState.dungeonState.lastRewardSummary
      }
    };
    kills = dungeonTick.kills;
    bossesKilled = dungeonTick.bossesKilled;
    eliteKills = 0;
    dungeonMesosReward = dungeonTick.rewards.mesos;
    dungeonXpReward = dungeonTick.rewards.xp;
    dungeonCrystalReward = dungeonTick.rewards.crystals;
    dungeonRelicReward = dungeonTick.rewards.relics;
    dungeonFameReward = dungeonTick.rewards.fame;
  } else {
    const combatTick = computeCombatTick(aiReadyState, context.zone, safeSeconds, combinedDpsMult, {
      mode: safeSeconds > 2 ? "offline" : "online"
    });
    combatState = combatTick.newState;
    kills = combatTick.kills;
    bossesKilled = combatTick.bossesKilled;
    eliteKills = combatTick.eliteKills;
  }

  const normalKills = Math.max(0, kills - eliteKills - bossesKilled);
  const normalRewardMonster = getStageMonsterByMap(context.zone.id, 1) ?? undefined;
  const eliteRewardMonster = getEliteByMap(context.zone.id) ?? undefined;
  const bossRewardMonster = getBossByMap(context.zone.id) ?? undefined;

  // ── Resources ─────────────────────────────────────────────────────────────
  const crystalLuck = getCrystalLuckMult(combatState.globalMults);
  const goldSoftCap = getGoldSoftCap(combatState.prestigeCount, combatState.rebirthCount);
  const capFactor   = applySoftCapFactor(combatState.mesos, goldSoftCap);
  const guildBonuses = getGuildPassiveBonuses(combatState.guildState ?? DEFAULT_GUILD_STATE);
  const equipmentStats = calculateTotalEquipmentStats(combatState.equipment, {
    buildFocus: combatState.buildFocus,
    talentNodes: combatState.talentNodes
  });
  const equipmentXpMult = 1 + Math.min(0.18, Math.max(0, equipmentStats.xpMultiplier));
  const streakStillActive = kills > 0 || aiReadyState.streakWindowLeft > safeSeconds;
  const streakWindowLeft = kills > 0
    ? 6
    : Math.max(0, aiReadyState.streakWindowLeft - safeSeconds);
  const killStreak = kills > 0
    ? Math.min(600, aiReadyState.killStreak + kills)
    : streakWindowLeft > 0
      ? aiReadyState.killStreak
      : 0;
  const momentumTier = streakStillActive ? getMomentumTierFromStreak(killStreak) : 0;
  const momentumRewardMult = 1 + momentumTier * 0.01;

  const newPlayerMesosMult = getNewPlayerMesosMult(combatState.totalPlayTime);
  const rawMesosGain   = dungeonRun
    ? 0
    : getMesosPerSecond(combatState, context.zone, context.monster, context.lootCount) * safeSeconds
      * newPlayerMesosMult
      * guildBonuses.goldMult;
  const mesosPerSecond = rawMesosGain / safeSeconds;
  const mesosGain  = rawMesosGain * capFactor;
  const baseKillMesos =
    dungeonRun
      ? 0
      : normalKills * (normalRewardMonster?.goldReward ?? (18 + combatState.stage * 4)) +
        eliteKills * (eliteRewardMonster?.goldReward ?? (54 + combatState.stage * 12)) +
        bossesKilled * (bossRewardMonster?.goldReward ?? (180 + combatState.stage * 40));
  const earlyKillRewardMult = combatState.totalPlayTime < 300
    ? 0.36 + (combatState.totalPlayTime / 300) * 0.44
    : 1;
  const killMesos  = baseKillMesos * context.zone.rewardBoost * capFactor * earlyKillRewardMult;
  const fameGain   = dungeonRun ? 0 : getFamePerSecond(combatState, context.monster) * safeSeconds;
  const bossFame   = bossesKilled * (8 + combatState.prestigeCount * 2);
  const replayabilityBonuses = getReplayabilityBonuses(
    combatState.replayability,
    combatState.prestigeCount,
    combatState.rebirthCount
  );

  // Crystals from boss kills
  const talentCrystalMult = getTalentCrystalMult(combatState.talentNodes ?? {});
  const bossCrystals = dungeonRun
    ? 0
    : bossesKilled > 0
    ? getCrystalsFromBossKill(combatState.stage, crystalLuck, combatState.crystals) * bossesKilled * talentCrystalMult * eventMults.crystalMult * replayabilityBonuses.crystalMult
    : 0;

  // XP
  const zoneXpMult = softenMultiplier(context.zone.rewardBoost, 0.3);
  const xpBoostMult = 1 + combatState.globalMults.xp_boost * 0.06;
  const newPlayerXpMult = getNewPlayerXpMult(combatState.totalPlayTime);
  const talentXpMult   = getTalentXpMult(combatState.talentNodes ?? {});
  const normalXpGain   = dungeonRun ? 0 : getMonsterXpReward("normal", combatState.level, context.zone.requirement, combatState.stage, normalRewardMonster) * normalKills;
  const eliteXpGain    = dungeonRun ? 0 : getMonsterXpReward("elite", combatState.level, context.zone.requirement, combatState.stage, eliteRewardMonster) * eliteKills;
  const bossXpGain     = dungeonRun ? 0 : getMonsterXpReward("boss", combatState.level, context.zone.requirement, combatState.stage, bossRewardMonster) * bossesKilled;
  const xpMultiplierComposite = Math.min(
    1.85,
    softenMultiplier(xpBoostMult, 1)
      * softenMultiplier(newPlayerXpMult, 0.3)
      * softenMultiplier(talentXpMult, 0.4)
      * softenMultiplier(eventMults.xpMult, 0.3)
      * softenMultiplier(shopBoosts.xpMult, 0.3)
      * softenMultiplier(equipmentXpMult, 0.6)
      * softenMultiplier(collectionBonuses.xpMult, 0.5)
      * softenMultiplier(replayabilityBonuses.xpMult, 0.45)
      * softenMultiplier(momentumRewardMult, 0.35)
  );

  // ── Boss reward spikes ────────────────────────────────────────────────────
  const bossMesosBonus = !dungeonRun && bossesKilled > 0
    ? calcBossMesosSpike(mesosPerSecond, context.zone.rewardBoost, combatState.stage) * bossesKilled * capFactor
    : 0;
  const bossFameBonus  = !dungeonRun && bossesKilled > 0
    ? calcBossFameSpike(context.zone.rewardBoost, combatState.stage, combatState.prestigeCount) * bossesKilled
    : 0;

  // ── Elite reward spikes ───────────────────────────────────────────────────
  const eliteMesosBonus = !dungeonRun && eliteKills > 0
    ? calcEliteMesosSpike(mesosPerSecond, context.zone.rewardBoost) * eliteKills * capFactor
    : 0;

  const totalXpGain    = ((normalXpGain + eliteXpGain + bossXpGain) * zoneXpMult * xpMultiplierComposite)
    + dungeonXpReward;
  const totalXpGainWithGuild = totalXpGain * softenMultiplier(guildBonuses.xpMult, 0.45);
  const mesosMultiplierComposite =
    softenMultiplier(eventMults.mesosMult, 0.65)
    * softenMultiplier(shopBoosts.goldMult, 0.7)
    * softenMultiplier(collectionBonuses.goldMult, 0.7)
    * softenMultiplier(replayabilityBonuses.goldMult, 0.7)
    * softenMultiplier(momentumRewardMult, 0.45);
  const totalMesosGain = ((mesosGain + killMesos + bossMesosBonus + eliteMesosBonus) * mesosMultiplierComposite)
    + dungeonMesosReward;
  const totalFameGain  = fameGain + bossFame + bossFameBonus + dungeonFameReward;

  // Bonus drops
  const bonusProcChance = clampNumber(
    0.006 + context.zone.requirement * 0.00055 + momentumTier * 0.0015 + (bossesKilled > 0 ? 0.004 : 0),
    0.006,
    0.055
  );
  const simulatedKills = Math.min(120, kills);
  let simulatedBonusProcs = 0;
  for (let i = 0; i < simulatedKills; i += 1) {
    if (rng() < bonusProcChance) simulatedBonusProcs += 1;
  }
  const scaledBonusDrops = simulatedKills > 0
    ? Math.floor(simulatedBonusProcs * (kills / simulatedKills))
    : 0;
  const bonusDrops = clampNumber(scaledBonusDrops, 0, 6);
  const bonusGold = bonusDrops * (5 + Math.floor(context.zone.requirement * 1.6) + Math.floor(combatState.level * 0.22));
  const bonusXp = bonusDrops * (1 + Math.floor(context.zone.requirement * 0.35) + Math.floor(combatState.level * 0.05));
  const bonusLootRarity = Math.min(0.12, bonusDrops * 0.005);
  const bonusDropMultiplier = Math.min(1.14, 1 + bonusDrops * 0.006);

  const { level, xp, crystalsEarned } = applyXpGain(combatState.level, combatState.xp, totalXpGainWithGuild + bonusXp);
  const heroProgress = applyPartyHeroXp(combatState.heroLevels, combatState.heroXp, totalXpGainWithGuild * 0.18);

  const goldGained = totalMesosGain + bonusGold;
  const lootDrops = generateLootDrops({
    monster: context.monster,
    zoneIndex: Math.max(1, context.zone.requirement),
    playerLevel: combatState.level,
    stage: combatState.stage,
    normalKills,
    eliteKills,
    bossKills: bossesKilled,
    dropChanceMultiplier: shopBoosts.lootDropMult * bonusDropMultiplier,
    rarityBonusExtra: shopBoosts.lootRarityBonus + bonusLootRarity
  });
  const materialDrops = generateMaterialDrops({
    zoneIndex: Math.max(1, context.zone.requirement),
    normalKills,
    eliteKills,
    bossKills: bossesKilled
  });
  const collectionWithMonsters = discoverMonsters(
    combatState.collection ?? DEFAULT_COLLECTION_STATE,
    [
      context.monster,
      normalKills > 0 ? normalRewardMonster ?? null : null,
      eliteKills > 0 ? eliteRewardMonster ?? null : null,
      bossesKilled > 0 ? bossRewardMonster ?? null : null
    ]
  );
  const collectionWithDrops = discoverItems(collectionWithMonsters, lootDrops);
  const combatStateWithLoot = addCraftingMaterialsToState({
    ...addLootToInventory(combatState, lootDrops),
    collection: collectionWithDrops
  }, materialDrops);

  // ── Boss surge tick-down + refresh ───────────────────────────────────────
  const surgeBase    = combatState.bossSurgeSecondsLeft ?? 0;
  const surgeTickedDown = Math.max(0, surgeBase - safeSeconds);
  const newBossSurge = bossesKilled > 0
    ? Math.max(surgeTickedDown, BOSS_SURGE_SECONDS)
    : surgeTickedDown;

  const next: IdleGameState = {
    ...combatStateWithLoot,
    mesos: combatStateWithLoot.mesos + totalMesosGain + bonusGold,
    fame: combatStateWithLoot.fame + totalFameGain,
    level,
    xp,
    heroLevels: heroProgress.heroLevels,
    heroXp: heroProgress.heroXp,
    crystals: Math.min(500, combatStateWithLoot.crystals + crystalsEarned + bossCrystals + dungeonCrystalReward),
    relics: combatStateWithLoot.relics + dungeonRelicReward,
    totalGoldEarned: combatStateWithLoot.totalGoldEarned + goldGained,
    totalPlayTime: combatStateWithLoot.totalPlayTime + safeSeconds,
    bossSurgeSecondsLeft: newBossSurge,
    killStreak,
    bestKillStreak: Math.max(combatStateWithLoot.bestKillStreak, killStreak),
    streakWindowLeft
  };

  // Rotating short-term objective
  const objectiveProgressGain =
    next.activeObjective.type === "kills"
      ? kills
      : next.activeObjective.type === "crits"
        ? critHits
        : next.activeObjective.type === "gold"
          ? Math.floor((totalMesosGain + bonusGold) * 0.4)
          : bossesKilled;

  let objective = {
    ...next.activeObjective,
    progress: next.activeObjective.progress + objectiveProgressGain
  };
  let objectiveCompletions = next.objectiveCompletions;
  let objectiveCompleted = false;
  let objectiveRewardMesos = 0;
  let objectiveRewardXp = 0;
  let objectiveRewardCrystals = 0;
  let objectiveSafeGuard = 0;
  let objectiveRewardedState = next;

  while (objective.progress >= objective.target && objectiveSafeGuard < 1) {
    objectiveCompleted = true;
    objectiveSafeGuard += 1;
    objectiveCompletions += 1;

    objectiveRewardMesos += objective.rewardMesos;
    objectiveRewardXp += objective.rewardXp;
    objectiveRewardCrystals += objective.rewardCrystals;

    const rewardXpApply = applyXpGain(
      objectiveRewardedState.level,
      objectiveRewardedState.xp,
      objective.rewardXp
    );
    objectiveRewardedState = {
      ...objectiveRewardedState,
      mesos: objectiveRewardedState.mesos + objective.rewardMesos,
      crystals: Math.min(500, objectiveRewardedState.crystals + objective.rewardCrystals),
      level: rewardXpApply.level,
      xp: rewardXpApply.xp
    };
    objective = createEngagementObjective(
      objectiveRewardedState.level,
      objectiveRewardedState.stage,
      objectiveCompletions
    );
  }

  const nextWithObjective: IdleGameState = {
    ...objectiveRewardedState,
    activeObjective: objective,
    objectiveCompletions,
    engagementPulseSeq: objectiveRewardedState.engagementPulseSeq + 1,
    engagementPulse: {
      id: objectiveRewardedState.engagementPulseSeq + 1,
      critHits,
      momentumTier,
      bonusDrops,
      bonusGold,
      bonusXp,
      objectiveCompleted,
      objectiveRewardMesos,
      objectiveRewardXp,
      objectiveRewardCrystals
    }
  };

  // ── World events ──────────────────────────────────────────────────────────
  const { activeEvents: nextEvents, nextEventAt: nextEvtAt } = tickWorldEvents(
    nextWithObjective.activeEvents ?? [],
    nextWithObjective.nextEventAt  ?? 0,
    nextWithObjective.totalPlayTime,
    safeSeconds
  );

  // ── Micro missions ─────────────────────────────────────────────────────────
  const filledMms = ensureMicroMissions(nextWithObjective.microMissions ?? [], nextWithObjective.level, nextWithObjective.stage);
  const tickedMms = tickMicroMissions(filledMms, {
    kills:        kills,
    bossKills:    bossesKilled,
    eliteKills,
    currentStage: nextWithObjective.stage,
    mesosGained:  totalMesosGain + bonusGold
  });

  const nextWithSystems: IdleGameState = {
    ...nextWithObjective,
    activeEvents:  nextEvents,
    nextEventAt:   nextEvtAt,
    microMissions: tickedMms,
    guildState: applyGuildContribution(nextWithObjective.guildState ?? DEFAULT_GUILD_STATE, {
      kills: normalKills,
      eliteKills,
      bossKills: bossesKilled,
      mesosGained: totalMesosGain + bonusGold
    }),
    leaderboardState: syncLeaderboardState(
      nextWithObjective.leaderboardState ?? DEFAULT_LEADERBOARD_STATE,
      {
        level: nextWithObjective.level,
        power: nextWithObjective.leaderboardState?.bestPower ?? 0,
        stage: nextWithObjective.stage,
        bossKills: nextWithObjective.lifetimeBossKills,
        goldEarned: nextWithObjective.totalGoldEarned
      }
    ),
    weeklyRankingState: syncWeeklyRankingState(
      nextWithObjective.weeklyRankingState ?? createDefaultWeeklyRankingState(),
      {
        stageProgress: nextWithObjective.stage,
        bossKillsGained: bossesKilled
      }
    )
  };

  const retentionMesosGain = Math.max(0, Math.floor(totalMesosGain + bonusGold + objectiveRewardMesos));
  const retentionDamage = Math.max(0, Math.floor(calculateDPS(aiReadyState) * combinedDpsMult * safeSeconds));
  const retentionStageClears = Math.max(0, nextWithSystems.stage - state.stage);
  const retentionLevelGains = Math.max(0, nextWithSystems.level - state.level);

  return refreshAiState(
    tickBehavior(
      applyRetentionProgress(syncMonetizationState(nextWithSystems), {
        kills,
        bossKills: bossesKilled,
        mesosGained: retentionMesosGain,
        damageDealt: retentionDamage,
        critHits,
        stageClears: retentionStageClears,
        levelGains: retentionLevelGains
      }),
      safeSeconds
    )
  );
}

// ─── Offline gains ────────────────────────────────────────────────────────────

/**
 * Applies accumulated offline time since `state.lastSavedAt`.
 * Call once after the database is loaded so rewards use real zone/monster data.
 */
export function calculateOfflineGains(
  state: IdleGameState,
  context: GameContext,
  now = Date.now(),
  rng: RngFn = defaultRng
): IdleGameState {
  const elapsed = Math.min((now - state.lastSavedAt) / 1000, MAX_OFFLINE_SECONDS);
  if (elapsed < 1) return state;
  return gameTick(state, elapsed, context, rng);
}

// ─── Burst actions ────────────────────────────────────────────────────────────

/**
 * Hunt burst — instantly awards 18 + level seconds of combat progress.
 */
export function huntBurst(state: IdleGameState, context: GameContext, rng: RngFn = defaultRng): ActionResult {
  const burstSeconds = 18 + state.level;
  const next = gameTick(trackPlayerAction(state, "hunt"), burstSeconds, context, rng);
  return {
    state: next,
    message: `${context.monster?.name ?? "Monster"} hunt in ${context.zone.name}: +${formatNumber(next.mesos - state.mesos)} mesos.`,
    success: true
  };
}

/**
 * Raid boss — deals a large burst of damage directly to the current enemy.
 */
export function raidBoss(
  state: IdleGameState,
  zone: import("./gameTypes").WorldZone,
  bossName: string,
  calculateDPSFn: (s: IdleGameState) => number
): ActionResult {
  const dps = calculateDPSFn(state);
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
  const discoveredCollection = discoverMonster(
    state.collection ?? DEFAULT_COLLECTION_STATE,
    getBossByMap(zone.id) ?? null
  );
  const next = refreshAiState(trackPlayerAction(applyRetentionProgress({
      ...state,
      stage: nextStage,
      enemyHp: newEnemyMaxHp,
      enemyMaxHp: newEnemyMaxHp,
      mesos: state.mesos + rewardMesos,
      crystals: state.crystals + rewardCrystals,
      fame: state.fame + 12,
      collection: discoveredCollection
    }, {
      kills: 1,
      bossKills: 1,
      mesosGained: Math.floor(rewardMesos),
      damageDealt: Math.floor(burstDamage),
      stageClears: 1
    }), "raid"));

  return {
    state: next,
    message: `${bossName} cleared: +${formatNumber(rewardMesos)} mesos, +${rewardCrystals} crystals. Stage ${nextStage}!`,
    success: true
  };
}
