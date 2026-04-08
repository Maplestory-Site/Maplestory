import { useEffect, useMemo, useRef, useState } from "react";
import { GameButton } from "./shared/GameButton";
import { GameCard } from "./shared/GameCard";
import { GameShell } from "./shared/GameShell";
import { useMiniGamesSound } from "./shared/MiniGamesSound";
import { ScoreBadge } from "./shared/ScoreBadge";
import { StatDisplay } from "./shared/StatDisplay";

type Attack = {
  id: number;
  lane: number;
  y: number;
  speed: number;
  state: "warning" | "falling";
  warningElapsed: number;
};

const STORAGE_KEY = "snailslayer-boss-dodge-best";
const LANE_COUNT = 3;

function getBossPressureLabel(time: number) {
  if (time >= 28) return "Pressure III";
  if (time >= 14) return "Pressure II";
  return "Pressure I";
}

export function BossDodgeGame() {
  const { playFailure, playSuccess } = useMiniGamesSound();
  const [phase, setPhase] = useState<"ready" | "running" | "over">("ready");
  const [playerLane, setPlayerLane] = useState(1);
  const [attacks, setAttacks] = useState<Attack[]>([]);
  const [survivalTime, setSurvivalTime] = useState(0);
  const [bestTime, setBestTime] = useState(0);
  const [lastTime, setLastTime] = useState(0);
  const [clutches, setClutches] = useState(0);
  const nextId = useRef(1);
  const laneRef = useRef(1);
  const runningRef = useRef(false);
  const animationRef = useRef<number | null>(null);
  const lastFrameRef = useRef<number | null>(null);
  const spawnTimerRef = useRef(0);

  useEffect(() => {
    laneRef.current = playerLane;
  }, [playerLane]);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setBestTime(Number(saved) || 0);
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

    const loop = (timestamp: number) => {
      if (!runningRef.current) {
        return;
      }

      if (lastFrameRef.current == null) {
        lastFrameRef.current = timestamp;
      }

      const delta = Math.min((timestamp - lastFrameRef.current) / 1000, 0.045);
      lastFrameRef.current = timestamp;

      setSurvivalTime((current) => current + delta);
      spawnTimerRef.current += delta;

      setAttacks((current) => {
        const nextTime = survivalTime + delta;
        const dangerSpeed = 33 + Math.min(nextTime * 0.9, 18);
        const warningDuration = Math.max(0.28, 0.62 - nextTime * 0.01);
        const spawnInterval = Math.max(0.48, 1.08 - nextTime * 0.018);

        let nextAttacks = current
          .map((attack) => {
            if (attack.state === "warning") {
              const warningElapsed = attack.warningElapsed + delta;
              if (warningElapsed >= warningDuration) {
                return {
                  ...attack,
                  state: "falling" as const,
                  warningElapsed
                };
              }

              return {
                ...attack,
                warningElapsed
              };
            }

            return {
              ...attack,
              y: attack.y + attack.speed * delta
            };
          })
          .filter((attack) => attack.y <= 112);

        if (spawnTimerRef.current >= spawnInterval) {
          spawnTimerRef.current = 0;
          nextAttacks = nextAttacks.concat({
            id: nextId.current++,
            lane: Math.floor(Math.random() * LANE_COUNT),
            y: -10,
            speed: dangerSpeed,
            state: "warning",
            warningElapsed: 0
          });
        }

        const hit = nextAttacks.some(
          (attack) => attack.state === "falling" && attack.lane === laneRef.current && attack.y >= 75 && attack.y <= 92
        );

        if (hit) {
          window.setTimeout(() => finishRun(nextTime), 0);
        }

        const exitedClutches = nextAttacks.filter(
          (attack) => attack.state === "falling" && attack.y > 92 && attack.y <= 112 && attack.lane === laneRef.current
        );

        if (exitedClutches.length > 0) {
          setClutches((currentValue) => currentValue + exitedClutches.length);
        }

        return nextAttacks;
      });

      animationRef.current = window.requestAnimationFrame(loop);
    };

    animationRef.current = window.requestAnimationFrame(loop);

    return () => {
      runningRef.current = false;
      if (animationRef.current) {
        window.cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      lastFrameRef.current = null;
    };
  }, [phase, playFailure, survivalTime]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (phase !== "running") {
        return;
      }

      if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") {
        moveLeft();
      }

      if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") {
        moveRight();
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [phase]);

  const warningLanes = useMemo(
    () =>
      Array.from(
        new Set(attacks.filter((attack) => attack.state === "warning").map((attack) => attack.lane))
      ),
    [attacks]
  );

  const survivalSeconds = survivalTime.toFixed(1);
  const bestSeconds = bestTime.toFixed(1);
  const lastSeconds = lastTime.toFixed(1);

  function startRun() {
    nextId.current = 1;
    spawnTimerRef.current = 0;
    setAttacks([]);
    setSurvivalTime(0);
    setPlayerLane(1);
    laneRef.current = 1;
    setLastTime(0);
    setClutches(0);
    setPhase("running");
    playSuccess();
  }

  function finishRun(time: number) {
    if (!runningRef.current) {
      return;
    }

    runningRef.current = false;
    setLastTime(time);
    setPhase("over");
    playFailure();
    setBestTime((currentBest) => {
      const nextBest = Math.max(currentBest, time);
      window.localStorage.setItem(STORAGE_KEY, String(nextBest));
      return nextBest;
    });
  }

  function resetRun() {
    runningRef.current = false;
    if (animationRef.current) {
      window.cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    lastFrameRef.current = null;
    spawnTimerRef.current = 0;
    setPhase("ready");
    setAttacks([]);
    setSurvivalTime(0);
    setPlayerLane(1);
    laneRef.current = 1;
    setLastTime(0);
    setClutches(0);
  }

  function moveLeft() {
    setPlayerLane((current) => Math.max(current - 1, 0));
  }

  function moveRight() {
    setPlayerLane((current) => Math.min(current + 1, LANE_COUNT - 1));
  }

  return (
    <GameShell
      badge={getBossPressureLabel(survivalTime)}
      icon="BD"
      subtitle="Read the warning, slide lanes, and survive the boss pattern."
      stats={
        <>
          <StatDisplay label="Survival" value={`${survivalSeconds}s`} />
          <StatDisplay label="Best" value={`${bestSeconds}s`} />
          <StatDisplay label="Lane" value={playerLane + 1} />
          <StatDisplay label="Clutches" value={clutches} />
        </>
      }
      title="Boss Dodge"
      footer={
        <div className="game-shell__footer-row">
          <ScoreBadge
            label="Run"
            tone={phase === "over" ? "danger" : phase === "running" ? "success" : "default"}
            value={phase === "over" ? `${lastSeconds}s` : phase === "running" ? "Active" : "Ready"}
          />
          <div className="game-shell__actions">
            <GameButton disabled={phase === "running"} onClick={phase === "running" ? undefined : startRun}>
              {phase === "over" ? "Run Again" : "Start Dodge"}
            </GameButton>
            <GameButton onClick={resetRun} variant="secondary">
              Reset
            </GameButton>
          </div>
        </div>
      }
    >
      <div className="boss-dodge">
        <GameCard className="boss-dodge__board" tone="highlight">
          <div className="boss-dodge__arena" role="img" aria-label="Three lane dodge arena">
            {Array.from({ length: LANE_COUNT }).map((_, lane) => (
              <button
                aria-label={`Move to lane ${lane + 1}`}
                className={`boss-dodge__lane ${playerLane === lane ? "is-active" : ""} ${
                  warningLanes.includes(lane) ? "is-warning" : ""
                }`}
                key={lane}
                onClick={() => setPlayerLane(lane)}
                type="button"
              >
                <span className="boss-dodge__lane-label">Lane {lane + 1}</span>
                {attacks
                  .filter((attack) => attack.lane === lane)
                  .map((attack) => (
                    <span
                      className={`boss-dodge__attack ${attack.state === "warning" ? "is-warning" : ""}`}
                      key={attack.id}
                      style={{ top: `${attack.y}%` }}
                    />
                  ))}
                {playerLane === lane ? <span className="boss-dodge__player" /> : null}
              </button>
            ))}
          </div>
        </GameCard>

        <div className="boss-dodge__footer-grid">
          <GameCard className="game-feedback" tone="muted">
            <strong>
              {phase === "running"
                ? "Read the warning first, then cut clean."
                : phase === "over"
                  ? "One hit ends it. The next run needs cleaner reads."
                  : "Stay loose, watch the warning flash, then move."}
            </strong>
            <span>
              {phase === "running"
                ? "Pressure ramps every few seconds. Survival is the score."
                : phase === "over"
                  ? `Last run: ${lastSeconds}s with ${clutches} clean clutch dodges.`
                  : "Tap a lane or use left/right to dodge the next pattern."}
            </span>
          </GameCard>

          <div className="boss-dodge__controls">
            <GameButton onClick={moveLeft} variant="secondary">
              Left
            </GameButton>
            <GameButton onClick={moveRight} variant="secondary">
              Right
            </GameButton>
          </div>
        </div>
      </div>
    </GameShell>
  );
}
