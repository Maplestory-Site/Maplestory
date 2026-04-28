/**
 * tutorialSystem.ts — First-session onboarding for IdleStory World.
 *
 * Tracks a tiny 5-step state machine that guides new players through the
 * core loop in the first ~90 seconds.  All functions are pure / zero-side-effect.
 *
 * Also provides new-player multipliers applied in gameTick so early
 * progression feels rewarding and fast:
 *   - getNewPlayerDpsMult  — high damage early so first kill ≈ 6 s
 *   - getNewPlayerXpMult   — levels 1–5 in < 60 s
 *   - getNewPlayerMesosMult — first upgrade affordable in < 10 s
 *
 * All multipliers ramp to 1.0 by totalPlayTime = 180 s (3 min).
 */

// ─── Tutorial step machine ────────────────────────────────────────────────────

export type TutorialStepId =
  | "intro"        // 0 — watch auto-combat begin
  | "heroes_tab"   // 1 — nudge toward Heroes tab after first kill
  | "buy_hero"     // 2 — highlight Snailguard upgrade inside panel
  | "first_kill"   // 3 — celebrate upgrade + encourage continued play
  | "done";        // 4 — tutorial finished, no more hints

export type TutorialState = {
  step: TutorialStepId;
  firstKillDone: boolean;
  firstUpgradeDone: boolean;
};

export const DEFAULT_TUTORIAL: TutorialState = {
  step: "intro",
  firstKillDone: false,
  firstUpgradeDone: false,
};

// ─── Hint content ─────────────────────────────────────────────────────────────

export type TutorialHint = {
  /** Short punchy instruction. */
  text: string;
  /** One-line flavour / context. */
  sub: string;
  /**
   * Which element to pulse-highlight.
   * null  = no target highlight right now
   * "heroes_tab"     = the Heroes nav tab button
   * "snailguard_btn" = Snailguard upgrade button inside HeroesPanel
   */
  target: "heroes_tab" | "snailguard_btn" | null;
};

export function getTutorialHint(step: TutorialStepId): TutorialHint | null {
  switch (step) {
    case "intro":
      return {
        text: "Your heroes fight automatically!",
        sub: "Watch the enemy's HP drop…",
        target: null
      };
    case "heroes_tab":
      return {
        text: "Upgrade your heroes →",
        sub: "Tap Heroes — you can already afford it!",
        target: "heroes_tab"
      };
    case "buy_hero":
      return {
        text: "Upgrade Snailguard!",
        sub: "+4 DPS per level · costs 170 Mesos",
        target: "snailguard_btn"
      };
    case "first_kill":
      return {
        text: "Keep upgrading to stay ahead!",
        sub: "Enemies get harder every stage",
        target: null
      };
    default:
      return null;
  }
}

// ─── Step advancement (pure) ──────────────────────────────────────────────────

/** Call when the player kills their first enemy. */
export function advanceTutorialOnKill(t: TutorialState): TutorialState {
  if (t.step === "done") return t;
  if (t.firstKillDone) return t;
  return {
    ...t,
    firstKillDone: true,
    step: t.step === "intro" ? "heroes_tab" : t.step
  };
}

/** Call when the player opens any tab (to move from heroes_tab → buy_hero). */
export function advanceTutorialOnTabOpen(t: TutorialState, tab: string): TutorialState {
  if (t.step === "heroes_tab" && tab === "heroes") {
    return { ...t, step: "buy_hero" };
  }
  return t;
}

/** Call whenever any mesos-based purchase succeeds. */
export function advanceTutorialOnUpgrade(t: TutorialState): TutorialState {
  if (t.step === "done" || t.firstUpgradeDone) return t;
  return { ...t, firstUpgradeDone: true, step: "first_kill" };
}

/**
 * Finishes the tutorial once the player has killed, upgraded, and reached
 * level 3+.  Safe to call every render.
 */
export function checkTutorialComplete(t: TutorialState, level: number): TutorialState {
  if (t.step === "done") return t;
  if (t.firstKillDone && t.firstUpgradeDone && level >= 3) {
    return { ...t, step: "done" };
  }
  return t;
}

/** True while the tutorial is active (still guiding the player). */
export function isTutorialActive(t: TutorialState): boolean {
  return t.step !== "done";
}

// ─── New-player multipliers ───────────────────────────────────────────────────

/**
 * Combat DPS multiplier for new players.
 * First enemy dies in ≈ 6 s at DPS 4 thanks to 5× boost.
 *
 * totalPlayTime (s) → multiplier
 *  0 – 10  s  →  5×
 * 10 – 30  s  →  3×
 * 30 – 60  s  →  2×
 * 60 – 120 s  →  1.5×
 * 120+         →  1×  (normal speed)
 */
export function getNewPlayerDpsMult(totalPlayTimeSeconds: number): number {
  // Balance pass 2: early DPS boost removed almost entirely so first enemy
  // takes 10–14 s (was ~8 s with 1.18×). Mild +5% kept for first 30 s as a
  // gentle "you're stronger than you think" feel.
  if (totalPlayTimeSeconds <= 30)  return 1.05;
  if (totalPlayTimeSeconds <= 90)  return 1.03;
  if (totalPlayTimeSeconds <= 180) return 1.01;
  return 1.0;
}

/**
 * XP multiplier for new players.
 * Achieves levels 1→5 in ≈ 60 s, then normalises by 3 min.
 *
 *  0 – 10  s  →  6×
 * 10 – 30  s  →  5×
 * 30 – 60  s  →  3×
 * 60 – 120 s  →  2×
 * 120 – 180 s →  1.5×
 * 180+         →  1×
 */
export function getNewPlayerXpMult(totalPlayTimeSeconds: number): number {
  if (totalPlayTimeSeconds <= 30)  return 1.08;
  if (totalPlayTimeSeconds <= 90)  return 1.04;
  if (totalPlayTimeSeconds <= 180) return 1.01;
  return 1.0;
}

/**
 * Mesos income multiplier for new players.
 * First two upgrades affordable within 20 s.
 *
 *  0 – 30  s  →  2.5×
 * 30 – 60  s  →  2×
 * 60 – 120 s  →  1.5×
 * 120+         →  1×
 */
export function getNewPlayerMesosMult(totalPlayTimeSeconds: number): number {
  // Balance pass 2: early mesos is now intentionally throttled (< 1.0) so the
  // first upgrade takes 25–30 s instead of ~5 s.  This is a deliberate
  // anti-rush mechanic — the tutorial should feel earned, not skipped.
  // Multiplier curves back up to 1.0 by 120 s.
  if (totalPlayTimeSeconds <= 30)  return 0.58;
  if (totalPlayTimeSeconds <= 60)  return 0.68;
  if (totalPlayTimeSeconds <= 120) return 0.78;
  if (totalPlayTimeSeconds <= 300) return 0.88;
  return 1.0;
}

/** True if this player is still in the "new player" window (< 3 minutes). */
export function isNewPlayer(totalPlayTimeSeconds: number): boolean {
  return totalPlayTimeSeconds < 180;
}
