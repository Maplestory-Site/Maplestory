import { useEffect, useMemo, useRef, useState } from "react";
import { GameButton } from "./shared/GameButton";
import { GameCard } from "./shared/GameCard";
import { GameOverlay } from "./shared/GameOverlay";
import { GameShell } from "./shared/GameShell";
import { useMiniGamesSound } from "./shared/MiniGamesSound";
import { ScoreBadge } from "./shared/ScoreBadge";
import { StatDisplay } from "./shared/StatDisplay";
import { updateGameMeta } from "./shared/gameMeta";
import { shouldVibrate } from "./shared/gameSettings";

type Wire = {
  id: number;
  label: string;
  isCorrect: boolean;
  isFake: boolean;
};

const STORAGE_KEY = "snailslayer-bomb-defuse-best";

const LABELS = ["Alpha", "Bravo", "Cipher", "Delta", "Echo", "Foxtrot", "Gamma"];

export function BombDefuseGame() {
  const { playFailure, playSuccess } = useMiniGamesSound();
  const [phase, setPhase] = useState<"ready" | "running" | "paused" | "over">("ready");
  const [wires, setWires] = useState<Wire[]>([]);
  const [round, setRound] = useState(1);
  const [timeLeft, setTimeLeft] = useState(7);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [baitId, setBaitId] = useState<number | null>(null);
  const [shake, setShake] = useState(false);

  const timerRef = useRef<number | null>(null);
  const timeLeftRef = useRef(7);

  function finishRun() {
    setPhase("over");
    updateGameMeta({ gameId: "bomb-defuse", score, outcome: "loss" });
    playFailure();
    if (shouldVibrate()) {
      navigator.vibrate([30, 50, 30]);
    }
    setShake(true);
    window.setTimeout(() => setShake(false), 260);
    setBestScore((current) => {
      const next = Math.max(current, score);
      window.localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  }

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setBestScore(Number(saved) || 0);
    }
  }, []);

  useEffect(() => {
    if (phase !== "running") {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
      }
      timerRef.current = null;
      return;
    }

    timerRef.current = window.setInterval(() => {
      const next = Math.max(0, timeLeftRef.current - 0.1);
      timeLeftRef.current = next;
      setTimeLeft(next);
      if (next <= 0.05) {
        finishRun();
      }
    }, 100);

    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
      }
      timerRef.current = null;
    };
  }, [phase]);

  useEffect(() => {
    if (phase !== "running") return;
    if (timeLeft > 2.6) return;
    setShake(true);
    const timeout = window.setTimeout(() => setShake(false), timeLeft <= 1.2 ? 90 : 140);
    return () => window.clearTimeout(timeout);
  }, [phase, timeLeft]);

  const pressureLabel = useMemo(() => {
    if (round >= 8) return "Critical";
    if (round >= 5) return "High";
    return "Rising";
  }, [round]);

  const tensionLevel = useMemo(() => {
    if (timeLeft <= 1.2) return "critical";
    if (timeLeft <= 2.6) return "high";
    return "steady";
  }, [timeLeft]);

  function buildRound(nextRound = round) {
    const count = Math.min(6, 3 + Math.floor(nextRound / 2));
    const options = shuffle(LABELS).slice(0, count);
    const correctIndex = Math.floor(Math.random() * options.length);
    const fakeCount = Math.min(2, Math.floor(Math.random() * (nextRound >= 4 ? 3 : 2)));
    const fakePool = options
      .map((_, index) => index)
      .filter((index) => index !== correctIndex);
    const fakeIndexes = shuffle(fakePool).slice(0, fakeCount);
    const nextWires = options.map((label, index) => ({
      id: index + 1,
      label,
      isCorrect: index === correctIndex,
      isFake: fakeIndexes.includes(index)
    }));
    setWires(nextWires);
    const baseTime = Math.max(2.6, 7 - nextRound * 0.45);
    timeLeftRef.current = baseTime;
    setTimeLeft(baseTime);
    const baitChance = Math.min(0.4, 0.12 + nextRound * 0.04);
    if (Math.random() < baitChance) {
      const baitOptions = nextWires.filter((_, index) => index !== correctIndex);
      const bait = baitOptions[Math.floor(Math.random() * baitOptions.length)];
      setBaitId(bait?.id ?? null);
      window.setTimeout(() => setBaitId(null), 700 + Math.random() * 400);
    } else {
      setBaitId(null);
    }
  }

  function startRun() {
    setRound(1);
    setScore(0);
    setStreak(0);
    setBaitId(null);
    buildRound(1);
    setPhase("running");
    playSuccess();
  }

  function pauseRun() {
    if (phase !== "running") return;
    setPhase("paused");
  }

  function resumeRun() {
    if (phase !== "paused") return;
    setPhase("running");
  }

  function handleChoice(selectedWire: Wire) {
    if (phase !== "running") return;
    if (!selectedWire.isCorrect) {
      finishRun();
      return;
    }

    const bonus = Math.round(80 + timeLeft * 12 + streak * 10);
    setScore((current) => current + bonus);
    setStreak((current) => current + 1);
    setRound((current) => current + 1);
    buildRound(round + 1);
    playSuccess();
    if (shouldVibrate()) {
      navigator.vibrate(18);
    }
  }

  function resetRun() {
    setPhase("ready");
    setRound(1);
    setScore(0);
    setStreak(0);
    setWires([]);
    timeLeftRef.current = 7;
    setTimeLeft(7);
    setShake(false);
    setBaitId(null);
  }

  return (
    <GameShell
      title="Bomb Defuse"
      subtitle="Pick the correct wire before the timer hits zero."
      icon="BD"
      badge={pressureLabel}
      aspectRatio="4 / 3"
      stats={
        <>
          <StatDisplay label="Score" value={score} />
          <StatDisplay label="Round" value={round} />
          <StatDisplay label="Streak" value={streak} />
          <StatDisplay label="Best" value={bestScore} />
        </>
      }
      footer={
        <div className="game-shell__footer-row">
          <ScoreBadge label="Timer" value={`${timeLeft.toFixed(1)}s`} tone={timeLeft < 2.2 ? "danger" : "default"} />
          <div className="game-shell__actions">
            <GameButton onClick={phase === "running" ? () => undefined : startRun}>
              {phase === "over" ? "Try Again" : "Start Defuse"}
            </GameButton>
            <GameButton onClick={phase === "running" ? pauseRun : resumeRun} variant="secondary">
              {phase === "paused" ? "Resume" : "Pause"}
            </GameButton>
            <GameButton onClick={resetRun} variant="secondary">
              Reset
            </GameButton>
          </div>
        </div>
      }
    >
      <div className={`bomb-defuse ${shake ? "is-shaking" : ""}`}>
        <GameCard className={`bomb-defuse__board is-${tensionLevel}`} tone="highlight">
          <div className="bomb-defuse__header">
            <span className="bomb-defuse__status">{pressureLabel} Pressure</span>
            <strong>Choose the correct wire</strong>
            <span className={`bomb-defuse__timer is-${tensionLevel}`}>{timeLeft.toFixed(1)}s</span>
            {tensionLevel !== "steady" && (
              <span className={`bomb-defuse__warning is-${tensionLevel}`}>
                {tensionLevel === "critical" ? "Final seconds" : "Time pressure rising"}
              </span>
            )}
          </div>
          <div className="bomb-defuse__grid">
            {wires.map((wire) => (
              <button
                className={`bomb-defuse__wire ${wire.isFake ? "is-fake" : ""} ${baitId === wire.id ? "is-bait" : ""}`}
                key={wire.id}
                onClick={() => handleChoice(wire)}
                type="button"
              >
                <span>{wire.label}</span>
                {wire.isFake && <span className="bomb-defuse__hint">Safe?</span>}
              </button>
            ))}
          </div>
        </GameCard>

        <GameOverlay
          title={phase === "ready" ? "Bomb Defuse" : phase === "paused" ? "Paused" : phase === "over" ? "Boom" : ""}
          description={
            phase === "ready"
              ? "Watch the timer. Pick the right wire fast."
              : phase === "paused"
                ? "Hold steady. Resume when ready."
                : phase === "over"
                  ? "Wrong wire or time-out. Tighten the focus."
                  : undefined
          }
          helper={phase === "over" ? `Score ${score} • Best ${bestScore}` : phase === "ready" ? "Tap start to begin." : undefined}
          actions={
            phase === "ready" ? (
              <GameButton onClick={startRun}>Start Defuse</GameButton>
            ) : phase === "paused" ? (
              <GameButton onClick={resumeRun}>Resume</GameButton>
            ) : phase === "over" ? (
              <GameButton onClick={startRun}>Try Again</GameButton>
            ) : null
          }
          tone={phase === "over" ? "danger" : "default"}
          visible={phase === "ready" || phase === "paused" || phase === "over"}
        />
      </div>
    </GameShell>
  );
}

function shuffle<T>(list: T[]) {
  const items = [...list];
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}
