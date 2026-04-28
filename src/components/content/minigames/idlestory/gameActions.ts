/**
 * IdleStory World — player action functions.
 *
 * Extracted from gameEngine.ts to keep that file manageable.
 * All exports here are re-exported through gameEngine.ts for backward compat.
 */

import {
  calculateDPS,
  GEAR,
  HEROES,
  SKILLS,
  UPGRADES,
  getGearCost,
  getHeroCost,
  getSkillCost,
  getUpgradeCost
} from "./progressionSystem";
import { getEnemyMaxHp } from "./combatSystem";
import {
  activateSkill as activateClassSkillCore,
  SKILL_DEFINITIONS
} from "./skillSystem";
import { getTalentBuyResult, type TalentNodeId } from "./talentSystem";
import { tryBuyRelicUpgrade } from "./rebirthSystem";
import {
  claimRewardedAd,
  claimSeasonPassReward,
  purchaseShopOffer,
  type MonetizationOfferId,
  type RewardedAdPlacement,
  type SeasonPassTrack
} from "./shopSystem";
import {
  getDefaultBuildFocus,
  getSelectedSkillBranch,
  getSkillBranchOptions,
  type SkillBranchId
} from "./skillBuildSystem";
import {
  canStartDungeon,
  DEFAULT_DUNGEON_STATE,
  startDungeonRun as startDungeonRunCore,
  syncDungeonState,
  type DungeonType
} from "./dungeonSystem";
import {
  canClaimWeeklyReward,
  claimWeeklyRewardState,
  createDefaultWeeklyRankingState,
  DEFAULT_LEADERBOARD_STATE,
  getWeeklyRewardForRank,
  setWeeklyResolvedRank,
  updateLeaderboardRanks,
  type LeaderboardCategory
} from "./leaderboardSystem";
import {
  applyShadowBattleResult,
  createShadowSnapshot,
  DEFAULT_PVP_STATE,
  simulateShadowBattle,
  type ShadowSnapshot
} from "./pvpSystem";
import {
  autoEquipBestItems,
  craftInventoryItem,
  enhanceInventoryItem,
  equipItem,
  rerollInventoryItem,
  salvageInventoryItem,
  unequipItem
} from "./inventorySystem";
import { tryBuyGlobalMult } from "./economySystem";
import { claimMicroMission } from "./microMissionSystem";
import { trackPlayerAction } from "./aiSystem";
import { formatNumber } from "./stateNormalization";
import type { CraftRecipeId, IdleItemType, RerollMode } from "./itemSystem";
import type {
  ActionResult,
  ClassId,
  ClassSkillId,
  GearId,
  GlobalMultId,
  HeroId,
  IdleGameState,
  RelicUpgradeId,
  SkillId,
  UpgradeId,
  WorldZone
} from "./gameTypes";

// ─── Internal helper ──────────────────────────────────────────────────────────

type BestPurchaseTarget<TId extends string> = {
  id: TId;
  cost: number;
};

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

// ─── Class & build actions ────────────────────────────────────────────────────

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
      activeBuffs: [],
      buildFocus: state.classId === classId ? state.buildFocus : getDefaultBuildFocus(classId)
    }, "class"),
    message: `Class set to ${classId.charAt(0).toUpperCase() + classId.slice(1)}. Skills unlocked.`,
    success: true
  };
}

export function setBuildFocus(state: IdleGameState, buildFocus: import("./skillBuildSystem").BuildFocusId): ActionResult {
  if (!state.classId) {
    return { state, message: "Select a class first.", success: false };
  }
  return {
    state: trackPlayerAction({ ...state, buildFocus }, "class"),
    message: `${buildFocus.charAt(0).toUpperCase() + buildFocus.slice(1)} build ready.`,
    success: true
  };
}

export function setSkillBranchChoice(
  state: IdleGameState,
  skillId: ClassSkillId,
  branchId: SkillBranchId
): ActionResult {
  if (!state.classId) {
    return { state, message: "Select a class first.", success: false };
  }
  const validBranch = getSkillBranchOptions(skillId).find((branch) => branch.id === branchId);
  if (!validBranch) {
    return { state, message: "Invalid skill branch.", success: false };
  }
  if (SKILL_DEFINITIONS[skillId].classId !== state.classId) {
    return { state, message: "That branch belongs to another class.", success: false };
  }
  const currentBranch = getSelectedSkillBranch(state, skillId);
  if (currentBranch?.id === branchId) {
    return { state, message: `${validBranch.name} already equipped.`, success: false };
  }
  return {
    state: trackPlayerAction({
      ...state,
      skillBranches: {
        ...state.skillBranches,
        [skillId]: branchId
      }
    }, "skill"),
    message: `${validBranch.name} selected.`,
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

// ─── Purchase actions ─────────────────────────────────────────────────────────

export function buyHero(
  state: IdleGameState,
  heroId: HeroId,
  heroName: string,
  cost: number
): ActionResult {
  if (!HEROES[heroId]) {
    return { state, message: "Unknown hero.", success: false };
  }
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
  if (!UPGRADES[upgradeId]) {
    return { state, message: "Unknown upgrade.", success: false };
  }
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
  if (!GEAR[gearId]) {
    return { state, message: "Unknown gear.", success: false };
  }
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
  if (!SKILLS[skillId]) {
    return { state, message: "Unknown skill.", success: false };
  }
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

// ─── Best-of-X convenience actions ───────────────────────────────────────────

/**
 * Boss-kill reward: upgrades the cheapest hero for free (no mesos cost).
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
    message: `Boss Reward: ${HEROES[cheapest.id].name} upgraded to Lv.${nextLevel} for FREE!`,
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

// ─── World / dungeon actions ──────────────────────────────────────────────────

export function changeZone(
  state: IdleGameState,
  zone: WorldZone
): ActionResult {
  if (state.dungeonState?.activeRun) {
    return {
      state,
      message: "Finish the dungeon run first.",
      success: false
    };
  }
  if (state.level < zone.requirement) {
    return {
      state,
      message: `Reach level ${zone.requirement} to unlock ${zone.name}.`,
      success: false
    };
  }
  const enemyMaxHp = getEnemyMaxHp(1, zone);
  return {
    state: { ...state, zone: zone.id, stage: 1, enemyHp: enemyMaxHp, enemyMaxHp },
    message: `${zone.name} selected.`,
    success: true
  };
}

export function startDungeon(
  state: IdleGameState,
  type: DungeonType,
  zone: WorldZone
): ActionResult {
  const dungeonState = syncDungeonState(state.dungeonState ?? DEFAULT_DUNGEON_STATE);
  const availability = canStartDungeon(dungeonState, type, state.level);
  if (!availability.allowed) {
    return {
      state: { ...state, dungeonState },
      message: availability.reason,
      success: false
    };
  }
  const nextDungeonState = startDungeonRunCore(dungeonState, type, zone);
  return {
    state: {
      ...state,
      dungeonState: nextDungeonState
    },
    message: `${zone.name} ${type} dungeon started.`,
    success: true
  };
}

// ─── Social / mission / PvP actions ──────────────────────────────────────────

export function claimMicroMissionReward(
  state: IdleGameState,
  missionId: string
): ActionResult {
  const { missions, reward } = claimMicroMission(
    state.microMissions ?? [],
    missionId,
    state.level,
    state.stage
  );
  if (!reward) {
    return { state, message: "Mission not found or already claimed.", success: false };
  }
  const next: IdleGameState = {
    ...state,
    microMissions: missions,
    mesos:    state.mesos    + reward.mesos,
    fame:     state.fame     + (reward.fame ?? 0),
    crystals: Math.min(500, state.crystals + (reward.crystals ?? 0)),
    xp:       state.xp       + (reward.xp ?? 0)
  };
  return {
    state: next,
    message: "Mission complete! +" + reward.mesos.toLocaleString() + " mesos.",
    success: true
  };
}

export function updateSocialRanks(
  state: IdleGameState,
  ranks: Partial<Record<LeaderboardCategory, number>>,
  weeklyRank: number | null
): IdleGameState {
  return {
    ...state,
    leaderboardState: updateLeaderboardRanks(
      state.leaderboardState ?? DEFAULT_LEADERBOARD_STATE,
      ranks
    ),
    weeklyRankingState: setWeeklyResolvedRank(
      state.weeklyRankingState ?? createDefaultWeeklyRankingState(),
      weeklyRank
    )
  };
}

export function claimWeeklyPveReward(state: IdleGameState): ActionResult {
  const rankingState = state.weeklyRankingState ?? createDefaultWeeklyRankingState();
  if (!canClaimWeeklyReward(rankingState)) {
    return {
      state,
      message: "Weekly reward not ready yet.",
      success: false
    };
  }

  const rank = rankingState.lastResolvedRank ?? 999;
  const reward = getWeeklyRewardForRank(rank);
  return {
    state: {
      ...state,
      mesos: state.mesos + reward.mesos,
      crystals: Math.min(500, state.crystals + reward.crystals),
      fame: state.fame + reward.fame,
      weeklyRankingState: claimWeeklyRewardState(rankingState)
    },
    message: `Weekly reward claimed: +${formatNumber(reward.mesos)} mesos, +${reward.crystals} crystals.`,
    success: true
  };
}

export function resolveShadowBattle(
  state: IdleGameState,
  opponent: ShadowSnapshot,
  username = "Idle Hero",
  userId = "local-player"
): ActionResult {
  const playerShadow = createShadowSnapshot(
    state,
    state.leaderboardState?.bestPower ?? calculateDPS(state),
    calculateDPS(state),
    username,
    userId
  );
  const result = simulateShadowBattle(playerShadow, opponent);

  return {
    state: {
      ...state,
      mesos: state.mesos + result.mesosReward,
      crystals: Math.min(500, state.crystals + result.crystalsReward),
      pvpState: applyShadowBattleResult(
        state.pvpState ?? DEFAULT_PVP_STATE,
        opponent,
        result
      )
    },
    message:
      result.outcome === "win"
        ? `Shadow defeated: +${formatNumber(result.mesosReward)} mesos.`
        : `Shadow battle lost. +${result.crystalsReward} crystals consolation.`,
    success: true
  };
}

// ─── Shop / monetization actions ──────────────────────────────────────────────

export function buyShopOffer(state: IdleGameState, offerId: MonetizationOfferId): ActionResult {
  return purchaseShopOffer(trackPlayerAction(state, "upgrade"), offerId);
}

export function watchRewardedAd(state: IdleGameState, placement: RewardedAdPlacement): ActionResult {
  return claimRewardedAd(trackPlayerAction(state, "claim"), placement);
}

export function claimSeasonPassTier(
  state: IdleGameState,
  tierNumber: number,
  track: SeasonPassTrack
): ActionResult {
  return claimSeasonPassReward(trackPlayerAction(state, "claim"), tierNumber, track);
}

// ─── Inventory / item actions ─────────────────────────────────────────────────

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

export function rerollLootItem(
  state: IdleGameState,
  itemId: string,
  mode: RerollMode
): ActionResult {
  return rerollInventoryItem(trackPlayerAction(state, "gear"), itemId, mode);
}

export function salvageLootItem(state: IdleGameState, itemId: string): ActionResult {
  return salvageInventoryItem(trackPlayerAction(state, "gear"), itemId);
}

export function craftLootRecipe(
  state: IdleGameState,
  recipeId: CraftRecipeId,
  zoneRequirement: number
): ActionResult {
  return craftInventoryItem(
    trackPlayerAction(state, "gear"),
    recipeId,
    Math.max(1, Math.floor(zoneRequirement)),
    state.level
  );
}

// ─── Economy multiplier actions ───────────────────────────────────────────────

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
