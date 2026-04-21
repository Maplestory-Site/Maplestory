/**
 * powerSpikeSystem.ts — Milestone bonuses, boss-kill surge, and power rating.
 *
 * Design philosophy:
 *  - Every 5 levels the player gets a PERMANENT DPS/income multiplier.
 *  - Every 10 levels is a WOW milestone (2×+ DPS jump) that triggers a
 *    full-screen visual effect.
 *  - Killing a boss grants a 30-second DPS surge (tracked in IdleGameState)
 *    AND a free hero upgrade applied immediately.
 *  - Power Rating is a single visible number the player can brag about.
 *    It grows roughly 3-5× per WOW milestone.
 *
 * Import chain: only `import type` from gameEngine — no circular dep risk.
 * progressionSystem.ts imports the DPS/mesos mult helpers from here.
 */

// ─── Milestone definitions ────────────────────────────────────────────────────

export type MilestoneBonus = {
  /** Player level that triggers this milestone. */
  level: number;
  /** Short exciting label shown in the overlay. */
  label: string;
  /** What the player actually gets. */
  description: string;
  /** Emoji icon shown in the overlay. */
  icon: string;
  /**
   * Multiplicative DPS bonus applied permanently when this milestone is reached.
   * Stacks with all previous milestone mults.
   */
  dpsMult: number;
  /** Multiplicative mesos-per-second bonus. */
  mesosMult: number;
  /** True = triggers the big full-screen power-spike animation. */
  isWow: boolean;
};

export const MILESTONE_BONUSES: MilestoneBonus[] = [
  {
    level: 5,
    label: "Awakening",
    description: "+15% DPS",
    icon: "⚡",
    dpsMult: 1.15,
    mesosMult: 1.10,
    isWow: false
  },
  {
    level: 10,
    label: "POWER SURGE",
    description: "+50% DPS · Free Upgrade!",
    icon: "💥",
    dpsMult: 1.50,
    mesosMult: 1.25,
    isWow: true
  },
  {
    level: 15,
    label: "Awakening II",
    description: "+20% DPS · +15% Gold",
    icon: "⚡",
    dpsMult: 1.20,
    mesosMult: 1.15,
    isWow: false
  },
  {
    level: 20,
    label: "OVERDRIVE",
    description: "+100% DPS · +30% Gold",
    icon: "🌟",
    dpsMult: 2.00,
    mesosMult: 1.30,
    isWow: true
  },
  {
    level: 25,
    label: "Awakening III",
    description: "+25% DPS · +20% Gold",
    icon: "⚡",
    dpsMult: 1.25,
    mesosMult: 1.20,
    isWow: false
  },
  {
    level: 30,
    label: "BERSERKER",
    description: "+150% DPS · +40% Gold",
    icon: "🔥",
    dpsMult: 2.50,
    mesosMult: 1.40,
    isWow: true
  },
  {
    level: 35,
    label: "Awakening IV",
    description: "+30% DPS · +25% Gold",
    icon: "⚡",
    dpsMult: 1.30,
    mesosMult: 1.25,
    isWow: false
  },
  {
    level: 40,
    label: "TRANSCENDENCE",
    description: "+200% DPS · +50% Gold",
    icon: "✨",
    dpsMult: 3.00,
    mesosMult: 1.50,
    isWow: true
  },
  {
    level: 50,
    label: "GOD MODE",
    description: "+300% DPS · +60% Gold",
    icon: "💎",
    dpsMult: 4.00,
    mesosMult: 1.60,
    isWow: true
  },
  {
    level: 60,
    label: "ASCENDANCE",
    description: "+400% DPS · +70% Gold",
    icon: "🌌",
    dpsMult: 5.00,
    mesosMult: 1.70,
    isWow: true
  },
];

// ─── Milestone helpers ────────────────────────────────────────────────────────

/** True if `level` is a milestone level. */
export function isMilestoneLevel(level: number): boolean {
  return MILESTONE_BONUSES.some(m => m.level === level);
}

/** Returns the milestone definition for a specific level, or null. */
export function getMilestoneAtLevel(level: number): MilestoneBonus | null {
  return MILESTONE_BONUSES.find(m => m.level === level) ?? null;
}

/** Returns the next milestone above the current level, or null. */
export function getNextMilestone(level: number): MilestoneBonus | null {
  return MILESTONE_BONUSES.find(m => m.level > level) ?? null;
}

/**
 * Cumulative DPS multiplier from all milestones the player has reached.
 * Fully deterministic — computable from level alone.
 *
 * Examples:
 *  level  5 → 1.15×
 *  level 10 → 1.15 × 1.50 = 1.725×
 *  level 20 → 1.15 × 1.50 × 1.20 × 2.00 = 4.14×
 */
export function getMilestoneDpsMult(level: number): number {
  return MILESTONE_BONUSES
    .filter(m => level >= m.level)
    .reduce((acc, m) => acc * m.dpsMult, 1.0);
}

/**
 * Cumulative mesos/income multiplier from all reached milestones.
 * level 10 → 1.10 × 1.25 = 1.375×
 * level 20 → … × 1.15 × 1.30 = 2.06×
 */
export function getMilestoneMesosMult(level: number): number {
  return MILESTONE_BONUSES
    .filter(m => level >= m.level)
    .reduce((acc, m) => acc * m.mesosMult, 1.0);
}

// ─── Boss-kill surge ──────────────────────────────────────────────────────────

/**
 * Duration of the boss-kill DPS surge (tracked in `state.bossSurgeSecondsLeft`).
 * Set to this value in gameTick whenever bossesKilled > 0.
 */
export const BOSS_SURGE_SECONDS = 30;

/**
 * DPS multiplier active while `state.bossSurgeSecondsLeft > 0`.
 * Stacks on top of all other multipliers — killing a boss genuinely doubles
 * combat speed for half a minute.
 */
export const BOSS_SURGE_DPS_MULT = 2.0;

// ─── Power Rating ─────────────────────────────────────────────────────────────

/**
 * A single visible "Power" number the player can track.
 *
 * Formula: √DPS × level × 12 × prestigeBoost
 *
 * Growth examples (raw, before prestige):
 *  DPS  4,  level  1 →     24  (start)
 *  DPS 35,  level  5 →    355  (after Awakening milestone)
 *  DPS 90,  level 10 →  1,140  (after Power Surge milestone)  ← ~3× jump
 *  DPS500,  level 20 →  5,376  (after Overdrive milestone)    ← ~4.7× jump
 *
 * At prestige ×1 every value is multiplied by 1.4.
 */
export function calculatePowerRating(
  dps: number,
  level: number,
  prestigeCount: number
): number {
  if (level <= 0 || dps <= 0) return 0;
  const prestigeBoost = 1 + prestigeCount * 0.4;
  return Math.floor(Math.sqrt(dps) * level * 12 * prestigeBoost);
}

/**
 * Format power rating for display (K / M suffix).
 */
export function formatPowerRating(power: number): string {
  if (power >= 1_000_000) return `${(power / 1_000_000).toFixed(2)}M`;
  if (power >= 1_000)     return `${(power / 1_000).toFixed(1)}K`;
  return String(power);
}

/**
 * A tier label for the current power rating — shown next to the number.
 */
export function getPowerTier(power: number): { label: string; color: string } {
  if (power >= 1_000_000) return { label: "Mythic",   color: "#e879f9" };
  if (power >= 100_000)   return { label: "Legendary",color: "#f59e0b" };
  if (power >= 10_000)    return { label: "Epic",     color: "#818cf8" };
  if (power >= 1_000)     return { label: "Rare",     color: "#38bdf8" };
  if (power >= 100)       return { label: "Uncommon", color: "#4ade80" };
  return                         { label: "Common",   color: "#94a3b8" };
}
