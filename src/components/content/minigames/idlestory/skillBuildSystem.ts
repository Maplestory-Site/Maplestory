import type { ClassId, ClassSkillId, IdleGameState } from "./gameEngine";

export type BuildFocusId = "crit" | "speed" | "tank" | "skill";

export type SkillBranchId =
  | "berserker_cry" | "war_banner"
  | "iron_bulwark" | "rally_guard"
  | "giant_slayer" | "blood_harvest"
  | "ember_lance" | "scorch_mark"
  | "mana_storm" | "echo_nova"
  | "overflow_core" | "rune_focus"
  | "suppressing_volley" | "featherstep"
  | "eagle_eye" | "chain_shot"
  | "assassin_instinct" | "blur_motion";

export type SkillBuildModifiers = {
  passiveDpsMult: number;
  attackSpeedMult: number;
  cooldownRecoveryMult: number;
  resourceCostMult: number;
  skillDamageMult: number;
  resourceRegenMult: number;
  buffDurationMult: number;
  critChargeBonus: number;
  executeThresholdBonus: number;
  bossDamageMult: number;
  eliteDamageMult: number;
};

export type BuildFocusDefinition = {
  id: BuildFocusId;
  name: string;
  summary: string;
  modifiers: Partial<SkillBuildModifiers>;
};

export type SkillBranchDefinition = {
  id: SkillBranchId;
  skillId: ClassSkillId;
  name: string;
  summary: string;
  modifiers: Partial<SkillBuildModifiers>;
};

type SkillBranchRecord = Record<ClassSkillId, [SkillBranchDefinition, SkillBranchDefinition]>;

const BASE_BUILD_MODIFIERS: SkillBuildModifiers = {
  passiveDpsMult: 1,
  attackSpeedMult: 1,
  cooldownRecoveryMult: 1,
  resourceCostMult: 1,
  skillDamageMult: 1,
  resourceRegenMult: 1,
  buffDurationMult: 1,
  critChargeBonus: 0,
  executeThresholdBonus: 0,
  bossDamageMult: 1,
  eliteDamageMult: 1
};

export const BUILD_FOCUS_DEFINITIONS: Record<BuildFocusId, BuildFocusDefinition> = {
  crit: {
    id: "crit",
    name: "Crit Build",
    summary: "Big spikes, stronger finishers, heavier burst windows.",
    modifiers: { passiveDpsMult: 1.08, skillDamageMult: 1.12, critChargeBonus: 1, bossDamageMult: 1.05 }
  },
  speed: {
    id: "speed",
    name: "Speed Build",
    summary: "Faster cycling, smoother loops, higher uptime on skills.",
    modifiers: { attackSpeedMult: 1.18, cooldownRecoveryMult: 1.24, resourceRegenMult: 1.12, resourceCostMult: 0.92 }
  },
  tank: {
    id: "tank",
    name: "Tank Build",
    summary: "Safer sustain, longer buffs, better boss pressure.",
    modifiers: { passiveDpsMult: 1.04, resourceRegenMult: 1.22, buffDurationMult: 1.2, bossDamageMult: 1.1, eliteDamageMult: 1.08 }
  },
  skill: {
    id: "skill",
    name: "Skill Build",
    summary: "Lean into activations, cheaper casts, stronger effects.",
    modifiers: { cooldownRecoveryMult: 1.16, resourceCostMult: 0.84, skillDamageMult: 1.2, buffDurationMult: 1.08 }
  }
};

export const SKILL_BRANCHES: SkillBranchRecord = {
  battle_cry: [
    { id: "berserker_cry", skillId: "battle_cry", name: "Berserker Cry", summary: "Shorter roar with heavier burst.", modifiers: { skillDamageMult: 1.18, buffDurationMult: 0.82 } },
    { id: "war_banner", skillId: "battle_cry", name: "War Banner", summary: "Longer uptime and steadier class DPS.", modifiers: { passiveDpsMult: 1.08, buffDurationMult: 1.22 } }
  ],
  shield_wall: [
    { id: "iron_bulwark", skillId: "shield_wall", name: "Iron Bulwark", summary: "Thicker sustain and better boss grinding.", modifiers: { resourceRegenMult: 1.24, bossDamageMult: 1.08 } },
    { id: "rally_guard", skillId: "shield_wall", name: "Rally Guard", summary: "Faster loop with longer defensive uptime.", modifiers: { attackSpeedMult: 1.08, buffDurationMult: 1.18 } }
  ],
  execute: [
    { id: "giant_slayer", skillId: "execute", name: "Giant Slayer", summary: "Higher execute threshold against elites and bosses.", modifiers: { executeThresholdBonus: 0.08, bossDamageMult: 1.1, eliteDamageMult: 1.08 } },
    { id: "blood_harvest", skillId: "execute", name: "Blood Harvest", summary: "Cheaper, faster executes for grind-heavy routes.", modifiers: { cooldownRecoveryMult: 1.14, resourceCostMult: 0.78 } }
  ],
  fireball: [
    { id: "ember_lance", skillId: "fireball", name: "Ember Lance", summary: "Hits much harder, tuned for nuke windows.", modifiers: { skillDamageMult: 1.2, resourceCostMult: 1.08 } },
    { id: "scorch_mark", skillId: "fireball", name: "Scorch Mark", summary: "Adds sustained pressure and faster rotations.", modifiers: { passiveDpsMult: 1.06, cooldownRecoveryMult: 1.12 } }
  ],
  arcane_nova: [
    { id: "mana_storm", skillId: "arcane_nova", name: "Mana Storm", summary: "High-cost burst for boss breakpoints.", modifiers: { skillDamageMult: 1.24, bossDamageMult: 1.08, resourceCostMult: 1.12 } },
    { id: "echo_nova", skillId: "arcane_nova", name: "Echo Nova", summary: "Smaller novas, but much more often.", modifiers: { cooldownRecoveryMult: 1.2, resourceCostMult: 0.88 } }
  ],
  mana_surge: [
    { id: "overflow_core", skillId: "mana_surge", name: "Overflow Core", summary: "Huge mana surge for burst chains.", modifiers: { resourceRegenMult: 1.28, buffDurationMult: 0.88 } },
    { id: "rune_focus", skillId: "mana_surge", name: "Rune Focus", summary: "Longer calm window with cheaper skills.", modifiers: { buffDurationMult: 1.24, resourceCostMult: 0.82 } }
  ],
  rapid_fire: [
    { id: "suppressing_volley", skillId: "rapid_fire", name: "Suppressing Volley", summary: "Bigger barrage that shreds elites.", modifiers: { skillDamageMult: 1.16, eliteDamageMult: 1.12 } },
    { id: "featherstep", skillId: "rapid_fire", name: "Featherstep", summary: "Keeps the archer moving with nonstop tempo.", modifiers: { attackSpeedMult: 1.16, cooldownRecoveryMult: 1.12 } }
  ],
  snipe: [
    { id: "eagle_eye", skillId: "snipe", name: "Eagle Eye", summary: "Harder burst and stronger crit payoff.", modifiers: { skillDamageMult: 1.2, critChargeBonus: 1, bossDamageMult: 1.06 } },
    { id: "chain_shot", skillId: "snipe", name: "Chain Shot", summary: "Lower downtime and lighter resource use.", modifiers: { cooldownRecoveryMult: 1.18, resourceCostMult: 0.86 } }
  ],
  shadow_step: [
    { id: "assassin_instinct", skillId: "shadow_step", name: "Assassin Instinct", summary: "More crit charges and stronger burst windows.", modifiers: { critChargeBonus: 2, skillDamageMult: 1.08 } },
    { id: "blur_motion", skillId: "shadow_step", name: "Blur Motion", summary: "Longer stealth rhythm with speed scaling.", modifiers: { buffDurationMult: 1.26, attackSpeedMult: 1.1 } }
  ]
};

export function getDefaultBuildFocus(classId: ClassId | null | undefined): BuildFocusId {
  if (classId === "warrior") return "tank";
  if (classId === "mage") return "skill";
  if (classId === "archer") return "crit";
  return "speed";
}

export function getSkillBranchOptions(skillId: ClassSkillId): SkillBranchDefinition[] {
  return [...SKILL_BRANCHES[skillId]];
}

export function getSelectedSkillBranch(
  state: Pick<IdleGameState, "skillBranches">,
  skillId: ClassSkillId
): SkillBranchDefinition | null {
  const branchId = state.skillBranches?.[skillId];
  if (!branchId) return null;
  return SKILL_BRANCHES[skillId].find((branch) => branch.id === branchId) ?? null;
}

export function getSkillBuildBonuses(
  state: Pick<IdleGameState, "buildFocus" | "skillBranches">
): SkillBuildModifiers {
  const merged: SkillBuildModifiers = { ...BASE_BUILD_MODIFIERS };
  const focus = BUILD_FOCUS_DEFINITIONS[state.buildFocus] ?? BUILD_FOCUS_DEFINITIONS.speed;
  applyModifiers(merged, focus.modifiers);

  for (const skillId of Object.keys(SKILL_BRANCHES) as ClassSkillId[]) {
    const branch = getSelectedSkillBranch(state, skillId);
    if (branch) applyModifiers(merged, branch.modifiers);
  }

  return merged;
}

function applyModifiers(target: SkillBuildModifiers, modifiers: Partial<SkillBuildModifiers>): void {
  const multiplicativeKeys: Array<keyof SkillBuildModifiers> = [
    "passiveDpsMult",
    "attackSpeedMult",
    "cooldownRecoveryMult",
    "resourceCostMult",
    "skillDamageMult",
    "resourceRegenMult",
    "buffDurationMult",
    "bossDamageMult",
    "eliteDamageMult"
  ];

  for (const key of multiplicativeKeys) {
    if (modifiers[key] != null) target[key] *= modifiers[key] as number;
  }

  target.critChargeBonus += modifiers.critChargeBonus ?? 0;
  target.executeThresholdBonus += modifiers.executeThresholdBonus ?? 0;
}
