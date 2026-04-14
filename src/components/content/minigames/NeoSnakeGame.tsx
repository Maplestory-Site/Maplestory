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
import { updateGameMeta } from "./shared/gameMeta";
import { shouldVibrate } from "./shared/gameSettings";
import { useTouchDevice } from "./shared/useTouchDevice";

type Direction = "up" | "down" | "left" | "right";

const STORAGE_KEY = "snailslayer-neo-snake-best";
const GRID_SIZE = 14;
const START_LENGTH = 3;

type Point = { x: number; y: number };

const OPPOSITE: Record<Direction, Direction> = {
  up: "down",
  down: "up",
  left: "right",
  right: "left"
};

function nextPosition(head: Point, direction: Direction) {
  switch (direction) {
    case "up":
      return { x: head.x, y: head.y - 1 };
    case "down":
      return { x: head.x, y: head.y + 1 };
    case "left":
      return { x: head.x - 1, y: head.y };
    case "right":
      return { x: head.x + 1, y: head.y };
    default:
      return head;
  }
}

function randomFood(exclude: Point[]) {
  const taken = new Set(exclude.map((point) => `${point.x}:${point.y}`));
  const safe: Point[] = [];
  for (let x = 0; x < GRID_SIZE; x += 1) {
    for (let y = 0; y < GRID_SIZE; y += 1) {
      const key = `${x}:${y}`;
      if (!taken.has(key)) safe.push({ x, y });
    }
  }
  return safe[Math.floor(Math.random() * safe.length)];
}

export function NeoSnakeGame() {
  const { playFailure, playSuccess } = useMiniGamesSound();
  const [phase, setPhase] = useState<"ready" | "running" | "paused" | "over">("ready");
  const [snake, setSnake] = useState<Point[]>([]);
  const [food, setFood] = useState<Point | null>(null);
  const [direction, setDirection] = useState<Direction>("right");
  const [queuedDirection, setQueuedDirection] = useState<Direction>("right");
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [speedTier, setSpeedTier] = useState(1);
  const [shake, setShake] = useState(false);
  const [boostTicks, setBoostTicks] = useState(0);
  const isTouch = useTouchDevice();

  const timerRef = useRef<number | null>(null);
  const directionRef = useRef(direction);

  useEffect(() => {
    directionRef.current = direction;
  }, [direction]);

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

    const burstBonus = boostTicks > 0 ? 40 : 0;
    const interval = Math.max(110, 280 - speedTier * 20 - burstBonus);
    timerRef.current = window.setInterval(() => step(), interval);

    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
      }
      timerRef.current = null;
    };
  }, [phase, speedTier, queuedDirection, food, snake]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (phase !== "running") return;
      if (event.key === "ArrowUp" || event.key.toLowerCase() === "w") queueDirection("up");
      if (event.key === "ArrowDown" || event.key.toLowerCase() === "s") queueDirection("down");
      if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") queueDirection("left");
      if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") queueDirection("right");
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [phase, direction]);

  const speedLabel = useMemo(() => {
    if (speedTier >= 5) return "Hyper";
    if (speedTier >= 4) return "Fast";
    if (speedTier >= 3) return "Pace";
    if (speedTier >= 2) return "Flow";
    return "Warmup";
  }, [speedTier]);

  function startRun() {
    const start: Point[] = [];
    for (let i = 0; i < START_LENGTH; i += 1) {
      start.push({ x: 6 - i, y: 6 });
    }
    setSnake(start);
    setDirection("right");
    setQueuedDirection("right");
    setScore(0);
    setSpeedTier(1);
    setBoostTicks(0);
    setFood(randomFood(start));
    setPhase("running");
    directionRef.current = "right";
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

  function finishRun() {
    setPhase("over");
    updateGameMeta({ gameId: "neo-snake", score, outcome: "loss" });
    setBestScore((current) => {
      const next = Math.max(current, score);
      window.localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
    playFailure();
    if (shouldVibrate()) {
      navigator.vibrate([30, 60, 30]);
    }
    setShake(true);
    window.setTimeout(() => setShake(false), 260);
  }

  function resetRun() {
    setPhase("ready");
    setSnake([]);
    setFood(null);
    setScore(0);
    setSpeedTier(1);
    setBoostTicks(0);
  }

  function queueDirection(next: Direction) {
    if (next === OPPOSITE[directionRef.current]) return;
    setQueuedDirection(next);
  }

  function turnLeft() {
    const order: Direction[] = ["up", "right", "down", "left"];
    const idx = order.indexOf(directionRef.current);
    queueDirection(order[(idx + 3) % order.length]);
  }

  function turnRight() {
    const order: Direction[] = ["up", "right", "down", "left"];
    const idx = order.indexOf(directionRef.current);
    queueDirection(order[(idx + 1) % order.length]);
  }

  function step() {
    if (phase !== "running") return;
    setDirection(queuedDirection);
    setBoostTicks((current) => Math.max(0, current - 1));

    setSnake((current) => {
      const head = current[0];
      const nextHead = nextPosition(head, queuedDirection);

      if (
        nextHead.x < 0 ||
        nextHead.y < 0 ||
        nextHead.x >= GRID_SIZE ||
        nextHead.y >= GRID_SIZE ||
        current.some((segment) => segment.x === nextHead.x && segment.y === nextHead.y)
      ) {
        finishRun();
        return current;
      }

      const nextSnake = [nextHead, ...current];
      const ateFood = food && nextHead.x === food.x && nextHead.y === food.y;
      if (!ateFood) {
        nextSnake.pop();
      } else {
        playSuccess();
        if (shouldVibrate()) {
          navigator.vibrate(12);
        }
        setScore((value) => value + 40 + speedTier * 6);
        setSpeedTier((value) => Math.min(6, value + 0.2));
        setBoostTicks(6);
        setFood(randomFood(nextSnake));
      }

      return nextSnake;
    });
  }

  return (
    <GameShell
      title="Neo Snake"
      subtitle="Grow your trail and avoid collision."
      icon="NS"
      badge={speedLabel}
      aspectRatio="1 / 1"
      stats={
        <>
          <StatDisplay label="Score" value={score} />
          <StatDisplay label="Best" value={bestScore} />
          <StatDisplay label="Length" value={snake.length || 0} />
          <StatDisplay label="Speed" value={speedTier.toFixed(1)} />
        </>
      }
      footer={
        <div className="game-shell__footer-row">
          <ScoreBadge label="Run" value={phase === "running" ? "Gliding" : phase === "over" ? "Crashed" : "Ready"} />
          <div className="game-shell__actions">
            <GameButton onClick={phase === "running" ? () => undefined : startRun}>
              {phase === "over" ? "Try Again" : "Start Snake"}
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
      <div className={`neo-snake ${shake ? "is-shaking" : ""}`}>
        <GameCard className="neo-snake__board" tone="highlight">
          <div className="neo-snake__grid" role="img" aria-label="Snake grid">
            {snake.map((segment, index) => (
              <span
                key={`${segment.x}-${segment.y}-${index}`}
                className={`neo-snake__cell ${index === 0 ? "is-head" : ""}`}
                style={{
                  left: `${(segment.x / GRID_SIZE) * 100}%`,
                  top: `${(segment.y / GRID_SIZE) * 100}%`
                }}
              />
            ))}
            {food ? (
              <span
                className="neo-snake__food"
                style={{ left: `${(food.x / GRID_SIZE) * 100}%`, top: `${(food.y / GRID_SIZE) * 100}%` }}
              />
            ) : null}
          </div>
          {isTouch ? (
            <SwipeControls
              onSwipeLeft={() => queueDirection("left")}
              onSwipeRight={() => queueDirection("right")}
              onSwipeUp={() => queueDirection("up")}
              onSwipeDown={() => queueDirection("down")}
              label="Swipe"
            />
          ) : (
            <>
              <div className="neo-snake__controls">
                <GameButton onClick={() => queueDirection("up")} variant="secondary">
                  Up
                </GameButton>
                <GameButton onClick={() => queueDirection("left")} variant="secondary">
                  Left
                </GameButton>
                <GameButton onClick={() => queueDirection("down")} variant="secondary">
                  Down
                </GameButton>
                <GameButton onClick={() => queueDirection("right")} variant="secondary">
                  Right
                </GameButton>
              </div>
              <TouchControls leftLabel="Turn Left" rightLabel="Turn Right" onLeft={turnLeft} onRight={turnRight} />
            </>
          )}
        </GameCard>

        <GameOverlay
          title={phase === "ready" ? "Neo Snake" : phase === "paused" ? "Paused" : phase === "over" ? "Run Over" : ""}
          description={
            phase === "ready"
              ? "Swipe or tap directions to keep the snake alive."
              : phase === "paused"
                ? "Resume when ready."
                : phase === "over"
                  ? "You hit the wall or yourself. Try again."
                  : undefined
          }
          helper={phase === "over" ? `Score ${score} • Best ${bestScore}` : phase === "ready" ? "Tap start to begin." : undefined}
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
