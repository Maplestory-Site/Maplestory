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
import type { CombatFeedEntry, DmgNumber } from "./useCombatFeedbackUI";
import { useManagedTimers, type ManagedTimeoutHandle } from "./useManagedTimers";

type UseCombatTimingLoopsParams = {
  stage: number;
  playerMaxHp: number;
  enemyAttackIntervalMs: number;
  enemyAttackPerSecond: number;
  spawnDmg: (value: number, kind: DmgNumber["kind"]) => void;
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
  spawnDmg,
  pushCombatFeed,
  setState,
  monsters,
  items,
  bossDpsMultiplierRef
}: UseCombatTimingLoopsParams) {
  const [playerHpDisplay, setPlayerHpDisplay] = useState(100);
  const [enemyAttackProgress, setEnemyAttackProgress] = useState(0);
  const [enemyHitPulse, setEnemyHitPulse] = useState(false);

  const enemyHitPulseTimerRef = useRef<ManagedTimeoutHandle | null>(null);
  const { setManagedInterval, clearManagedInterval, resetManagedTimeoutRef } = useManagedTimers();

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
    enemyHitPulse
  };
}
