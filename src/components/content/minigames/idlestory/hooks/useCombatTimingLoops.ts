import { useEffect, useRef, useState, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import {
  formatNumber,
  gameTick,
  saveGameState,
  type DatabaseItem,
  type DatabaseMonster,
  type IdleGameState
} from "../gameEngine";
import { getCurrentMonster, getFeaturedLoot } from "../progressionSystem";
import { getFullZoneOrFirst } from "../zoneSystem";
import { defaultRng } from "../seededRng";
import type { CombatFeedEntry, DmgNumber } from "./useCombatFeedbackUI";
import { useManagedTimers, type ManagedTimeoutHandle } from "./useManagedTimers";

export type VisualAttackKind = "normal" | "crit" | "elite" | "boss" | "kill";
export type VisualAttackPhase = "idle" | "windup" | "slash" | "impact" | "recovery";

export type VisualAttackState = {
  sequence: number;
  phase: VisualAttackPhase;
  kind: VisualAttackKind;
  projectile: boolean;
  damage: number;
};

type UseCombatTimingLoopsParams = {
  stage: number;
  playerMaxHp: number;
  enemyAttackIntervalMs: number;
  enemyAttackPerSecond: number;
  dps: number;
  enemyHpPct: number;
  encounterType: "normal" | "elite" | "boss";
  spawnDmg: (value: number, kind: DmgNumber["kind"]) => void;
  playHit: () => void;
  playCrit: () => void;
  pushCombatFeed: (entry: Omit<CombatFeedEntry, "id">) => void;
  setState: Dispatch<SetStateAction<IdleGameState>>;
  monsters: DatabaseMonster[];
  items: DatabaseItem[];
  bossDpsMultiplierRef: MutableRefObject<number>;
};

export function useCombatTimingLoops({
  stage,
  playerMaxHp,
  enemyAttackIntervalMs,
  enemyAttackPerSecond,
  dps,
  enemyHpPct,
  encounterType,
  spawnDmg,
  playHit,
  playCrit,
  pushCombatFeed,
  setState,
  monsters,
  items,
  bossDpsMultiplierRef
}: UseCombatTimingLoopsParams) {
  const [playerHpDisplay, setPlayerHpDisplay] = useState(100);
  const [enemyAttackProgress, setEnemyAttackProgress] = useState(0);
  const [enemyHitPulse, setEnemyHitPulse] = useState(false);
  const [visualAttack, setVisualAttack] = useState<VisualAttackState>({
    sequence: 0,
    phase: "idle",
    kind: "normal",
    projectile: false,
    damage: 0
  });

  const enemyHitPulseTimerRef = useRef<ManagedTimeoutHandle | null>(null);
  const visualAttackSeqRef = useRef(0);
  const visualAttackTimersRef = useRef<ManagedTimeoutHandle[]>([]);
  const {
    setManagedInterval,
    clearManagedInterval,
    setManagedTimeout,
    clearManagedTimeout,
    resetManagedTimeoutRef
  } = useManagedTimers();

  useEffect(() => {
    setPlayerHpDisplay((current) => {
      if (current <= 0) return playerMaxHp;
      return Math.min(current, playerMaxHp);
    });
  }, [playerMaxHp]);

  useEffect(() => {
    setPlayerHpDisplay(playerMaxHp);
    setEnemyAttackProgress(0);
  }, [stage, playerMaxHp]);

  useEffect(() => {
    const stepMs = 120;
    const timer = setManagedInterval(() => {
      setEnemyAttackProgress((current) => {
        const next = current + (stepMs / Math.max(460, enemyAttackIntervalMs)) * 100;
        if (next < 100) return next;

        const incoming = Math.max(1, Math.round(enemyAttackPerSecond * 0.85));
        setPlayerHpDisplay((hp) => Math.max(0, hp - incoming));
        spawnDmg(incoming, "incoming");
        setEnemyHitPulse(true);
        resetManagedTimeoutRef(enemyHitPulseTimerRef, () => setEnemyHitPulse(false), 180);
        pushCombatFeed({ label: "Incoming", value: `-${formatNumber(incoming)} HP`, tone: "danger" });
        return next - 100;
      });
    }, stepMs);

    return () => {
      clearManagedInterval(timer);
    };
  }, [
    enemyAttackIntervalMs,
    enemyAttackPerSecond,
    pushCombatFeed,
    spawnDmg,
    setManagedInterval,
    clearManagedInterval,
    resetManagedTimeoutRef
  ]);

  useEffect(() => {
    const cadenceMs = Math.max(
      550,
      Math.min(850, Math.round(850 - Math.min(300, Math.log2(Math.max(2, dps)) * 48)))
    );

    const clearVisualAttackTimers = () => {
      for (const handle of visualAttackTimersRef.current) {
        clearManagedTimeout(handle);
      }
      visualAttackTimersRef.current = [];
    };

    if (dps <= 0) {
      clearVisualAttackTimers();
      setVisualAttack((current) => current.phase === "idle" ? current : { ...current, phase: "idle" });
      return clearVisualAttackTimers;
    }

    const queue = (callback: () => void, delay: number) => {
      const handle = setManagedTimeout(() => {
        visualAttackTimersRef.current = visualAttackTimersRef.current.filter((entry) => entry !== handle);
        callback();
      }, Math.max(0, Math.round(delay)));
      visualAttackTimersRef.current.push(handle);
    };

    const runAttack = () => {
      clearVisualAttackTimers();
      const sequence = ++visualAttackSeqRef.current;
      const critChance = Math.min(0.24, 0.055 + Math.log10(Math.max(1, dps)) * 0.025);
      const isCrit = defaultRng() < critChance;
      const nearKill = enemyHpPct <= 10;
      const kind: VisualAttackKind = nearKill
        ? "kill"
        : isCrit
          ? "crit"
          : encounterType === "boss"
            ? "boss"
            : encounterType === "elite"
              ? "elite"
              : "normal";
      const damage = Math.max(1, Math.round(dps * (cadenceMs / 1000) * (isCrit ? 1.65 : 1)));
      const projectile = encounterType !== "normal" || defaultRng() < 0.28;

      setVisualAttack({ sequence, phase: "windup", kind, projectile, damage });
      queue(() => {
        setVisualAttack((current) => current.sequence === sequence ? { ...current, phase: "slash" } : current);
      }, cadenceMs * 0.18);
      queue(() => {
        setVisualAttack((current) => current.sequence === sequence ? { ...current, phase: "impact" } : current);
        const numberKind: DmgNumber["kind"] =
          kind === "crit"
            ? "crit"
            : kind === "boss"
              ? "boss"
              : kind === "kill"
                ? "kill"
                : "normal";
        spawnDmg(damage, numberKind);
        if (kind === "crit") playCrit(); else playHit();
      }, cadenceMs * 0.38);
      queue(() => {
        setVisualAttack((current) => current.sequence === sequence ? { ...current, phase: "recovery" } : current);
      }, cadenceMs * 0.58);
      queue(() => {
        setVisualAttack((current) => current.sequence === sequence ? { ...current, phase: "idle" } : current);
      }, cadenceMs * 0.82);
    };

    runAttack();
    const timer = setManagedInterval(runAttack, cadenceMs);
    return () => {
      clearManagedInterval(timer);
      clearVisualAttackTimers();
    };
  }, [
    dps,
    enemyHpPct,
    encounterType,
    stage,
    spawnDmg,
    playHit,
    playCrit,
    setManagedInterval,
    clearManagedInterval,
    setManagedTimeout,
    clearManagedTimeout
  ]);

  useEffect(() => {
    const timer = setManagedInterval(() => {
      setState((cur) => {
        const zone = getFullZoneOrFirst(cur.zone);
        const monster = getCurrentMonster(cur, zone, monsters);
        const featuredLoot = getFeaturedLoot(monster, items);
        const next = gameTick(cur, 1, {
          zone,
          monster,
          lootCount: featuredLoot.length,
          bossDpsMultiplier: bossDpsMultiplierRef.current
        });
        saveGameState(next);
        return next;
      });
    }, 1000);

    return () => {
      clearManagedInterval(timer);
    };
  }, [setState, items, monsters, bossDpsMultiplierRef, setManagedInterval, clearManagedInterval]);

  return {
    playerHpDisplay,
    enemyAttackProgress,
    enemyHitPulse,
    visualAttack
  };
}
