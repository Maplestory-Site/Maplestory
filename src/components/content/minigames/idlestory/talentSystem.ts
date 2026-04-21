/**
 * IdleStory World — Talent System
 *
 * Permanent talent tree that persists through ALL resets (prestige and rebirth).
 * Talent points: +1 per prestige, +3 per rebirth.
 *
 * Tree layout — 4 branches, 3-4 nodes each:
 *   ⚔  Combat      — DPS bonuses
 *   💰  Economy     — gold/income bonuses
 *   ⭐  Progression — XP and crystal bonuses
 *   🌟  Mastery     — global bonuses (requires prestige ≥ 1 to unlock)
 *
 * All bonus getters are pure and import-free (no gameEngine dep at runtime).
 * canUnlockTalent uses import type only — safe from circular deps.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type TalentNodeId =
  // Combat branch
  | "power_I" | "power_II" | "crit_focus" | "berserker"
  // Economy branch
  | "gold_I" | "gold_II" | "loot_finder" | "wealth_aura"
  // Progression branch
  | "xp_I" | "xp_II" | "crystal_sense" | "ascension"
  // Mastery branch (prestige-gated)
  | "mastery_I" | "mastery_II" | "eternal_power";

export type TalentBranchId = "combat" | "economy" | "progression" | "mastery";

export type TalentBonusType = "dps" | "gold" | "xp" | "crystal" | "all";

export type TalentNode = {
  id: TalentNodeId;
  branch: TalentBranchId;
  /** Row position within the branch (0 = top). */
  row: number;
  name: string;
  description: string;
  icon: string;
  /** Talent points to unlock this node. */
  cost: number;
  /** IDs of nodes that must be unlocked before this one. */
  requires?: TalentNodeId[];
  /** Minimum prestige count needed to see and unlock this node. */
  requiresPrestige?: number;
  /** Minimum rebirth count needed to unlock this node. */
  requiresRebirth?: number;
  /** Which stat family this bonus applies to. */
  bonusType: TalentBonusType;
  /**
   * Fractional additive bonus (0.10 = +10 %).
   * Summed across all unlocked nodes of matching type, then applied as
   * a single (1 + sum) multiplier.
   */
  bonusValue: number;
};

// ─── Branch metadata (for UI headers) ────────────────────────────────────────

export type TalentBranchDef = {
  id: TalentBranchId;
  name: string;
  icon: string;
  color: string;
};

export const TALENT_BRANCHES: Record<TalentBranchId, TalentBranchDef> = {
  combat:      { id: "combat",      name: "Combat",      icon: "⚔",  color: "#f87171" },
  economy:     { id: "economy",     name: "Economy",     icon: "💰", color: "#fbbf24" },
  progression: { id: "progression", name: "Progression", icon: "⭐", color: "#60a5fa" },
  mastery:     { id: "mastery",     name: "Mastery",     icon: "🌟", color: "#c084fc" }
};

// ─── Node definitions ─────────────────────────────────────────────────────────

export const TALENT_NODES: Record<TalentNodeId, TalentNode> = {

  // ── Combat branch ──────────────────────────────────────────────────────────

  power_I: {
    id: "power_I",
    branch: "combat",
    row: 0,
    name: "Power Training I",
    description: "+10% total DPS",
    icon: "💪",
    cost: 1,
    bonusType: "dps",
    bonusValue: 0.10
  },

  power_II: {
    id: "power_II",
    branch: "combat",
    row: 1,
    name: "Power Training II",
    description: "+20% total DPS",
    icon: "⚔",
    cost: 2,
    requires: ["power_I"],
    bonusType: "dps",
    bonusValue: 0.20
  },

  crit_focus: {
    id: "crit_focus",
    branch: "combat",
    row: 2,
    name: "Critical Focus",
    description: "+15% total DPS",
    icon: "🎯",
    cost: 2,
    requires: ["power_I"],
    bonusType: "dps",
    bonusValue: 0.15
  },

  berserker: {
    id: "berserker",
    branch: "combat",
    row: 3,
    name: "Berserker",
    description: "+30% total DPS",
    icon: "🔥",
    cost: 3,
    requires: ["power_II", "crit_focus"],
    bonusType: "dps",
    bonusValue: 0.30
  },

  // ── Economy branch ─────────────────────────────────────────────────────────

  gold_I: {
    id: "gold_I",
    branch: "economy",
    row: 0,
    name: "Trade Routes I",
    description: "+12% gold income",
    icon: "🪙",
    cost: 1,
    bonusType: "gold",
    bonusValue: 0.12
  },

  gold_II: {
    id: "gold_II",
    branch: "economy",
    row: 1,
    name: "Trade Routes II",
    description: "+22% gold income",
    icon: "💵",
    cost: 2,
    requires: ["gold_I"],
    bonusType: "gold",
    bonusValue: 0.22
  },

  loot_finder: {
    id: "loot_finder",
    branch: "economy",
    row: 2,
    name: "Loot Finder",
    description: "+12% gold income",
    icon: "🎁",
    cost: 2,
    requires: ["gold_I"],
    bonusType: "gold",
    bonusValue: 0.12
  },

  wealth_aura: {
    id: "wealth_aura",
    branch: "economy",
    row: 3,
    name: "Wealth Aura",
    description: "+30% gold income",
    icon: "👑",
    cost: 3,
    requires: ["gold_II", "loot_finder"],
    bonusType: "gold",
    bonusValue: 0.30
  },

  // ── Progression branch ─────────────────────────────────────────────────────

  xp_I: {
    id: "xp_I",
    branch: "progression",
    row: 0,
    name: "Swift Learner I",
    description: "+12% XP gain",
    icon: "📚",
    cost: 1,
    bonusType: "xp",
    bonusValue: 0.12
  },

  xp_II: {
    id: "xp_II",
    branch: "progression",
    row: 1,
    name: "Swift Learner II",
    description: "+22% XP gain",
    icon: "🎓",
    cost: 2,
    requires: ["xp_I"],
    bonusType: "xp",
    bonusValue: 0.22
  },

  crystal_sense: {
    id: "crystal_sense",
    branch: "progression",
    row: 2,
    name: "Crystal Sense",
    description: "+15% crystal gain",
    icon: "💠",
    cost: 2,
    requires: ["xp_I"],
    bonusType: "crystal",
    bonusValue: 0.15
  },

  ascension: {
    id: "ascension",
    branch: "progression",
    row: 3,
    name: "Ascension",
    description: "+25% XP gain",
    icon: "🚀",
    cost: 3,
    requires: ["xp_II", "crystal_sense"],
    bonusType: "xp",
    bonusValue: 0.25
  },

  // ── Mastery branch (prestige-gated) ────────────────────────────────────────

  mastery_I: {
    id: "mastery_I",
    branch: "mastery",
    row: 0,
    name: "Battle Mastery",
    description: "+8% all stats",
    icon: "🛡",
    cost: 2,
    requiresPrestige: 1,
    bonusType: "all",
    bonusValue: 0.08
  },

  mastery_II: {
    id: "mastery_II",
    branch: "mastery",
    row: 1,
    name: "Elder Mastery",
    description: "+12% all stats",
    icon: "🌿",
    cost: 3,
    requires: ["mastery_I"],
    bonusType: "all",
    bonusValue: 0.12
  },

  eternal_power: {
    id: "eternal_power",
    branch: "mastery",
    row: 2,
    name: "Eternal Power",
    description: "+20% all stats",
    icon: "✨",
    cost: 4,
    requires: ["mastery_II"],
    requiresRebirth: 1,
    bonusType: "all",
    bonusValue: 0.20
  }
};

// ─── Branch-ordered node lists (for layout) ───────────────────────────────────

export const TALENT_BRANCH_NODES: Record<TalentBranchId, TalentNodeId[]> = {
  combat:      ["power_I", "power_II", "crit_focus", "berserker"],
  economy:     ["gold_I",  "gold_II",  "loot_finder", "wealth_aura"],
  progression: ["xp_I",   "xp_II",    "crystal_sense", "ascension"],
  mastery:     ["mastery_I", "mastery_II", "eternal_power"]
};

// ─── Point economy constants ──────────────────────────────────────────────────

/** Talent points earned per prestige. */
export const TALENT_POINTS_PER_PRESTIGE = 1;

/** Talent points earned per rebirth. */
export const TALENT_POINTS_PER_REBIRTH = 3;

// ─── Pure bonus getters ───────────────────────────────────────────────────────
// All take only `Partial<Record<TalentNodeId, boolean>>` — no IdleGameState dep.

function _sumBonus(
  nodes: Partial<Record<TalentNodeId, boolean>>,
  types: TalentBonusType[]
): number {
  let bonus = 0;
  for (const def of Object.values(TALENT_NODES)) {
    if (!nodes[def.id]) continue;
    if (types.includes(def.bonusType)) {
      bonus += def.bonusValue;
    }
  }
  return bonus;
}

/** Multiplicative DPS multiplier from all unlocked talent nodes. */
export function getTalentDpsMult(nodes: Partial<Record<TalentNodeId, boolean>>): number {
  return 1 + _sumBonus(nodes, ["dps", "all"]);
}

/** Multiplicative gold income multiplier from all unlocked talent nodes. */
export function getTalentGoldMult(nodes: Partial<Record<TalentNodeId, boolean>>): number {
  return 1 + _sumBonus(nodes, ["gold", "all"]);
}

/** Multiplicative XP gain multiplier from all unlocked talent nodes. */
export function getTalentXpMult(nodes: Partial<Record<TalentNodeId, boolean>>): number {
  return 1 + _sumBonus(nodes, ["xp", "all"]);
}

/** Multiplicative crystal gain multiplier from all unlocked talent nodes. */
export function getTalentCrystalMult(nodes: Partial<Record<TalentNodeId, boolean>>): number {
  return 1 + _sumBonus(nodes, ["crystal", "all"]);
}

// ─── Unlock check ─────────────────────────────────────────────────────────────

export type TalentUnlockCheck = {
  canUnlock: boolean;
  reason: string | null;
};

/**
 * Returns whether a node can be unlocked given the current state.
 * All parameters are primitive to avoid importing IdleGameState at runtime.
 */
export function canUnlockTalent(
  nodeId: TalentNodeId,
  talentNodes: Partial<Record<TalentNodeId, boolean>>,
  talentPoints: number,
  prestigeCount: number,
  rebirthCount: number
): TalentUnlockCheck {
  const def = TALENT_NODES[nodeId];

  if (talentNodes[nodeId]) {
    return { canUnlock: false, reason: "Already unlocked." };
  }

  // Prestige gate
  if (def.requiresPrestige !== undefined && prestigeCount < def.requiresPrestige) {
    return {
      canUnlock: false,
      reason: `Requires ${def.requiresPrestige} prestige${def.requiresPrestige !== 1 ? "s" : ""} (have ${prestigeCount}).`
    };
  }

  // Rebirth gate
  if (def.requiresRebirth !== undefined && rebirthCount < def.requiresRebirth) {
    return {
      canUnlock: false,
      reason: `Requires ${def.requiresRebirth} rebirth${def.requiresRebirth !== 1 ? "s" : ""} (have ${rebirthCount}).`
    };
  }

  // Prerequisite nodes
  if (def.requires) {
    for (const req of def.requires) {
      if (!talentNodes[req]) {
        return {
          canUnlock: false,
          reason: `Requires ${TALENT_NODES[req].name} first.`
        };
      }
    }
  }

  // Point cost
  if (talentPoints < def.cost) {
    return {
      canUnlock: false,
      reason: `Need ${def.cost} talent point${def.cost !== 1 ? "s" : ""} (have ${talentPoints}).`
    };
  }

  return { canUnlock: true, reason: null };
}

/**
 * Returns the result of buying a talent node.
 * (Caller applies state changes — this is a pure validation + message helper.)
 */
export function getTalentBuyResult(
  nodeId: TalentNodeId,
  talentNodes: Partial<Record<TalentNodeId, boolean>>,
  talentPoints: number,
  prestigeCount: number,
  rebirthCount: number
): { success: boolean; message: string; cost: number } {
  const def = TALENT_NODES[nodeId];
  const check = canUnlockTalent(nodeId, talentNodes, talentPoints, prestigeCount, rebirthCount);

  if (!check.canUnlock) {
    return { success: false, message: check.reason ?? "Cannot unlock.", cost: def.cost };
  }

  return {
    success: true,
    message: `${def.icon} ${def.name} unlocked! ${def.description}`,
    cost: def.cost
  };
}

// ─── Total stats preview ──────────────────────────────────────────────────────

export type TalentStats = {
  dpsMult: number;
  goldMult: number;
  xpMult: number;
  crystalMult: number;
  unlockedCount: number;
  totalNodes: number;
};

export function getTalentStats(nodes: Partial<Record<TalentNodeId, boolean>>): TalentStats {
  return {
    dpsMult:      getTalentDpsMult(nodes),
    goldMult:     getTalentGoldMult(nodes),
    xpMult:       getTalentXpMult(nodes),
    crystalMult:  getTalentCrystalMult(nodes),
    unlockedCount: Object.values(nodes).filter(Boolean).length,
    totalNodes:   Object.keys(TALENT_NODES).length
  };
}
