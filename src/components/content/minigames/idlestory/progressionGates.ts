/**
 * progressionGates.ts — Progression walls, power gates, elite enemies,
 * and reward spike calculations for IdleStory World.
 *
 * Design philosophy:
 *  - Early game (Lv.1–20): Forgiving. Players always move forward.
 *  - Mid game (Lv.20–80): Soft walls. Underpowered players slow to 25%.
 *  - Late game (Lv.80+): Hard gates. Must upgrade to continue.
 *  - Boss stages are the ultimate gate — underpowered = near-zero progress.
 *
 * No imports from gameEngine.ts (avoids circular dep). Uses local ZoneRef.
 */

// ─── Local zone interface (avoids circular dep with gameEngine) ───────────────

interface ZoneRef {
  requirement: number;
  rewardBoost: number;
}

// ─── Zone HP scaling ──────────────────────────────────────────────────────────

/**
 * Per-stage HP growth rate for a zone. Later zones scale steeper,
 * making each stage noticeably longer to clear.
 *
 * Lv.1   → 1.15× per stage
 * Lv.100 → 1.185× per stage
 * Lv.200 → 1.22× per stage
 */
export function getZoneGrowthRate(zoneRequirement: number): number {
  return 1.15 + (zoneRequirement / 1000) * 0.35;
}

/**
 * Boss HP multiplier per zone. Harder zones have tankier bosses.
 *
 * Lv.1   → 8× base HP
 * Lv.100 → 12× base HP
 * Lv.200 → 16× base HP
 */
export function getZoneBossHpMultiplier(zoneRequirement: number): number {
  return 8 + (zoneRequirement / 200) * 8;
}

// ─── Power requirements ───────────────────────────────────────────────────────

/**
 * The minimum player DPS needed to progress at full speed through a zone.
 * Below this threshold, progress slows progressively.
 *
 * Curve: exponential with zone level — early zones are forgiving,
 * late zones require real investment.
 */
export function getZonePowerRequirement(zone: ZoneRef): number {
  const { requirement } = zone;
  if (requirement <= 1) return 0; // Tutorial zone — no gate
  // Exponential scaling: ~50 at Lv.4, ~2K at Lv.40, ~50K at Lv.100, ~5M at Lv.200
  return Math.round(requirement * 5 * Math.pow(1.22, requirement / 12));
}

/**
 * The DPS needed to challenge the zone BOSS without significant resistance.
 * 2.5× the general zone requirement.
 */
export function getBossPowerRequirement(zone: ZoneRef): number {
  return Math.round(getZonePowerRequirement(zone) * 2.5);
}

// ─── Progression speed multiplier ────────────────────────────────────────────

export type PowerStatus = "overpowered" | "matched" | "underpowered" | "blocked";

/**
 * Returns the DPS multiplier (0.0–1.0) based on the ratio of
 * player power to zone requirement.
 *
 * Designed to feel like friction, not a hard stop — players can still
 * crawl through but will clearly feel they need to upgrade.
 *
 * 1.0  = 120%+ power  → full speed
 * 0.85 = 100–120%     → nearly full (minor resistance flavour)
 * 0.55 = 80–100%      → noticeable slowdown — "something's off"
 * 0.20 = 60–80%       → strong wall — "I need to upgrade"
 * 0.06 = 40–60%       → nearly stopped — "I'm stuck"
 * 0.01 = <40%         → completely walled — "cannot proceed"
 */
export function getProgressionMultiplier(playerDps: number, requiredDps: number): number {
  if (requiredDps <= 0) return 1.0;
  const ratio = playerDps / requiredDps;
  if (ratio >= 1.2) return 1.0;
  if (ratio >= 1.0) return 0.85;
  if (ratio >= 0.8) return 0.55;
  if (ratio >= 0.6) return 0.20;
  if (ratio >= 0.4) return 0.06;
  return 0.01;
}

/** Returns the boss-specific DPS multiplier (stricter than general gate). */
export function getBossProgressionMultiplier(playerDps: number, zone: ZoneRef): number {
  const bossReq = getBossPowerRequirement(zone);
  return getProgressionMultiplier(playerDps, bossReq);
}

export function getPowerStatus(playerDps: number, requiredDps: number): PowerStatus {
  if (requiredDps <= 0) return "matched";
  const ratio = playerDps / requiredDps;
  if (ratio >= 1.2) return "overpowered";
  if (ratio >= 0.8) return "matched";
  if (ratio >= 0.4) return "underpowered";
  return "blocked";
}

// ─── Elite enemies ────────────────────────────────────────────────────────────

/**
 * Every 5th non-boss stage spawns an elite enemy.
 * Elite stages: 5, 15, 25, 35, 45 … (multiples of 5 that aren't boss stages)
 */
export function isEliteStage(stage: number): boolean {
  return stage % 5 === 0 && stage % 10 !== 0;
}

/** Elite enemies have significantly more HP. */
export const ELITE_HP_MULTIPLIER = 3.5;

/** Per-kill reward multipliers for elite enemies. */
export const ELITE_MESOS_MULTIPLIER  = 6.0;
export const ELITE_XP_MULTIPLIER     = 4.5;
export const ELITE_FAME_MULTIPLIER   = 3.0;
export const ELITE_CRYSTAL_CHANCE    = 0.12; // 12% chance of +1 crystal

// ─── Boss kill reward spike ───────────────────────────────────────────────────

/**
 * XP rewarded as a burst on boss kill.
 * Scales with zone boost and stage number.
 * Early game: small bump. Late game: significant level-up momentum.
 */
export function calcBossXpSpike(
  zoneRewardBoost: number,
  stage: number,
  xpTarget: number
): number {
  const stageFactor = 1 + (stage / 200);
  return Math.round(xpTarget * 0.28 * zoneRewardBoost * stageFactor);
}

/**
 * Mesos rewarded as a burst on boss kill (on top of regular income).
 * Equivalent to ~18 seconds of full mesos income per boss.
 */
export function calcBossMesosSpike(
  mesosPerSecond: number,
  zoneRewardBoost: number,
  stage: number
): number {
  const stageFactor = 1 + (stage / 150);
  return Math.round(mesosPerSecond * 18 * zoneRewardBoost * stageFactor);
}

/** Fame burst on boss kill. */
export function calcBossFameSpike(zoneRewardBoost: number, stage: number, prestigeCount: number): number {
  return Math.round((10 + stage * 0.5 + prestigeCount * 2) * zoneRewardBoost);
}

// ─── Elite kill reward spike ──────────────────────────────────────────────────

export function calcEliteXpSpike(
  zoneRewardBoost: number,
  stage: number,
  xpTarget: number
): number {
  const stageFactor = 1 + (stage / 300);
  return Math.round(xpTarget * 0.07 * zoneRewardBoost * stageFactor);
}

export function calcEliteMesosSpike(
  mesosPerSecond: number,
  zoneRewardBoost: number
): number {
  return Math.round(mesosPerSecond * 5 * zoneRewardBoost);
}

// ─── Progression block reason (for UI) ───────────────────────────────────────

export type ProgressionHint = {
  reason: string;
  suggestion: string;
  urgency: "info" | "warning" | "danger" | "blocked";
};

export function getProgressionHint(
  playerDps: number,
  requiredDps: number
): ProgressionHint | null {
  if (requiredDps <= 0) return null;
  const ratio = playerDps / requiredDps;
  if (ratio >= 0.8) return null; // Not worth showing

  const shortfall = formatProgressionNumber(requiredDps - playerDps);

  if (ratio < 0.4) return {
    reason: `You need ${shortfall} more DPS to break through`,
    suggestion: "Upgrade heroes, gear, and skills before continuing",
    urgency: "blocked"
  };
  if (ratio < 0.6) return {
    reason: `${shortfall} DPS short — progress nearly halted`,
    suggestion: "Buy gear upgrades and train skills",
    urgency: "danger"
  };
  return {
    reason: `${shortfall} DPS short — progress is slowed`,
    suggestion: "A few hero or gear upgrades will help",
    urgency: "warning"
  };
}

function formatProgressionNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return `${Math.round(n)}`;
}
