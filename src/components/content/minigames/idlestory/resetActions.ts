/**
 * IdleStory World — prestige and rebirth reset actions.
 *
 * Extracted from gameEngine.ts to keep that file manageable.
 * All exports here are re-exported through gameEngine.ts for backward compat.
 */

import {
  canPrestige,
  canRebirth,
  calculatePrestigeCrystalCarry,
  calculatePrestigeHeroBonus,
  calculateRelicsEarned,
  getRebirthMomentumGold
} from "./rebirthSystem";
import {
  applyPrestigeReplayability,
  applyRebirthReplayability,
  calculatePrestigeShardsEarned,
  formatReplayUnlocks,
  getReplayabilityBonuses
} from "./replayabilitySystem";
import { TALENT_POINTS_PER_PRESTIGE, TALENT_POINTS_PER_REBIRTH } from "./talentSystem";
import { syncShopState } from "./shopSystem";
import { refreshAiState, trackPlayerAction } from "./aiSystem";
import { applyRetentionProgress } from "./retentionSystem";
import { getEnemyMaxHp } from "./combatSystem";
import {
  createEngagementObjective,
  DEFAULT_STATE,
  FALLBACK_ZONES
} from "./stateNormalization";
import type { ActionResult, IdleGameState, WorldZone } from "./gameTypes";

// ─── Prestige ─────────────────────────────────────────────────────────────────

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
  const nextPrestige = state.prestigeCount + 1;
  const shardsEarned = calculatePrestigeShardsEarned(state);
  const replayabilityResult = applyPrestigeReplayability(
    state.replayability,
    nextPrestige,
    state.rebirthCount,
    shardsEarned
  );
  const replayabilityBonuses = getReplayabilityBonuses(
    replayabilityResult.replayability,
    nextPrestige,
    state.rebirthCount
  );
  const totalHeroBonus = heroBonus + replayabilityBonuses.extraStartHeroLevels;
  const unlockText = formatReplayUnlocks(replayabilityResult.unlocks);
  const enemyMaxHp   = Math.floor(getEnemyMaxHp(1, firstZone) * replayabilityBonuses.difficultyMult);

  const next: IdleGameState = {
    ...DEFAULT_STATE,
    // Carry over
    fame: state.fame + state.level * 4,
    materials: state.materials,
    classId: state.classId,
    relics: state.relics,
    relicUpgrades: state.relicUpgrades,   // permanent
    globalMults: state.globalMults,       // persist through prestige
    totalGoldEarned: state.totalGoldEarned,
    rebirthCount: state.rebirthCount,
    totalPlayTime: state.totalPlayTime,
    prestigeCount: nextPrestige,
    dailyReward: state.dailyReward,
    dailyChallenges: state.dailyChallenges,
    weeklyGoal: state.weeklyGoal,
    comebackReward: state.comebackReward,
    achievements: state.achievements,
    missions: state.missions,
    notifications: state.notifications,
    lifetimeKills: state.lifetimeKills,
    lifetimeBossKills: state.lifetimeBossKills,
    collection: state.collection,
    replayability: replayabilityResult.replayability,
    shop: syncShopState(state.shop),
    ai: state.ai,
    behavior: state.behavior,
    guildState: state.guildState,
    leaderboardState: state.leaderboardState,
    weeklyRankingState: state.weeklyRankingState,
    pvpState: state.pvpState,
    // Talent tree — permanent, always carry forward + award points
    talentNodes: state.talentNodes,
    talentPoints: (state.talentPoints ?? 0) + TALENT_POINTS_PER_PRESTIGE,
    // Starting bonuses
    mesos: startGold + replayabilityBonuses.extraStartGold,
    crystals: crystalCarry,
    heroLevels: { snailguard: 1 + totalHeroBonus, mage: 0, archer: 0, ironwall: 0, pyromancer: 0, falconer: 0 },
    heroXp: DEFAULT_STATE.heroXp,
    gearLevels: { weapon: Math.min(totalHeroBonus, 4), armor: 0, charm: 0 },
    skillLevels: { slash: Math.min(totalHeroBonus, 4), meteor: 0, blessing: 0 },
    zone: firstZone.id,
    stage: 1,
    enemyHp: enemyMaxHp,
    enemyMaxHp,
    lastSavedAt: Date.now(),
    // Engagement objective — fresh for new run
    activeObjective: createEngagementObjective(1, 1, 0),
    objectiveCompletions: 0
  };

  return {
    state: trackPlayerAction(refreshAiState(next), "prestige"),
    message: `Prestige x${nextPrestige}! +${shardsEarned} shards, tier ${replayabilityResult.replayability.challengeTier}, carried ${crystalCarry} crystals.${unlockText ? ` Unlocked: ${unlockText}.` : ""}`,
    success: true
  };
}

// ─── Rebirth ──────────────────────────────────────────────────────────────────

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
  const nextRebirthCount = state.rebirthCount + 1;
  const replayabilityResult = applyRebirthReplayability(
    state.replayability,
    state.prestigeCount,
    nextRebirthCount
  );
  const replayabilityBonuses = getReplayabilityBonuses(
    replayabilityResult.replayability,
    state.prestigeCount,
    nextRebirthCount
  );
  const unlockText = formatReplayUnlocks(replayabilityResult.unlocks);
  const enemyMaxHp   = Math.floor(getEnemyMaxHp(1, firstZone) * replayabilityBonuses.difficultyMult);

  const next: IdleGameState = {
    ...DEFAULT_STATE,
    // Only permanents survive rebirth
    relics: state.relics + relicsEarned,
    materials: state.materials,
    relicUpgrades: state.relicUpgrades,
    totalGoldEarned: state.totalGoldEarned,
    rebirthCount: nextRebirthCount,
    totalPlayTime: state.totalPlayTime,
    dailyReward: state.dailyReward,
    dailyChallenges: state.dailyChallenges,
    weeklyGoal: state.weeklyGoal,
    comebackReward: state.comebackReward,
    achievements: state.achievements,
    missions: state.missions,
    // Talent tree — permanent, always carry forward + award points
    talentNodes: state.talentNodes,
    talentPoints: (state.talentPoints ?? 0) + TALENT_POINTS_PER_REBIRTH,
    notifications: state.notifications,
    lifetimeKills: state.lifetimeKills,
    lifetimeBossKills: state.lifetimeBossKills,
    collection: state.collection,
    replayability: replayabilityResult.replayability,
    shop: syncShopState(state.shop),
    ai: state.ai,
    behavior: state.behavior,
    guildState: state.guildState,
    leaderboardState: state.leaderboardState,
    weeklyRankingState: state.weeklyRankingState,
    pvpState: state.pvpState,
    // Starting gold from Rebirth Momentum relic
    mesos: startGold + replayabilityBonuses.extraStartGold,
    zone: firstZone.id,
    stage: 1,
    enemyHp: enemyMaxHp,
    enemyMaxHp,
    lastSavedAt: Date.now(),
    // Engagement objective — fresh for new run
    activeObjective: createEngagementObjective(1, 1, 0),
    objectiveCompletions: 0
  };

  return {
    state: trackPlayerAction(refreshAiState(applyRetentionProgress(next)), "rebirth"),
    message: `Rebirth x${next.rebirthCount}! +${relicsEarned} relics, challenge tier ${replayabilityResult.replayability.challengeTier}.${unlockText ? ` Unlocked: ${unlockText}.` : ""}`,
    success: true
  };
}
