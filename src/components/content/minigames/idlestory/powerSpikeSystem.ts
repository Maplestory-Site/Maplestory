/**
 * Milestone bonuses, boss-kill surge, and power rating.
 */

export type MilestoneBonus = {
  level: number;
  label: string;
  description: string;
  icon: string;
  dpsMult: number;
  mesosMult: number;
  isWow: boolean;
};

export const MILESTONE_BONUSES: MilestoneBonus[] = [
  {
    level: 5,
    label: "Awakening",
    description: "+8% DPS",
    icon: "⚡",
    dpsMult: 1.06,
    mesosMult: 1.04,
    isWow: false
  },
  {
    level: 10,
    label: "POWER SURGE",
    description: "+18% DPS · Free Upgrade!",
    icon: "💥",
    dpsMult: 1.14,
    mesosMult: 1.08,
    isWow: true
  },
  {
    level: 15,
    label: "Awakening II",
    description: "+10% DPS · +8% Gold",
    icon: "⚡",
    dpsMult: 1.08,
    mesosMult: 1.06,
    isWow: false
  },
  {
    level: 20,
    label: "OVERDRIVE",
    description: "+28% DPS · +14% Gold",
    icon: "🌟",
    dpsMult: 1.22,
    mesosMult: 1.1,
    isWow: true
  },
  {
    level: 25,
    label: "Awakening III",
    description: "+12% DPS · +10% Gold",
    icon: "⚡",
    dpsMult: 1.09,
    mesosMult: 1.07,
    isWow: false
  },
  {
    level: 30,
    label: "BERSERKER",
    description: "+35% DPS · +16% Gold",
    icon: "🔥",
    dpsMult: 1.25,
    mesosMult: 1.12,
    isWow: true
  },
  {
    level: 35,
    label: "Awakening IV",
    description: "+14% DPS · +12% Gold",
    icon: "⚡",
    dpsMult: 1.1,
    mesosMult: 1.08,
    isWow: false
  },
  {
    level: 40,
    label: "TRANSCENDENCE",
    description: "+45% DPS · +18% Gold",
    icon: "✨",
    dpsMult: 1.3,
    mesosMult: 1.14,
    isWow: true
  },
  {
    level: 50,
    label: "GOD MODE",
    description: "+60% DPS · +22% Gold",
    icon: "💎",
    dpsMult: 1.42,
    mesosMult: 1.18,
    isWow: true
  },
  {
    level: 60,
    label: "ASCENDANCE",
    description: "+75% DPS · +26% Gold",
    icon: "🌌",
    dpsMult: 1.55,
    mesosMult: 1.22,
    isWow: true
  }
];

export function isMilestoneLevel(level: number): boolean {
  return MILESTONE_BONUSES.some((m) => m.level === level);
}

export function getMilestoneAtLevel(level: number): MilestoneBonus | null {
  return MILESTONE_BONUSES.find((m) => m.level === level) ?? null;
}

export function getNextMilestone(level: number): MilestoneBonus | null {
  return MILESTONE_BONUSES.find((m) => m.level > level) ?? null;
}

export function getMilestoneDpsMult(level: number): number {
  return MILESTONE_BONUSES
    .filter((m) => level >= m.level)
    .reduce((acc, m) => acc * m.dpsMult, 1);
}

export function getMilestoneMesosMult(level: number): number {
  return MILESTONE_BONUSES
    .filter((m) => level >= m.level)
    .reduce((acc, m) => acc * m.mesosMult, 1);
}

export const BOSS_SURGE_SECONDS = 15;
export const BOSS_SURGE_DPS_MULT = 1.4;

export function calculatePowerRating(
  dps: number,
  level: number,
  prestigeCount: number
): number {
  if (level <= 0 || dps <= 0) return 0;
  const prestigeBoost = 1 + prestigeCount * 0.4;
  return Math.floor(Math.sqrt(dps) * level * 12 * prestigeBoost);
}

export function formatPowerRating(power: number): string {
  if (power >= 1_000_000) return `${(power / 1_000_000).toFixed(2)}M`;
  if (power >= 1_000) return `${(power / 1_000).toFixed(1)}K`;
  return String(power);
}

export function getPowerTier(power: number): { label: string; color: string } {
  if (power >= 1_000_000) return { label: "Mythic", color: "#e879f9" };
  if (power >= 100_000) return { label: "Legendary", color: "#f59e0b" };
  if (power >= 10_000) return { label: "Epic", color: "#818cf8" };
  if (power >= 1_000) return { label: "Rare", color: "#38bdf8" };
  if (power >= 100) return { label: "Uncommon", color: "#4ade80" };
  return { label: "Common", color: "#94a3b8" };
}

