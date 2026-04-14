import { useEffect, useMemo, useRef, useState } from "react";
import { GameButton } from "./shared/GameButton";
import { GameCard } from "./shared/GameCard";
import { GameOverlay } from "./shared/GameOverlay";
import { GameShell } from "./shared/GameShell";
import { useMiniGamesSound } from "./shared/MiniGamesSound";
import { ScoreBadge } from "./shared/ScoreBadge";
import { StatDisplay } from "./shared/StatDisplay";
import { gameDebug } from "./shared/gameDebug";
import { updateGameMeta } from "./shared/gameMeta";
import { shouldVibrate } from "./shared/gameSettings";

type Target = {
  id: number;
  x: number;
  y: number;
  size: number;
  spawnedAt: number;
  lifespan: number;
  vx: number;
  vy: number;
};

const STORAGE_KEY = "snailslayer-aim-trainer-best";
const ROUND_SECONDS = 30;

export function AimTrainerGame() {
  const { playFailure, playSuccess } = useMiniGamesSound();
  const [phase, setPhase] = useState<"ready" | "running" | "paused" | "over">("ready");
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [hits, setHits] = useState(0);
  const [shots, setShots] = useState(0);
  const [combo, setCombo] = useState(0);
  const [target, setTarget] = useState<Target | null>(null);
  const [speedTier, setSpeedTier] = useState(1);
  const [shake, setShake] = useState(false);

  const timeLeftRef = useRef(ROUND_SECONDS);
  const animationRef = useRef<number | null>(null);
  const lastFrameRef = useRef<number | null>(null);
  const lastSpawnRef = useRef(0);
  const nextId = useRef(1);
  const runningRef = useRef(false);
  const debugTickRef = useRef(0);
  const spawnCountRef = useRef(0);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setBestScore(Number(saved) || 0);
    }
  }, []);

  useEffect(() => {
    if (phase !== "running") {
      runningRef.current = false;
      if (animationRef.current) {
        window.cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      lastFrameRef.current = null;
      return;
    }

    runningRef.current = true;
    gameDebug("aim-trainer:start");

    const tick = (timestamp: number) => {
      if (!runningRef.current) return;
      if (lastFrameRef.current == null) {
        lastFrameRef.current = timestamp;
      }
      const delta = Math.min((timestamp - lastFrameRef.current) / 1000, 0.05);
      lastFrameRef.current = timestamp;

      timeLeftRef.current = Math.max(0, timeLeftRef.current - delta);
      setTimeLeft(timeLeftRef.current);
      if (timeLeftRef.current <= 0.01) {
        finishRun();
      }

      setTarget((current) => {
        const elapsed = ROUND_SECONDS - timeLeftRef.current;
        const tier = 1 + Math.min(4, Math.floor(elapsed / 6));
        setSpeedTier(tier);
        const spawnInterval = Math.max(0.35, 0.9 - tier * 0.1);
        const lifespan = Math.max(0.45, 1.2 - tier * 0.15);

        if (current && timestamp - current.spawnedAt >= current.lifespan * 1000) {
          registerMiss();
          return null;
        }

        if (!current && timestamp - lastSpawnRef.current >= spawnInterval * 1000) {
          lastSpawnRef.current = timestamp;
          spawnCountRef.current += 1;
          gameDebug("aim-trainer:spawn", {
            count: spawnCountRef.current,
            lifespan: Number(lifespan.toFixed(2)),
            tier
          });
          return spawnTarget(timestamp, lifespan);
        }
        if (!current && timeLeftRef.current < ROUND_SECONDS - 1.2) {
          spawnCountRef.current += 1;
          gameDebug("aim-trainer:spawn-fallback", { count: spawnCountRef.current });
          return spawnTarget(timestamp, lifespan);
        }

        if (!current) {
          return null;
        }

        const nextX = clamp(current.x + current.vx * delta * 12, 8, 92);
        const nextY = clamp(current.y + current.vy * delta * 12, 12, 86);
        return { ...current, x: nextX, y: nextY };
      });

      if (timestamp - debugTickRef.current > 2000) {
        debugTickRef.current = timestamp;
        gameDebug("aim-trainer:tick", {
          timeLeft: Number(timeLeftRef.current.toFixed(2)),
          hasTarget: Boolean(target),
          score
        });
      }

      animationRef.current = window.requestAnimationFrame(tick);
    };

    animationRef.current = window.requestAnimationFrame(tick);
    return () => {
      runningRef.current = false;
      if (animationRef.current) {
        window.cancelAnimationFrame(animationRef.current);
      }
      lastFrameRef.current = null;
      gameDebug("aim-trainer:stop");
    };
  }, [phase]);

  const accuracy = useMemo(() => {
    if (shots === 0) return 100;
    return Math.round((hits / shots) * 100);
  }, [hits, shots]);

  const speedLabel = useMemo(() => {
    if (speedTier >= 4) return "Frenzy";
    if (speedTier >= 3) return "Rush";
    if (speedTier >= 2) return "Pace";
    return "Warmup";
  }, [speedTier]);

  function spawnTarget(timestamp: number, lifespan: number): Target {
    const size = 42 - speedTier * 4;
    return {
      id: nextId.current++,
      x: 10 + Math.random() * 80,
      y: 16 + Math.random() * 68,
      size,
      spawnedAt: timestamp,
      lifespan,
      vx: (Math.random() * 2 - 1) * (1 + speedTier * 0.4),
      vy: (Math.random() * 2 - 1) * (1 + speedTier * 0.4)
    };
  }

  function startRun() {
    nextId.current = 1;
    lastSpawnRef.current = 0;
    spawnCountRef.current = 0;
    timeLeftRef.current = ROUND_SECONDS;
    setTimeLeft(ROUND_SECONDS);
    setScore(0);
    setHits(0);
    setShots(0);
    setCombo(0);
    setTarget(null);
    setSpeedTier(1);
    setPhase("running");
    playSuccess();
  }

  function pauseRun() {
    if (phase !== "running") return;
    setPhase("paused");
  }

  function resumeRun() {
    if (phase !== "paused") return;
    lastFrameRef.current = null;
    setPhase("running");
  }

  function finishRun() {
    if (!runningRef.current) return;
    runningRef.current = false;
    setPhase("over");
    updateGameMeta({ gameId: "aim-trainer", score, outcome: "loss" });
    setBestScore((current) => {
      const next = Math.max(current, score);
      window.localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  }

  function registerHit(isHeadshot: boolean) {
    const base = 40 + speedTier * 8;
    const headshotBonus = isHeadshot ? 30 + speedTier * 6 : 0;
    const comboMultiplier = 1 + Math.min(combo, 10) * 0.08;
    const bonus = Math.round((base + headshotBonus) * comboMultiplier);
    setScore((current) => current + bonus);
    setHits((current) => current + 1);
    setShots((current) => current + 1);
    setCombo((current) => current + 1);
    setTarget(null);
    playSuccess();
    if (shouldVibrate()) {
      navigator.vibrate(14);
    }
  }

  function registerMiss() {
    setShots((current) => current + 1);
    setScore((current) => Math.max(0, current - 25));
    setCombo(0);
    setShake(true);
    window.setTimeout(() => setShake(false), 200);
    playFailure();
    if (shouldVibrate()) {
      navigator.vibrate([20, 30, 20]);
    }
  }

  function handleMissClick() {
    if (phase !== "running") {
      startRun();
      return;
    }
    registerMiss();
  }

  function resetRun() {
    timeLeftRef.current = ROUND_SECONDS;
    setPhase("ready");
    setTimeLeft(ROUND_SECONDS);
    setScore(0);
    setHits(0);
    setShots(0);
    setTarget(null);
    setSpeedTier(1);
    setShake(false);
  }

  return (
    <GameShell
      title="Aim Trainer"
      subtitle="Hit every target fast. Misses drain score."
      icon="AT"
      badge={speedLabel}
      aspectRatio="4 / 3"
      stats={
        <>
          <StatDisplay label="Score" value={score} />
          <StatDisplay label="Accuracy" value={`${accuracy}%`} />
          <StatDisplay label="Hits" value={hits} />
          <StatDisplay label="Combo" value={combo} />
          <StatDisplay label="Best" value={bestScore} />
        </>
      }
      footer={
        <div className="game-shell__footer-row">
          <ScoreBadge label="Time" value={`${timeLeft.toFixed(1)}s`} tone={timeLeft < 6 ? "danger" : "default"} />
          <div className="game-shell__actions">
            <GameButton onClick={phase === "running" ? handleMissClick : startRun}>
              {phase === "running" ? "Miss" : phase === "over" ? "Try Again" : "Start"}
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
      <div className={`aim-trainer ${shake ? "is-shaking" : ""}`}>
        <GameCard className="aim-trainer__board" tone="highlight">
          <button className="aim-trainer__arena" type="button" onClick={handleMissClick} aria-label="Aim trainer arena">
            {target ? (
              <span
                className="aim-trainer__target"
                onClick={(event) => {
                  event.stopPropagation();
                  const rect = (event.currentTarget as HTMLSpanElement).getBoundingClientRect();
                  const centerX = rect.left + rect.width / 2;
                  const centerY = rect.top + rect.height / 2;
                  const dx = event.clientX - centerX;
                  const dy = event.clientY - centerY;
                  const distance = Math.hypot(dx, dy);
                  const headshot = distance <= rect.width * 0.18;
                  registerHit(headshot);
                }}
                role="button"
                tabIndex={0}
                style={{
                  left: `${target.x}%`,
                  top: `${target.y}%`,
                  width: `${target.size}px`,
                  height: `${target.size}px`
                }}
              />
            ) : null}
          </button>
        </GameCard>

        <GameOverlay
          title={phase === "ready" ? "Aim Trainer" : phase === "paused" ? "Paused" : phase === "over" ? "Run Over" : ""}
          description={
            phase === "ready"
              ? "Tap every target quickly. Misses cut the score."
              : phase === "paused"
                ? "Hold steady and resume."
                : phase === "over"
                  ? "Time is up. Push accuracy next run."
                  : undefined
          }
          helper={phase === "over" ? `Score ${score} • Best ${bestScore}` : phase === "ready" ? "Start to begin." : undefined}
          actions={
            phase === "ready" ? (
              <GameButton onClick={startRun}>Start</GameButton>
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

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
