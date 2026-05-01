import { useCallback, useEffect, useRef, useState } from "react";
import { formatNumber, type IdleGameState } from "../gameEngine";
import { defaultRng } from "../seededRng";
import { useManagedTimers, type ManagedTimeoutHandle } from "./useManagedTimers";

export type DmgNumber = {
  id: number;
  value: number;
  kind: "normal" | "crit" | "boss" | "kill" | "incoming";
  x: number;
};

export type FeelBurst = {
  id: number;
  kind: "hit" | "crit" | "kill" | "level";
};

export type GoldPop = {
  id: number;
  value: number;
};

export type CombatFeedEntry = {
  id: number;
  label: string;
  value: string;
  tone: "gold" | "xp" | "loot" | "danger" | "level";
};

type UseCombatFeedbackUIParams = {
  state: IdleGameState;
  isBoss: boolean;
  dps: number;
  playCrit: () => void;
  playHit: () => void;
  playReward: () => void;
  playLevelUp: () => void;
  playSuccess: () => void;
  setToast: (message: string) => void;
  showTickDamageNumbers?: boolean;
};

export function useCombatFeedbackUI({
  state,
  isBoss,
  dps,
  playCrit,
  playHit,
  playReward,
  playLevelUp,
  playSuccess,
  setToast,
  showTickDamageNumbers = true
}: UseCombatFeedbackUIParams) {
  const [dmgNums, setDmgNums] = useState<DmgNumber[]>([]);
  const [feelBursts, setFeelBursts] = useState<FeelBurst[]>([]);
  const [rewardText, setRewardText] = useState("");
  const [isHit, setIsHit] = useState(false);
  const [isKillFlash, setIsKillFlash] = useState(false);
  const [isStageClear, setIsStageClear] = useState(false);
  const [isGoldBumping, setIsGoldBumping] = useState(false);
  const [isXpLevelup, setIsXpLevelup] = useState(false);
  const [goldPops, setGoldPops] = useState<GoldPop[]>([]);
  const [combatFeed, setCombatFeed] = useState<CombatFeedEntry[]>([]);
  const [isBossHitShake, setIsBossHitShake] = useState(false);
  const [isLevelUpFlash, setIsLevelUpFlash] = useState(false);

  const dmgIdRef = useRef(0);
  const feelBurstIdRef = useRef(0);
  const combatFeedIdRef = useRef(0);
  const goldPopIdRef = useRef(0);
  const prevHpRef = useRef({ hp: state.enemyHp, stage: state.stage });
  const prevLevelRef = useRef(state.level);
  const prevDungeonSummaryRef = useRef(state.dungeonState.lastRewardSummary);
  const hitRef = useRef(false);
  const prevMesosRef = useRef(state.mesos);
  const prevFeedMesosRef = useRef(state.mesos);
  const prevXpRef = useRef(state.xp);
  const prevInventoryCountRef = useRef(state.inventory.length);
  const prevCrystalsRef = useRef(state.crystals);
  const prevPulseSeqRef = useRef(state.engagementPulseSeq);

  const hitTimerRef = useRef<ManagedTimeoutHandle | null>(null);
  const bossHitShakeTimerRef = useRef<ManagedTimeoutHandle | null>(null);
  const killFlashTimerRef = useRef<ManagedTimeoutHandle | null>(null);
  const stageClearTimerRef = useRef<ManagedTimeoutHandle | null>(null);
  const xpLevelupTimerRef = useRef<ManagedTimeoutHandle | null>(null);
  const levelUpFlashTimerRef = useRef<ManagedTimeoutHandle | null>(null);
  const goldBumpTimerRef = useRef<ManagedTimeoutHandle | null>(null);

  const { setManagedTimeout, resetManagedTimeoutRef } = useManagedTimers();

  const spawnDmg = useCallback((value: number, kind: DmgNumber["kind"]) => {
    const id = ++dmgIdRef.current;
    const x = 30 + defaultRng() * 40;
    setDmgNums((prev) => [...prev.slice(-10), { id, value, kind, x }]);
    setManagedTimeout(() => {
      setDmgNums((prev) => prev.filter((entry) => entry.id !== id));
    }, 1600);
  }, [setManagedTimeout]);

  const spawnFeelBurst = useCallback((kind: FeelBurst["kind"], text = "") => {
    const id = ++feelBurstIdRef.current;
    setFeelBursts((prev) => [...prev.slice(-4), { id, kind }]);
    if (text) setRewardText(text);
    setManagedTimeout(() => {
      setFeelBursts((prev) => prev.filter((entry) => entry.id !== id));
      if (text) setRewardText("");
    }, 950);
  }, [setManagedTimeout]);

  const spawnGoldPop = useCallback((value: number) => {
    const id = ++goldPopIdRef.current;
    setGoldPops((prev) => [...prev.slice(-3), { id, value }]);
    setManagedTimeout(() => {
      setGoldPops((prev) => prev.filter((entry) => entry.id !== id));
    }, 1350);
  }, [setManagedTimeout]);

  const pushCombatFeed = useCallback((entry: Omit<CombatFeedEntry, "id">) => {
    const id = ++combatFeedIdRef.current;
    setCombatFeed((prev) => [...prev.slice(-3), { id, ...entry }]);
    setManagedTimeout(() => {
      setCombatFeed((prev) => prev.filter((item) => item.id !== id));
    }, 2300);
  }, [setManagedTimeout]);

  useEffect(() => {
    const prev = prevHpRef.current;
    if (prev.stage === state.stage && state.enemyHp < prev.hp && prev.hp > 0) {
      const dmg = Math.round(prev.hp - state.enemyHp);
      if (dmg > 0) {
        const kind = isBoss ? "boss" : dps > 200 && defaultRng() < 0.15 ? "crit" : "normal";
        if (showTickDamageNumbers) {
          spawnDmg(dmg, kind);
          spawnFeelBurst(kind === "crit" ? "crit" : "hit");
          if (kind === "crit") playCrit(); else playHit();
        }

        if (!hitRef.current) {
          hitRef.current = true;
          setIsHit(true);
          resetManagedTimeoutRef(hitTimerRef, () => {
            setIsHit(false);
            hitRef.current = false;
          }, 180);
        }

        if (isBoss && defaultRng() < 0.45) {
          setIsBossHitShake(true);
          resetManagedTimeoutRef(bossHitShakeTimerRef, () => setIsBossHitShake(false), 360);
        }
      }
    } else if (prev.stage !== state.stage) {
      spawnDmg(0, "kill");
      spawnFeelBurst("kill", `Stage ${state.stage} cleared`);
      playReward();
      setIsKillFlash(true);
      setIsStageClear(true);
      resetManagedTimeoutRef(killFlashTimerRef, () => setIsKillFlash(false), 500);
      resetManagedTimeoutRef(stageClearTimerRef, () => setIsStageClear(false), 600);
    }
    prevHpRef.current = { hp: state.enemyHp, stage: state.stage };
  }, [
    state.enemyHp,
    state.stage,
    isBoss,
    dps,
    spawnDmg,
    spawnFeelBurst,
    playCrit,
    playHit,
    playReward,
    showTickDamageNumbers,
    resetManagedTimeoutRef
  ]);

  useEffect(() => {
    if (state.level > prevLevelRef.current) {
      spawnFeelBurst("level", `Level ${state.level}!`);
      playLevelUp();
      pushCombatFeed({ label: "Level Up", value: `Lv.${state.level}`, tone: "level" });
      setIsXpLevelup(true);
      resetManagedTimeoutRef(xpLevelupTimerRef, () => setIsXpLevelup(false), 750);
      setIsLevelUpFlash(true);
      resetManagedTimeoutRef(levelUpFlashTimerRef, () => setIsLevelUpFlash(false), 520);
    }
    prevLevelRef.current = state.level;
  }, [state.level, spawnFeelBurst, playLevelUp, pushCombatFeed, resetManagedTimeoutRef]);

  useEffect(() => {
    const prev = prevDungeonSummaryRef.current;
    const nextSummary = state.dungeonState.lastRewardSummary;
    if (nextSummary && nextSummary !== prev) {
      setToast(nextSummary);
      playReward();
    }
    prevDungeonSummaryRef.current = nextSummary;
  }, [state.dungeonState.lastRewardSummary, setToast, playReward]);

  useEffect(() => {
    const gained = state.mesos - prevMesosRef.current;
    prevMesosRef.current = state.mesos;
    // Use a ref-check rather than isGoldBumping state to avoid a stale dep
    // that would re-run this effect (and re-diff mesos) on every bump toggle.
    if (gained >= 20 && !goldBumpTimerRef.current) {
      setIsGoldBumping(true);
      resetManagedTimeoutRef(goldBumpTimerRef, () => setIsGoldBumping(false), 450);
    }
    if (gained >= 50) {
      spawnGoldPop(gained);
    }
  }, [state.mesos, spawnGoldPop, resetManagedTimeoutRef]);

  useEffect(() => {
    const gainedGold = state.mesos - prevFeedMesosRef.current;
    const gainedXp = state.level === prevLevelRef.current ? state.xp - prevXpRef.current : state.xp;
    const gainedCrystals = state.crystals - prevCrystalsRef.current;
    const inventoryDiff = state.inventory.length - prevInventoryCountRef.current;

    if (gainedGold >= 60) {
      pushCombatFeed({ label: "Gold", value: `+${formatNumber(gainedGold)}`, tone: "gold" });
    }
    if (gainedXp >= 25) {
      pushCombatFeed({ label: "XP", value: `+${formatNumber(gainedXp)}`, tone: "xp" });
    }
    if (gainedCrystals > 0) {
      pushCombatFeed({ label: "Crystals", value: `+${formatNumber(gainedCrystals)}`, tone: "loot" });
    }
    if (inventoryDiff > 0) {
      pushCombatFeed({
        label: "Loot",
        value: `+${inventoryDiff} item${inventoryDiff > 1 ? "s" : ""}`,
        tone: "loot"
      });
    }

    prevXpRef.current = state.xp;
    prevCrystalsRef.current = state.crystals;
    prevInventoryCountRef.current = state.inventory.length;
    prevFeedMesosRef.current = state.mesos;
  }, [state.mesos, state.xp, state.level, state.crystals, state.inventory.length, pushCombatFeed]);

  useEffect(() => {
    if (state.engagementPulseSeq === prevPulseSeqRef.current) return;
    prevPulseSeqRef.current = state.engagementPulseSeq;
    const pulse = state.engagementPulse;
    if (!pulse) return;

    if (pulse.critHits > 0) {
      const critBurstDamage = Math.max(1, Math.round((dps / 8) * pulse.critHits));
      spawnDmg(critBurstDamage, "crit");
      spawnFeelBurst("crit", `Crit chain x${pulse.critHits}`);
      pushCombatFeed({ label: "Critical", value: `x${pulse.critHits}`, tone: "level" });
      playCrit();
    }

    if (pulse.momentumTier > 0 && state.killStreak >= 12) {
      pushCombatFeed({
        label: "Momentum",
        value: `Tier ${pulse.momentumTier} · +${pulse.momentumTier * 3}%`,
        tone: "xp"
      });
    }

    if (pulse.bonusDrops > 0) {
      pushCombatFeed({
        label: "Bonus Drop",
        value: `+${formatNumber(pulse.bonusGold)} gold · +${formatNumber(pulse.bonusXp)} xp`,
        tone: "loot"
      });
      spawnFeelBurst("kill", `Lucky bonus x${pulse.bonusDrops}`);
      playReward();
    }

    if (pulse.objectiveCompleted) {
      pushCombatFeed({
        label: "Objective",
        value: `+${formatNumber(pulse.objectiveRewardMesos)} gold · +${formatNumber(pulse.objectiveRewardXp)} xp`,
        tone: "gold"
      });
      spawnFeelBurst("level", "Objective complete!");
      playSuccess();
    }
  }, [
    state.engagementPulseSeq,
    state.engagementPulse,
    state.killStreak,
    dps,
    pushCombatFeed,
    spawnDmg,
    spawnFeelBurst,
    playCrit,
    playReward,
    playSuccess
  ]);

  return {
    dmgNums,
    feelBursts,
    rewardText,
    isHit,
    isKillFlash,
    isStageClear,
    isGoldBumping,
    isXpLevelup,
    goldPops,
    combatFeed,
    isBossHitShake,
    isLevelUpFlash,
    spawnDmg,
    pushCombatFeed
  };
}
