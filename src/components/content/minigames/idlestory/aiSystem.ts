import type {
  ClassSkillId,
  GearId,
  GlobalMultId,
  HeroId,
  IdleGameState,
  SkillId,
  UpgradeId,
  WorldZone,
} from "./gameEngine";
import { isBossStage } from "./combatSystem";
import { getGlobalMultCost, GLOBAL_MULTIPLIERS } from "./economySystem";
import { getPowerStatus, getZonePowerRequirement, type PowerStatus } from "./progressionGates";
import {
  GEAR,
  getGearCost,
  getHeroCost,
  getSkillCost,
  getUpgradeCost,
  HEROES,
  SKILLS,
  UPGRADES,
} from "./progressionSystem";
import { CLASSES } from "./classSystem";
import { SKILL_DEFINITIONS, SKILLS_BY_CLASS } from "./skillSystem";
import { ALL_ZONES, getZoneUnlockStatus } from "./zoneSystem";

export type PlayerActionType =
  | "hunt"
  | "raid"
  | "upgrade"
  | "skill"
  | "class"
  | "gear"
  | "claim"
  | "prestige"
  | "rebirth";

export type UpgradeRecommendationKind =
  | "hero"
  | "gear"
  | "upgrade"
  | "skill"
  | "global";

export type UpgradeRecommendation = {
  id: string;
  kind: UpgradeRecommendationKind;
  label: string;
  cost: number;
  currency: "mesos" | "fame" | "crystals";
  reason: string;
  priority: number;
  affordable: boolean;
};

export type AiState = {
  autoSkillEnabled: boolean;
  autoUpgradeEnabled: boolean;
  autoMapEnabled: boolean;
  adaptiveDifficulty: number;
  lastAutoSkillAt: number;
  lastAutoSkillId: ClassSkillId | null;
  lastAutoUpgradeAt: number;
  lastAutoUpgradeLabel: string | null;
  lastAutoMapAt: number;
  lastAutoMapId: string | null;
  upgradeRecommendations: UpgradeRecommendation[];
};

export type AutoMapDecision = {
  targetZoneId: string;
  mode: "farm" | "hold" | "push";
  reason: string;
};

export type PlayerBehaviorState = {
  manualHunts: number;
  manualRaids: number;
  manualUpgrades: number;
  skillActivations: number;
  totalActions: number;
  idleSeconds: number;
  lastActionAt: number;
  lastActionType: PlayerActionType | null;
};

export const DEFAULT_AI_STATE: AiState = {
  autoSkillEnabled: true,
  autoUpgradeEnabled: true,
  autoMapEnabled: true,
  adaptiveDifficulty: 1,
  lastAutoSkillAt: 0,
  lastAutoSkillId: null,
  lastAutoUpgradeAt: 0,
  lastAutoUpgradeLabel: null,
  lastAutoMapAt: 0,
  lastAutoMapId: null,
  upgradeRecommendations: [],
};

export const DEFAULT_PLAYER_BEHAVIOR: PlayerBehaviorState = {
  manualHunts: 0,
  manualRaids: 0,
  manualUpgrades: 0,
  skillActivations: 0,
  totalActions: 0,
  idleSeconds: 0,
  lastActionAt: 0,
  lastActionType: null,
};

export function getSmartSkillRecommendation(state: IdleGameState): ClassSkillId | null {
  if (!state.classId) return null;

  const skillIds: ClassSkillId[] = SKILLS_BY_CLASS[state.classId] ?? [];
  const enemyMaxHp = Math.max(1, state.enemyMaxHp || state.enemyHp || 1);
  const enemyHpPercent = state.enemyHp / enemyMaxHp;
  const bossStage = isBossStage(state.stage);
  const maxResource = CLASSES[state.classId]?.maxResource ?? 100;

  const usable = skillIds.filter((skillId: ClassSkillId) => {
    const definition = SKILL_DEFINITIONS[skillId];
    if (!definition || state.level < definition.unlockLevel) return false;
    if ((state.skillCooldowns[skillId] ?? 0) > 0) return false;
    return state.resource >= definition.resourceCost;
  });

  const scored = usable
    .map((skillId: ClassSkillId) => {
      const definition = SKILL_DEFINITIONS[skillId];
      let priority = definition.unlockLevel;

      if (definition.effect.type === "instant_kill") {
        priority += enemyHpPercent <= definition.effect.value ? 100 : -20;
      }

      if (definition.effect.type === "burst_dps") {
        priority += bossStage ? 80 : 30;
      }

      if (definition.effect.type === "buff_dps" || definition.effect.type === "buff_crit") {
        priority += bossStage || enemyHpPercent > 0.55 ? 55 : 20;
      }

      if (definition.effect.type === "buff_regen") {
        priority += state.resource < maxResource * 0.45 ? 50 : 10;
      }

      return { skillId, priority };
    })
    .sort((a, b) => b.priority - a.priority);

  return scored[0]?.skillId ?? null;
}

export function getUpgradeRecommendations(
  state: IdleGameState,
  limit = 3,
): UpgradeRecommendation[] {
  const recommendations: UpgradeRecommendation[] = [];

  (Object.entries(HEROES) as [HeroId, (typeof HEROES)[HeroId]][]).forEach(([id, hero]) => {
    const level = state.heroLevels[id] ?? 0;
    const cost = getHeroCost(id, level);
    recommendations.push({
      id,
      kind: "hero",
      label: hero.name,
      cost,
      currency: "mesos",
      reason: level === 0 ? "Unlock more base DPS." : "Scale steady DPS.",
      priority: (hero.baseDps * Math.max(1, level + 1)) / Math.max(1, cost),
      affordable: state.mesos >= cost,
    });
  });

  (Object.entries(GEAR) as [GearId, (typeof GEAR)[GearId]][]).forEach(([id, gear]) => {
    const level = state.gearLevels[id] ?? 0;
    const cost = getGearCost(id, level);
    recommendations.push({
      id,
      kind: "gear",
      label: gear.name,
      cost,
      currency: "mesos",
      reason: "Improve account-wide combat scaling.",
      priority: gear.flatDps / Math.max(1, cost),
      affordable: state.mesos >= cost,
    });
  });

  (Object.entries(UPGRADES) as [UpgradeId, (typeof UPGRADES)[UpgradeId]][]).forEach(([id, upgrade]) => {
    const level = state.upgrades[id] ?? 0;
    const cost = getUpgradeCost(id, level);
    recommendations.push({
      id,
      kind: "upgrade",
      label: upgrade.name,
      cost,
      currency: "mesos",
      reason: "Best short-term DPS efficiency.",
      priority: (upgrade.boost * Math.max(1, level + 1)) / Math.max(1, cost),
      affordable: state.mesos >= cost,
    });
  });

  (Object.entries(SKILLS) as [SkillId, (typeof SKILLS)[SkillId]][]).forEach(([id, skill]) => {
    const level = state.skillLevels[id] ?? 0;
    const cost = getSkillCost(id, level);
    recommendations.push({
      id,
      kind: "skill",
      label: skill.name,
      cost,
      currency: "fame",
      reason: "Boost passive skill bonuses.",
      priority: skill.dpsMultiplier / Math.max(1, cost),
      affordable: state.fame >= cost,
    });
  });

  (Object.entries(GLOBAL_MULTIPLIERS) as [GlobalMultId, (typeof GLOBAL_MULTIPLIERS)[GlobalMultId]][]).forEach(([id, multiplier]) => {
    const level = state.globalMults[id] ?? 0;
    const cost = getGlobalMultCost(id, level);
    recommendations.push({
      id,
      kind: "global",
      label: multiplier.name,
      cost,
      currency: "crystals",
      reason: "Permanent account power.",
      priority: multiplier.effectPerLevel / Math.max(1, cost),
      affordable: state.crystals >= cost,
    });
  });

  return recommendations
    .sort((a, b) => Number(b.affordable) - Number(a.affordable) || b.priority - a.priority)
    .slice(0, limit);
}

function getUnlockedZonesForAi(state: IdleGameState): WorldZone[] {
  return ALL_ZONES.filter((zone) => getZoneUnlockStatus(zone, state).unlocked);
}

export function getAutoMapDecision(state: IdleGameState, playerPower: number): AutoMapDecision | null {
  const unlockedZones = getUnlockedZonesForAi(state);
  if (!unlockedZones.length) return null;

  const currentZone = unlockedZones.find((zone) => zone.id === state.zone) ?? unlockedZones[0];
  if (!currentZone) return null;

  const currentStatus = getPowerStatus(playerPower, getZonePowerRequirement(currentZone));
  if (currentStatus === "blocked" || currentStatus === "underpowered") {
    const fallbackZone = [...unlockedZones]
      .reverse()
      .find((zone) => getPowerStatus(playerPower, getZonePowerRequirement(zone)) !== "blocked");

    if (fallbackZone && fallbackZone.id !== currentZone.id) {
      return {
        targetZoneId: fallbackZone.id,
        mode: "farm",
        reason: `Too weak for ${currentZone.name}, farming ${fallbackZone.name}.`
      };
    }
  }

  const currentIndex = unlockedZones.findIndex((zone) => zone.id === currentZone.id);
  const nextZone = currentIndex >= 0 ? unlockedZones[currentIndex + 1] : null;
  if (nextZone) {
    const nextStatus = getPowerStatus(playerPower, getZonePowerRequirement(nextZone));
    if ((currentStatus === "overpowered" || state.stage >= 9) && (nextStatus === "overpowered" || nextStatus === "matched")) {
      return {
        targetZoneId: nextZone.id,
        mode: "push",
        reason: `Power is strong enough to push into ${nextZone.name}.`
      };
    }
  }

  return {
    targetZoneId: currentZone.id,
    mode: "hold",
    reason: `Current route ${currentZone.name} is balanced for progress.`
  };
}

export function getSmartUpgradeRecommendation(
  state: IdleGameState,
  playerPower: number,
  currentZone?: WorldZone | null
): UpgradeRecommendation | null {
  const powerStatus: PowerStatus = currentZone
    ? getPowerStatus(playerPower, getZonePowerRequirement(currentZone))
    : "matched";
  const recommendations = getUpgradeRecommendations(state, 12);
  if (!recommendations.length) return null;

  return recommendations
    .map((entry) => {
      let priority = entry.priority;

      if (powerStatus === "blocked" || powerStatus === "underpowered") {
        if (entry.kind === "gear") priority *= 1.5;
        if (entry.kind === "hero") priority *= 1.35;
        if (entry.kind === "upgrade") priority *= 1.3;
        if (entry.kind === "skill") priority *= 0.92;
        if (entry.kind === "global") priority *= 0.78;
      } else if (powerStatus === "overpowered") {
        if (entry.kind === "skill") priority *= 1.28;
        if (entry.kind === "global") priority *= 1.12;
        if (entry.kind === "hero") priority *= 1.08;
      } else {
        if (entry.kind === "upgrade") priority *= 1.18;
        if (entry.kind === "gear") priority *= 1.12;
      }

      if (!entry.affordable) priority *= 0.18;

      return { ...entry, priority };
    })
    .sort((a, b) => b.priority - a.priority)[0] ?? null;
}

export function getAdaptiveDifficultyMultiplier(state: IdleGameState): number {
  const actionPressure = Math.min(0.15, state.behavior.totalActions / 1200);
  const idleRelief = state.behavior.idleSeconds > 600 ? 0.08 : 0;
  const levelPressure = Math.min(0.12, Math.max(0, state.level - 25) / 500);
  return clamp(1 + actionPressure + levelPressure - idleRelief, 0.9, 1.25);
}

export function refreshAiState(state: IdleGameState): IdleGameState {
  const currentZone = ALL_ZONES.find((zone) => zone.id === state.zone) ?? null;
  const playerPower = state.leaderboardState?.bestPower ?? 0;
  const smartUpgrade = getSmartUpgradeRecommendation(state, playerPower, currentZone);
  return {
    ...state,
    ai: {
      ...DEFAULT_AI_STATE,
      ...state.ai,
      adaptiveDifficulty: getAdaptiveDifficultyMultiplier(state),
      upgradeRecommendations: [
        ...(smartUpgrade ? [smartUpgrade] : []),
        ...getUpgradeRecommendations(state, 3)
      ].filter((entry, index, list) => list.findIndex((candidate) => candidate.kind === entry.kind && candidate.id === entry.id) === index).slice(0, 3),
    },
  };
}

export function tickBehavior(state: IdleGameState, seconds: number): IdleGameState {
  return {
    ...state,
    behavior: {
      ...DEFAULT_PLAYER_BEHAVIOR,
      ...state.behavior,
      idleSeconds: Math.max(0, (state.behavior?.idleSeconds ?? 0) + seconds),
    },
  };
}

export function trackPlayerAction(
  state: IdleGameState,
  actionType: PlayerActionType,
  now = Date.now(),
): IdleGameState {
  const behavior = {
    ...DEFAULT_PLAYER_BEHAVIOR,
    ...state.behavior,
    idleSeconds: 0,
    lastActionAt: now,
    lastActionType: actionType,
    totalActions: (state.behavior?.totalActions ?? 0) + 1,
    manualHunts:
      (state.behavior?.manualHunts ?? 0) + (actionType === "hunt" ? 1 : 0),
    manualRaids:
      (state.behavior?.manualRaids ?? 0) + (actionType === "raid" ? 1 : 0),
    manualUpgrades:
      (state.behavior?.manualUpgrades ?? 0) + (actionType === "upgrade" ? 1 : 0),
    skillActivations:
      (state.behavior?.skillActivations ?? 0) + (actionType === "skill" ? 1 : 0),
  };

  return refreshAiState({ ...state, behavior });
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
