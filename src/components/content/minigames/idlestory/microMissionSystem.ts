/**
 * microMissionSystem.ts — Rolling short-term micro mission pool.
 *
 * Maintains 3 active missions at all times.  On claim, the slot is
 * immediately replaced with a fresh mission scaled to the player's
 * current level / stage — so there is always something to chase.
 *
 * Design notes:
 *  • No circular imports — does NOT import from gameEngine.ts.
 *    Callers pass (level, stage) scalars instead of the whole state.
 *  • All functions are pure / zero-side-effect.
 *  • Deterministic generation for reproducible seeding.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type MicroMissionKind =
  | "kills"
  | "stage"
  | "boss_kills"
  | "elite_kills"
  | "mesos";

export type MicroMissionReward = {
  mesos:    number;
  fame?:    number;
  crystals?: number;
  xp?:      number;
};

export type MicroMission = {
  /** Unique id — regenerated each time the slot refreshes. */
  id:        string;
  kind:      MicroMissionKind;
  label:     string;
  icon:      string;
  target:    number;
  progress:  number;
  completed: boolean;
  claimed:   boolean;
  reward:    MicroMissionReward;
};

// ─── Templates ───────────────────────────────────────────────────────────────

type MissionTemplate = {
  kind:      MicroMissionKind;
  label:     (target: number) => string;
  icon:      string;
  targetFn:  (level: number, stage: number, roll: number) => number;
  rewardFn:  (target: number, level: number) => MicroMissionReward;
  weight:    number;
  minLevel:  number;  // player level required before this template appears
};

const TEMPLATES: MissionTemplate[] = [
  {
    kind:    "kills",
    label:   (t) => `Defeat ${t} enemies`,
    icon:    "⚔️",
    minLevel: 1,
    targetFn: (level, _stage, roll) => {
      const base = Math.max(24, Math.floor(level * 5.5));
      return [base, Math.floor(base * 2.2), Math.floor(base * 3.4)][roll % 3];
    },
    rewardFn: (target, level) => ({
      mesos: Math.floor(target * (18 + level * 2.2)),
      fame:  Math.floor(target / 16)
    }),
    weight: 30
  },
  {
    kind:    "stage",
    label:   (t) => `Reach Stage ${t}`,
    icon:    "🏴",
    minLevel: 1,
    targetFn: (_level, stage, roll) => {
      const steps = [14, 24, 36];
      return stage + steps[roll % 3];
    },
    rewardFn: (target, level) => ({
      mesos:    Math.floor(target * (34 + level * 4)),
      fame:     Math.floor(target / 10),
      crystals: target >= 90 ? 1 : 0
    }),
    weight: 25
  },
  {
    kind:    "boss_kills",
    label:   (t) => t === 1 ? "Defeat 1 boss" : `Defeat ${t} bosses`,
    icon:    "💀",
    minLevel: 3,
    targetFn: (level, _stage, roll) => {
      const maxBosses = Math.max(2, Math.floor(level / 4.2));
      return Math.min(maxBosses, [2, 4, 6][roll % 3]);
    },
    rewardFn: (target, level) => ({
      mesos:    Math.floor(target * (120 + level * 11)),
      fame:     target * 2,
      crystals: target >= 6 && level >= 35 ? 1 : 0
    }),
    weight: 20
  },
  {
    kind:    "elite_kills",
    label:   (t) => t === 1 ? "Defeat 1 elite" : `Defeat ${t} elites`,
    icon:    "⚡",
    minLevel: 2,
    targetFn: (level, _stage, roll) => {
      const maxElites = Math.max(5, Math.floor(level / 2.2));
      return Math.min(maxElites, [5, 8, 12][roll % 3]);
    },
    rewardFn: (target, level) => ({
      mesos: Math.floor(target * (62 + level * 6)),
      fame:  Math.floor(target * 1.5)
    }),
    weight: 18
  },
  {
    kind:    "mesos",
    label:   (t) => `Earn ${t.toLocaleString()} mesos`,
    icon:    "💰",
    minLevel: 2,
    targetFn: (level, _stage, roll) => {
      const base = 1600 + level * 420;
      return Math.floor([base * 2.2, base * 3.5, base * 5.4][roll % 3]);
    },
    rewardFn: (target, level) => ({
      mesos:    Math.floor(target * 0.11),
      fame:     Math.floor(level / 6),
      crystals: target >= 60000 && level >= 36 ? 1 : 0
    }),
    weight: 7
  }
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function lcg(seed: number): number {
  return ((seed * 1664525 + 1013904223) >>> 0);
}

function weightedPickIndex(level: number, seed: number, excludeKinds: MicroMissionKind[]): number {
  const available = TEMPLATES.filter(
    t => t.minLevel <= level && !excludeKinds.includes(t.kind)
  );
  if (!available.length) return 0;
  const total = available.reduce((s, t) => s + t.weight, 0);
  let roll = (lcg(seed) % total + total) % total;
  for (let i = 0; i < TEMPLATES.length; i++) {
    const t = TEMPLATES[i];
    if (t.minLevel > level || excludeKinds.includes(t.kind)) continue;
    roll -= t.weight;
    if (roll < 0) return i;
  }
  return TEMPLATES.findIndex(t => t.minLevel <= level && !excludeKinds.includes(t.kind));
}

function generateMission(
  level: number,
  stage: number,
  slot: number,
  now: number,
  excludeKinds: MicroMissionKind[] = []
): MicroMission {
  const seed  = lcg(Math.floor(now / 1000) + slot * 137 + level * 31 + stage * 17);
  const idx   = weightedPickIndex(level, seed + slot * 7, excludeKinds);
  const tpl   = TEMPLATES[idx] ?? TEMPLATES[0];
  const roll  = lcg(seed + slot * 13) % 100;
  const target = Math.max(1, tpl.targetFn(level, stage, roll));
  const reward  = tpl.rewardFn(target, level);

  return {
    id:        `mm-${Math.floor(now / 100)}-${slot}-${seed & 0xffff}`,
    kind:      tpl.kind,
    label:     tpl.label(target),
    icon:      tpl.icon,
    target,
    progress:  0,
    completed: false,
    claimed:   false,
    reward
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export const MICRO_MISSION_SLOTS = 3;

/**
 * Create an initial full pool of 3 missions, avoiding duplicate kinds.
 */
export function initMicroMissions(level: number, stage: number, now = Date.now()): MicroMission[] {
  const missions: MicroMission[] = [];
  const usedKinds: MicroMissionKind[] = [];
  for (let i = 0; i < MICRO_MISSION_SLOTS; i++) {
    const m = generateMission(level, stage, i, now + i * 997, usedKinds);
    missions.push(m);
    usedKinds.push(m.kind);
  }
  return missions;
}

/**
 * Fill any missing slots (e.g. on first load or after state migration).
 */
export function ensureMicroMissions(
  missions: MicroMission[],
  level: number,
  stage: number,
  now = Date.now()
): MicroMission[] {
  if (missions.length >= MICRO_MISSION_SLOTS) return missions;
  const result    = [...missions];
  const usedKinds = result.map(m => m.kind);
  while (result.length < MICRO_MISSION_SLOTS) {
    const m = generateMission(level, stage, result.length, now + result.length * 991, usedKinds);
    result.push(m);
    usedKinds.push(m.kind);
  }
  return result;
}

/**
 * Advance all mission progress from one game tick.
 *
 * @param missions  Current active missions
 * @param progress  Combat result for this tick
 */
export function tickMicroMissions(
  missions: MicroMission[],
  progress: {
    kills?:         number;   // total kills this tick
    bossKills?:     number;
    eliteKills?:    number;
    currentStage?:  number;   // current stage reached
    mesosGained?:   number;   // mesos earned this tick
  }
): MicroMission[] {
  return missions.map(m => {
    if (m.completed) return m;

    let newProgress = m.progress;

    switch (m.kind) {
      case "kills":
        newProgress = m.progress + (progress.kills ?? 0);
        break;
      case "boss_kills":
        newProgress = m.progress + (progress.bossKills ?? 0);
        break;
      case "elite_kills":
        newProgress = m.progress + (progress.eliteKills ?? 0);
        break;
      case "stage":
        // Set progress to max stage reached; never decreases
        newProgress = Math.max(m.progress, progress.currentStage ?? 0);
        break;
      case "mesos":
        newProgress = m.progress + (progress.mesosGained ?? 0);
        break;
    }

    const capped       = Math.min(m.target, newProgress);
    const justCompleted = !m.completed && capped >= m.target;
    return { ...m, progress: capped, completed: m.completed || justCompleted };
  });
}

/**
 * Claim a completed mission and immediately replace it with a fresh one.
 *
 * @returns The updated missions array + the reward (or null if not claimable).
 */
export function claimMicroMission(
  missions:  MicroMission[],
  missionId: string,
  level:     number,
  stage:     number,
  now = Date.now()
): { missions: MicroMission[]; reward: MicroMissionReward | null } {
  const idx = missions.findIndex(m => m.id === missionId);
  if (idx < 0) return { missions, reward: null };
  const m = missions[idx];
  if (!m.completed || m.claimed) return { missions, reward: null };

  // Immediately regenerate — avoid the same kind if possible
  const usedKinds = missions
    .filter((_, i) => i !== idx)
    .map(mm => mm.kind);
  const fresh = generateMission(level, stage, idx, now, usedKinds);

  const updated = [...missions];
  updated[idx]  = fresh;
  return { missions: updated, reward: m.reward };
}

/** How much progress (0-100%) a mission has made. */
export function getMissionProgressPct(m: MicroMission): number {
  return Math.min(100, (m.progress / Math.max(1, m.target)) * 100);
}
