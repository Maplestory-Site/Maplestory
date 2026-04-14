import { useEffect, useMemo, useRef, useState } from "react";
import { GameButton } from "./shared/GameButton";
import { GameCard } from "./shared/GameCard";
import { GameOverlay } from "./shared/GameOverlay";
import { GameShell } from "./shared/GameShell";
import { useMiniGamesSound } from "./shared/MiniGamesSound";
import { ScoreBadge } from "./shared/ScoreBadge";
import { StatDisplay } from "./shared/StatDisplay";
import { SwipeControls } from "./shared/SwipeControls";
import { TouchControls } from "./shared/TouchControls";
import { gameDebug } from "./shared/gameDebug";
import { updateGameMeta } from "./shared/gameMeta";
import { shouldVibrate } from "./shared/gameSettings";
import { useTouchDevice } from "./shared/useTouchDevice";

type Obstacle = {
  id: number;
  lane: number;
  y: number;
  speed: number;
  type: "low" | "high";
  scored: boolean;
};

const STORAGE_KEY = "snailslayer-lane-runner-best";
const LANE_COUNT = 3;

export function LaneSwitchRunnerGame() {
  const { playFailure, playSuccess } = useMiniGamesSound();
  const [phase, setPhase] = useState<"ready" | "running" | "paused" | "over">("ready");
  const [lane, setLane] = useState(1);
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [distance, setDistance] = useState(0);
  const [streak, setStreak] = useState(0);
  const [shake, setShake] = useState(false);
  const [jumpActive, setJumpActive] = useState(false);

  const distanceRef = useRef(0);
  const laneRef = useRef(1);
  const runRef = useRef(false);
  const animationRef = useRef<number | null>(null);
  const lastFrameRef = useRef<number | null>(null);
  const spawnTimerRef = useRef(0);
  const nextId = useRef(1);
  const jumpTimeRef = useRef(0);
  const jumpCooldownRef = useRef(0);
  const debugTickRef = useRef(0);
  const spawnCountRef = useRef(0);
  const isTouch = useTouchDevice();

  useEffect(() => {
    laneRef.current = lane;
  }, [lane]);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setBestScore(Number(saved) || 0);
    }
  }, []);

  useEffect(() => {
    if (phase !== "running") {
      runRef.current = false;
      if (animationRef.current) {
        window.cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      lastFrameRef.current = null;
      return;
    }

    runRef.current = true;
    gameDebug("lane-runner:start");

    const loop = (timestamp: number) => {
      if (!runRef.current) return;
      if (lastFrameRef.current == null) {
        lastFrameRef.current = timestamp;
      }
      const delta = Math.min((timestamp - lastFrameRef.current) / 1000, 0.045);
      lastFrameRef.current = timestamp;
      spawnTimerRef.current += delta;
      jumpTimeRef.current = Math.max(0, jumpTimeRef.current - delta);
      jumpCooldownRef.current = Math.max(0, jumpCooldownRef.current - delta);
      setJumpActive(jumpTimeRef.current > 0);
      distanceRef.current += delta * 12;
      setDistance(distanceRef.current);

      setObstacles((current) => {
        const speedBase = 30 + Math.min(distanceRef.current * 1.1, 40);
        const spawnInterval = Math.max(0.35, 1.1 - distanceRef.current * 0.02);

        let next = current
          .map((obstacle) => ({
            ...obstacle,
            y: obstacle.y + obstacle.speed * delta
          }))
          .filter((obstacle) => obstacle.y < 120);

        if (spawnTimerRef.current >= spawnInterval) {
          spawnTimerRef.current = 0;
          let pattern: number[] = [];
          const roll = Math.random();
          if (roll > 0.82) {
            pattern = [0, 2];
          } else if (roll > 0.64) {
            pattern = [0, 1, 2];
          } else {
            pattern = [Math.floor(Math.random() * LANE_COUNT)];
          }
          spawnCountRef.current += 1;
          gameDebug("lane-runner:spawn", {
            count: spawnCountRef.current,
            speed: Math.round(speedBase),
            pattern: pattern.length
          });
          next = next.concat(
            pattern.map((laneIndex, idx) => ({
              id: nextId.current++,
              lane: laneIndex,
              y: -10 - idx * 9,
              speed: speedBase + Math.random() * 10,
              type: Math.random() > 0.75 ? "high" : "low",
              scored: false
            }))
          );
        }
        if (next.length === 0 && distanceRef.current > 6) {
          spawnCountRef.current += 1;
          gameDebug("lane-runner:spawn-fallback", { count: spawnCountRef.current });
          next = next.concat({
            id: nextId.current++,
            lane: Math.floor(Math.random() * LANE_COUNT),
            y: -8,
            speed: speedBase + 6,
            type: "low",
            scored: false
          });
        }

        const hit = next.some((obstacle) => {
          if (obstacle.lane !== laneRef.current) return false;
          if (obstacle.y < 78 || obstacle.y > 94) return false;
          if (obstacle.type === "low" && jumpTimeRef.current > 0) return false;
          return true;
        });
        if (hit) {
          window.setTimeout(() => finishRun(), 0);
        }

        next = next.map((obstacle) => {
          if (!obstacle.scored && obstacle.y > 96) {
            setStreak((currentValue) => currentValue + 1);
            setScore((currentValue) => currentValue + 12);
            return { ...obstacle, scored: true };
          }
          return obstacle;
        });

        if (timestamp - debugTickRef.current > 2000) {
          debugTickRef.current = timestamp;
          gameDebug("lane-runner:tick", {
            distance: Number(distanceRef.current.toFixed(2)),
            obstacles: next.length,
            lane: laneRef.current,
            jumping: jumpTimeRef.current > 0
          });
        }

        return next;
      });

      setScore((current) => current + delta * 6);
      animationRef.current = window.requestAnimationFrame(loop);
    };

    animationRef.current = window.requestAnimationFrame(loop);

    return () => {
      runRef.current = false;
      if (animationRef.current) {
        window.cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      lastFrameRef.current = null;
      gameDebug("lane-runner:stop");
    };
  }, [phase]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (phase !== "running") return;
      if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") moveLeft();
      if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") moveRight();
      if (event.key === " " || event.key === "ArrowUp" || event.key.toLowerCase() === "w") triggerJump();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [phase]);

  const paceLabel = useMemo(() => {
    if (distance >= 160) return "Hyper";
    if (distance >= 80) return "Fast";
    return "Flow";
  }, [distance]);

  function startRun() {
    nextId.current = 1;
    spawnTimerRef.current = 0;
    jumpTimeRef.current = 0;
    jumpCooldownRef.current = 0;
    distanceRef.current = 0;
    spawnCountRef.current = 0;
    setLane(1);
    setObstacles([]);
    setScore(0);
    setDistance(0);
    setStreak(0);
    setJumpActive(false);
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
    if (!runRef.current) return;
    runRef.current = false;
    setPhase("over");
    playFailure();
    updateGameMeta({ gameId: "lane-switch-runner", score: Math.round(score), outcome: "loss" });
    if (shouldVibrate()) {
      navigator.vibrate([30, 60, 30]);
    }
    setShake(true);
    window.setTimeout(() => setShake(false), 260);
    setBestScore((current) => {
      const next = Math.max(current, Math.round(score));
      window.localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  }

  function resetRun() {
    distanceRef.current = 0;
    setPhase("ready");
    setLane(1);
    setObstacles([]);
    setScore(0);
    setDistance(0);
    setStreak(0);
    setJumpActive(false);
    setShake(false);
  }

  function moveLeft() {
    if (phase !== "running") {
      startRun();
    }
    setLane((current) => Math.max(0, current - 1));
  }

  function moveRight() {
    if (phase !== "running") {
      startRun();
    }
    setLane((current) => Math.min(LANE_COUNT - 1, current + 1));
  }

  function triggerJump() {
    if (phase !== "running") {
      startRun();
    }
    if (jumpTimeRef.current > 0 || jumpCooldownRef.current > 0) return;
    jumpTimeRef.current = 0.6;
    jumpCooldownRef.current = 0.35;
    setJumpActive(true);
    playSuccess();
  }

  return (
    <GameShell
      title="Lane Switch Runner"
      subtitle="Switch lanes fast and survive the endless run."
      icon="LR"
      badge={paceLabel}
      aspectRatio="3 / 4"
      stats={
        <>
          <StatDisplay label="Score" value={Math.round(score)} />
          <StatDisplay label="Best" value={bestScore} />
          <StatDisplay label="Distance" value={distance.toFixed(1)} />
          <StatDisplay label="Streak" value={streak} />
        </>
      }
      footer={
        <div className="game-shell__footer-row">
          <ScoreBadge label="Run" value={phase === "running" ? "Flow" : phase === "over" ? "Hit" : "Ready"} />
          <div className="game-shell__actions">
            <GameButton onClick={phase === "running" ? () => undefined : startRun}>
              {phase === "over" ? "Run Again" : "Start Run"}
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
      <div className={`lane-runner ${shake ? "is-shaking" : ""}`}>
        <GameCard className="lane-runner__board" tone="highlight">
          <div className="lane-runner__arena" role="img" aria-label="Lane runner arena">
            {Array.from({ length: LANE_COUNT }).map((_, index) => (
              <div className={`lane-runner__lane ${lane === index ? "is-active" : ""}`} key={index} />
            ))}
            {obstacles.map((obstacle) => (
              <span
                className={`lane-runner__obstacle is-${obstacle.type}`}
                key={obstacle.id}
                style={{
                  left: `${(obstacle.lane + 0.5) * (100 / LANE_COUNT)}%`,
                  top: `${obstacle.y}%`
                }}
              />
            ))}
            <span
              className={`lane-runner__player ${jumpActive ? "is-jumping" : ""}`}
              style={{
                left: `${(lane + 0.5) * (100 / LANE_COUNT)}%`,
                ["--jump-offset" as string]: jumpActive ? "34px" : "0px"
              }}
            />
          </div>
          {isTouch ? (
            <SwipeControls
              onSwipeLeft={moveLeft}
              onSwipeRight={moveRight}
              onSwipeUp={triggerJump}
              label="Swipe to move"
            />
          ) : (
            <div className="lane-runner__controls">
              <TouchControls leftLabel="Left" rightLabel="Right" onLeft={moveLeft} onRight={moveRight} />
              <button className="lane-runner__jump" type="button" onClick={triggerJump}>
                Jump
              </button>
            </div>
          )}
        </GameCard>

        <GameOverlay
          title={phase === "ready" ? "Lane Switch Runner" : phase === "paused" ? "Paused" : phase === "over" ? "Run Over" : ""}
          description={
            phase === "ready"
              ? "Swipe or tap to switch lanes. Avoid every obstacle."
              : phase === "paused"
                ? "Resume when ready."
                : phase === "over"
                  ? "Hit the block. Try again."
                  : undefined
          }
          helper={phase === "over" ? `Score ${Math.round(score)} • Best ${bestScore}` : phase === "ready" ? "Tap start to begin." : undefined}
          actions={
            phase === "ready" ? (
              <GameButton onClick={startRun}>Start Run</GameButton>
            ) : phase === "paused" ? (
              <GameButton onClick={resumeRun}>Resume</GameButton>
            ) : phase === "over" ? (
              <GameButton onClick={startRun}>Run Again</GameButton>
            ) : null
          }
          tone={phase === "over" ? "danger" : "default"}
          visible={phase === "ready" || phase === "paused" || phase === "over"}
        />
      </div>
    </GameShell>
  );
}
