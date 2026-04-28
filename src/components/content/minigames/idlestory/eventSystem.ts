/**
 * eventSystem.ts — Random world events for IdleStory World.
 *
 * Fires short-lived events that give players a burst of excitement:
 * bonus gold, XP, DPS, or crystal drops for 30-60 seconds.
 *
 * Design goals:
 *  • Rare enough to feel special (~every 2-3 minutes of play on average)
 *  • Never overlapping — max one active event at a time
 *  • Pure functions — no React, no side effects
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type WorldEventId =
  | "golden_slime"
  | "double_xp"
  | "treasure_portal"
  | "frenzy_mode"
  | "star_burst";

export type WorldEventMultipliers = {
  mesosMult: number;
  xpMult: number;
  dpsMult: number;
  crystalMult: number;
};

export type WorldEvent = {
  /** Unique instance id — changes each time the event fires. */
  id: string;
  eventId: WorldEventId;
  label: string;
  icon: string;
  color: string;
  description: string;
  multipliers: WorldEventMultipliers;
  durationSeconds: number;
  remainingSeconds: number;
  triggeredAt: number;
};

// ─── Event pool ───────────────────────────────────────────────────────────────

type EventDefinition = {
  eventId: WorldEventId;
  label: string;
  icon: string;
  color: string;
  description: string;
  multipliers: WorldEventMultipliers;
  durationSeconds: number;
  /** Relative chance in the weighted pool. Higher = more common. */
  weight: number;
};

const EVENT_POOL: EventDefinition[] = [
  {
    eventId: "golden_slime",
    label: "Golden Slime Invasion!",
    icon: "✨",
    color: "#f5c842",
    description: "Gold drops tripled for a limited time!",
    multipliers: { mesosMult: 3.0, xpMult: 1.0, dpsMult: 1.0, crystalMult: 1.0 },
    durationSeconds: 45,
    weight: 30
  },
  {
    eventId: "double_xp",
    label: "Double EXP Event!",
    icon: "⚡",
    color: "#818cf8",
    description: "All experience doubled — level up fast!",
    multipliers: { mesosMult: 1.0, xpMult: 2.5, dpsMult: 1.0, crystalMult: 1.0 },
    durationSeconds: 60,
    weight: 28
  },
  {
    eventId: "treasure_portal",
    label: "Treasure Portal Opened!",
    icon: "💎",
    color: "#38bdf8",
    description: "Crystal drops greatly increased!",
    multipliers: { mesosMult: 1.2, xpMult: 1.2, dpsMult: 1.0, crystalMult: 4.0 },
    durationSeconds: 40,
    weight: 18
  },
  {
    eventId: "frenzy_mode",
    label: "Combat Frenzy!",
    icon: "🔥",
    color: "#f97316",
    description: "Heroes empowered — attack power doubled!",
    multipliers: { mesosMult: 1.3, xpMult: 1.3, dpsMult: 2.0, crystalMult: 1.0 },
    durationSeconds: 35,
    weight: 24
  },
  {
    eventId: "star_burst",
    label: "Star Burst!",
    icon: "🌟",
    color: "#c084fc",
    description: "Everything amplified — maximum output!",
    multipliers: { mesosMult: 1.8, xpMult: 1.8, dpsMult: 1.5, crystalMult: 2.0 },
    durationSeconds: 30,
    weight: 10
  }
];

// ─── Constants ────────────────────────────────────────────────────────────────

/** Minimum play-seconds between event triggers (anti-spam guard). */
const EVENT_COOLDOWN_SECONDS = 90;
/** Mean seconds of play between events (Poisson arrival). */
const EVENT_MEAN_INTERVAL    = 160;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Pick an event definition from the weighted pool using an integer seed. */
function pickWeightedEvent(seed: number): EventDefinition {
  const total = EVENT_POOL.reduce((s, e) => s + e.weight, 0);
  let roll    = ((seed * 1103515245 + 12345) & 0x7fffffff) % total;
  for (const def of EVENT_POOL) {
    roll -= def.weight;
    if (roll < 0) return def;
  }
  return EVENT_POOL[0];
}

// ─── Core functions ───────────────────────────────────────────────────────────

/**
 * Returns combined event multipliers for all currently active events.
 * Safe to call with an empty array — returns identity multipliers.
 */
export function getEventMultipliers(events: WorldEvent[]): WorldEventMultipliers {
  return events.reduce<WorldEventMultipliers>(
    (acc, ev) => ({
      mesosMult:   acc.mesosMult   * ev.multipliers.mesosMult,
      xpMult:      acc.xpMult      * ev.multipliers.xpMult,
      dpsMult:     acc.dpsMult     * ev.multipliers.dpsMult,
      crystalMult: acc.crystalMult * ev.multipliers.crystalMult,
    }),
    { mesosMult: 1, xpMult: 1, dpsMult: 1, crystalMult: 1 }
  );
}

/**
 * Advance world events by `deltaSeconds`.
 *
 * - Ticks down `remainingSeconds` on active events and removes expired ones.
 * - Probabilistically spawns a new event when the cooldown has elapsed and
 *   no event is currently active.
 *
 * Returns the updated event array, the updated nextEventAt threshold, and
 * the newly spawned event (or null) so the React layer can play a sound/banner.
 */
export function tickWorldEvents(
  activeEvents: WorldEvent[],
  nextEventAt:  number,
  totalPlayTime: number,
  deltaSeconds: number
): { activeEvents: WorldEvent[]; nextEventAt: number; spawned: WorldEvent | null } {
  // Tick down and prune expired events
  const ticked = activeEvents
    .map(ev => ({ ...ev, remainingSeconds: ev.remainingSeconds - deltaSeconds }))
    .filter(ev => ev.remainingSeconds > 0);

  const newPlayTime = totalPlayTime + deltaSeconds;
  let spawned: WorldEvent | null = null;

  // Only spawn when: cooldown elapsed AND no active event AND random check passes
  if (newPlayTime >= nextEventAt && ticked.length === 0) {
    // Per-tick probability: P = deltaSeconds / meanInterval
    // Use deterministic pseudo-random to avoid React re-render variance
    const seed   = Math.floor(newPlayTime * 73.137) & 0x7fffffff;
    const roll   = ((seed * 1664525 + 1013904223) & 0x7fffffff) / 0x7fffffff;
    const prob   = Math.min(1, deltaSeconds / EVENT_MEAN_INTERVAL);

    if (roll < prob) {
      const def  = pickWeightedEvent(seed);
      spawned    = {
        id:               `evt-${Math.floor(newPlayTime)}-${def.eventId}`,
        eventId:          def.eventId,
        label:            def.label,
        icon:             def.icon,
        color:            def.color,
        description:      def.description,
        multipliers:      def.multipliers,
        durationSeconds:  def.durationSeconds,
        remainingSeconds: def.durationSeconds,
        triggeredAt:      Date.now()
      };
    }

    // Schedule next eligibility window
    const jitter = ((seed & 0x3f) / 64) * 40;  // 0-40 extra seconds
    const nextAt = newPlayTime + EVENT_COOLDOWN_SECONDS + jitter;
    return {
      activeEvents: spawned ? [spawned] : ticked,
      nextEventAt:  nextAt,
      spawned
    };
  }

  return { activeEvents: ticked, nextEventAt, spawned: null };
}

/** True if a given event type is currently active. */
export function isEventActive(events: WorldEvent[], eventId: WorldEventId): boolean {
  return events.some(ev => ev.eventId === eventId);
}

/** Human-readable countdown string for the primary active event. */
export function getEventCountdown(events: WorldEvent[]): string {
  if (!events.length) return "";
  return `${Math.ceil(events[0].remainingSeconds)}s`;
}