import { useCallback, useEffect, useRef, useState } from "react";
import { getEnemyHpPercent } from "../combatSystem";
import type { IdleGameState } from "../gameEngine";
import {
  createBossFightState,
  tickBossFight,
  computeBossDpsMultiplier,
  getMechanicTimeLeft,
  type BossFightState
} from "../bossMechanics";
import type { BossDefinition } from "../bossSystem";
import { useManagedTimers, type ManagedTimeoutHandle } from "./useManagedTimers";

type UseBossFlowParams = {
  isBoss: boolean;
  bossDefinition: BossDefinition | null;
  state: IdleGameState;
};

export function useBossFlow({ isBoss, bossDefinition, state }: UseBossFlowParams) {
  const bossFightRef = useRef<BossFightState | null>(null);
  const prevIsBossRef = useRef(false);
  const stateRef = useRef(state);
  const bossDpsMultiplierRef = useRef(1.0);
  const bossVoiceLineTimerRef = useRef<ManagedTimeoutHandle | null>(null);
  const bossIntroTimerRef = useRef<ManagedTimeoutHandle | null>(null);

  const [bossPhase, setBossPhase] = useState<1 | 2 | 3>(1);
  const [activeMechanicId, setActiveMechanicId] = useState<string | null>(null);
  const [mechanicTimeLeft, setMechanicTimeLeft] = useState(0);
  const [enrageTimeLeft, setEnrageTimeLeft] = useState(0);
  const [isBossEnraged, setIsBossEnraged] = useState(false);
  const [bossVoiceLine, setBossVoiceLine] = useState<string | null>(null);
  const [bossIntro, setBossIntro] = useState<{ title: string; subtitle: string } | null>(null);

  const {
    setManagedInterval,
    clearManagedInterval,
    resetManagedTimeoutRef,
    clearManagedTimeout
  } = useManagedTimers();

  const showVoiceLine = useCallback((line: string, hideAfterMs: number) => {
    setBossVoiceLine(line);
    resetManagedTimeoutRef(bossVoiceLineTimerRef, () => setBossVoiceLine(null), hideAfterMs);
  }, [resetManagedTimeoutRef]);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    const wasBoss = prevIsBossRef.current;
    prevIsBossRef.current = isBoss;

    if (isBoss && !wasBoss && bossDefinition) {
      const fight = createBossFightState(bossDefinition.id, bossDefinition.enrageTimer);
      bossFightRef.current = fight;
      setBossPhase(1);
      setActiveMechanicId(null);
      setMechanicTimeLeft(0);
      setEnrageTimeLeft(bossDefinition.enrageTimer);
      setIsBossEnraged(false);
      showVoiceLine(bossDefinition.voiceLines.intro, 4500);
      setBossIntro({ title: bossDefinition.name, subtitle: bossDefinition.title });
      resetManagedTimeoutRef(bossIntroTimerRef, () => setBossIntro(null), 2200);
      bossDpsMultiplierRef.current = 1.0;
    }

    if (!isBoss) {
      bossFightRef.current = null;
      setActiveMechanicId(null);
      setIsBossEnraged(false);
      setBossVoiceLine(null);
      setBossIntro(null);
      clearManagedTimeout(bossVoiceLineTimerRef.current);
      bossVoiceLineTimerRef.current = null;
      clearManagedTimeout(bossIntroTimerRef.current);
      bossIntroTimerRef.current = null;
      bossDpsMultiplierRef.current = 1.0;
    }
  }, [
    isBoss,
    bossDefinition,
    showVoiceLine,
    clearManagedTimeout,
    resetManagedTimeoutRef
  ]);

  useEffect(() => {
    if (!isBoss || !bossDefinition) return;

    const timer = setManagedInterval(() => {
      const fight = bossFightRef.current;
      if (!fight) return;

      const now = Date.now();
      const hpPct = getEnemyHpPercent(stateRef.current);
      const { fight: nextFight, triggered, phaseTransition } = tickBossFight(fight, bossDefinition, hpPct, now);
      bossFightRef.current = nextFight;

      setBossPhase(nextFight.currentPhase);
      setEnrageTimeLeft(nextFight.enrageSecondsLeft);
      setIsBossEnraged(nextFight.isEnraged);
      setActiveMechanicId(nextFight.activeMechanicId);
      setMechanicTimeLeft(getMechanicTimeLeft(nextFight, now));

      bossDpsMultiplierRef.current = computeBossDpsMultiplier(
        bossDefinition,
        nextFight.activeMechanicId,
        nextFight.isEnraged
      );

      if (phaseTransition) {
        showVoiceLine(phaseTransition.transitionLine, 4200);
      } else if (triggered && triggered.effect !== "aoe") {
        showVoiceLine(`${triggered.icon} ${triggered.name}!`, 3200);
      } else if (nextFight.isEnraged && !fight.isEnraged) {
        showVoiceLine(bossDefinition.voiceLines.enrage, 4500);
      }
    }, 1000);

    return () => {
      clearManagedInterval(timer);
    };
  }, [isBoss, bossDefinition, setManagedInterval, clearManagedInterval, showVoiceLine]);

  return {
    bossPhase,
    activeMechanicId,
    mechanicTimeLeft,
    enrageTimeLeft,
    isBossEnraged,
    bossVoiceLine,
    bossIntro,
    bossDpsMultiplierRef
  };
}
