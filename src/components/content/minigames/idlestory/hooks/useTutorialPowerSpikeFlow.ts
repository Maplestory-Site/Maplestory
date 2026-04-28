import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import {
  claimBossKillFreeUpgrade,
  formatNumber,
  saveGameState,
  type IdleGameState
} from "../gameEngine";
import {
  BOSS_SURGE_SECONDS,
  formatPowerRating,
  getMilestoneAtLevel
} from "../powerSpikeSystem";
import {
  DEFAULT_TUTORIAL,
  advanceTutorialOnKill,
  advanceTutorialOnTabOpen,
  advanceTutorialOnUpgrade,
  checkTutorialComplete,
  getTutorialHint,
  isNewPlayer,
  isTutorialActive,
  type TutorialState,
  type TutorialStepId
} from "../tutorialSystem";
import type { TabId } from "../worldTypes";
import { useManagedTimers, type ManagedTimeoutHandle } from "./useManagedTimers";

export type WowMoment = {
  emoji: string;
  text: string;
  sub: string;
};

export type PowerSpikeOverlay = {
  icon: string;
  label: string;
  description: string;
  isWow: boolean;
  sub?: string;
};

type UseTutorialPowerSpikeFlowParams = {
  state: IdleGameState;
  powerRating: number;
  playLevelUp: () => void;
  setState: Dispatch<SetStateAction<IdleGameState>>;
};

export function useTutorialPowerSpikeFlow({
  state,
  powerRating,
  playLevelUp,
  setState
}: UseTutorialPowerSpikeFlowParams) {
  const [tutorial, setTutorial] = useState<TutorialState>(() =>
    isNewPlayer(state.totalPlayTime) ? DEFAULT_TUTORIAL : { ...DEFAULT_TUTORIAL, step: "done" }
  );
  const [wowMoment, setWowMoment] = useState<WowMoment | null>(null);
  const [lootDropVisible, setLootDropVisible] = useState(false);
  const [powerSpike, setPowerSpike] = useState<PowerSpikeOverlay | null>(null);

  const tutorialStep: TutorialStepId = tutorial.step;
  const tutorialHint = getTutorialHint(tutorialStep);

  const prevLifetimeKillsRef = useRef(state.lifetimeKills);
  const prevTutorialLevelRef = useRef(state.level);
  const prevBossKillsRef = useRef(state.lifetimeBossKills);
  const prevMilestoneLevelRef = useRef(state.level);
  const stateRef = useRef(state);

  const wowMomentTimerRef = useRef<ManagedTimeoutHandle | null>(null);
  const lootDropTimerRef = useRef<ManagedTimeoutHandle | null>(null);
  const powerSpikeTimerRef = useRef<ManagedTimeoutHandle | null>(null);

  const { resetManagedTimeoutRef } = useManagedTimers();

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    const prev = prevLifetimeKillsRef.current;
    prevLifetimeKillsRef.current = state.lifetimeKills;
    if (prev === 0 && state.lifetimeKills >= 1 && isTutorialActive(tutorial)) {
      setTutorial((value) => advanceTutorialOnKill(value));
      setWowMoment({
        emoji: "💀",
        text: "FIRST KILL!",
        sub: `+${formatNumber(state.mesos - 0)} Mesos · XP Bonus!`
      });
      setLootDropVisible(true);
      resetManagedTimeoutRef(lootDropTimerRef, () => setLootDropVisible(false), 1400);
      resetManagedTimeoutRef(wowMomentTimerRef, () => setWowMoment(null), 2600);
    }
  }, [state.lifetimeKills, state.mesos, tutorial, resetManagedTimeoutRef]);

  useEffect(() => {
    const prev = prevTutorialLevelRef.current;
    prevTutorialLevelRef.current = state.level;
    if (prev < 2 && state.level >= 2 && isTutorialActive(tutorial)) {
      setWowMoment({ emoji: "⭐", text: "LEVEL UP!", sub: `You're level ${state.level} - keep going!` });
      resetManagedTimeoutRef(wowMomentTimerRef, () => setWowMoment(null), 2400);
    }
  }, [state.level, tutorial, resetManagedTimeoutRef]);

  useEffect(() => {
    if (tutorial.step !== "done") {
      const next = checkTutorialComplete(tutorial, state.level);
      if (next.step !== tutorial.step) setTutorial(next);
    }
  }, [state.level, tutorial]);

  useEffect(() => {
    const prev = prevMilestoneLevelRef.current;
    prevMilestoneLevelRef.current = state.level;

    for (let level = prev + 1; level <= state.level; level += 1) {
      const milestone = getMilestoneAtLevel(level);
      if (!milestone) continue;
      setPowerSpike({
        icon: milestone.icon,
        label: milestone.label,
        description: milestone.description,
        isWow: milestone.isWow,
        sub: `Power: ${formatPowerRating(powerRating)}`
      });
      if (milestone.isWow) playLevelUp();
      resetManagedTimeoutRef(powerSpikeTimerRef, () => setPowerSpike(null), milestone.isWow ? 3200 : 2400);
      break;
    }
  }, [state.level, powerRating, playLevelUp, resetManagedTimeoutRef]);

  useEffect(() => {
    const prev = prevBossKillsRef.current;
    prevBossKillsRef.current = state.lifetimeBossKills;
    if (state.lifetimeBossKills <= prev) return;

    const result = claimBossKillFreeUpgrade(stateRef.current);
    if (result.success) {
      setState(result.state);
      saveGameState(result.state);
    }

    setPowerSpike({
      icon: "💥",
      label: "BOSS SURGE!",
      description: `+100% DPS for ${BOSS_SURGE_SECONDS}s${
        result.success ? ` · ${result.message.split(":")[1]?.trim() ?? "Free upgrade!"}` : ""
      }`,
      isWow: true
    });
    resetManagedTimeoutRef(powerSpikeTimerRef, () => setPowerSpike(null), 3000);
  }, [state.lifetimeBossKills, setState, resetManagedTimeoutRef]);

  const advanceOnTabOpen = (newTab: TabId) => {
    setTutorial((value) => advanceTutorialOnTabOpen(value, newTab));
  };

  const advanceOnUpgrade = () => {
    setTutorial((value) => advanceTutorialOnUpgrade(value));
  };

  return {
    tutorial,
    tutorialStep,
    tutorialHint,
    wowMoment,
    lootDropVisible,
    powerSpike,
    advanceOnTabOpen,
    advanceOnUpgrade
  };
}
