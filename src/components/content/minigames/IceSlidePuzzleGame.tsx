import { useEffect, useMemo, useState } from "react";
import { GameButton } from "./shared/GameButton";
import { GameCard } from "./shared/GameCard";
import { GameOverlay } from "./shared/GameOverlay";
import { GameShell } from "./shared/GameShell";
import { useMiniGamesSound } from "./shared/MiniGamesSound";
import { ScoreBadge } from "./shared/ScoreBadge";
import { StatDisplay } from "./shared/StatDisplay";
import { updateGameMeta } from "./shared/gameMeta";
import { shouldVibrate } from "./shared/gameSettings";
import { SwipeControls } from "./shared/SwipeControls";
import { useTouchDevice } from "./shared/useTouchDevice";

type Point = { x: number; y: number };
type Level = {
  size: number;
  walls: Point[];
  start: Point;
  goal: Point;
};

const STORAGE_KEY = "snailslayer-ice-slide-best";

const LEVELS: Level[] = [
  {
    size: 6,
    walls: [
      { x: 2, y: 1 },
      { x: 2, y: 2 },
      { x: 4, y: 3 }
    ],
    start: { x: 0, y: 0 },
    goal: { x: 5, y: 5 }
  },
  {
    size: 7,
    walls: [
      { x: 1, y: 2 },
      { x: 2, y: 2 },
      { x: 3, y: 2 },
      { x: 5, y: 4 },
      { x: 5, y: 5 }
    ],
    start: { x: 0, y: 6 },
    goal: { x: 6, y: 0 }
  },
  {
    size: 7,
    walls: [
      { x: 3, y: 1 },
      { x: 3, y: 2 },
      { x: 3, y: 3 },
      { x: 1, y: 4 },
      { x: 2, y: 4 },
      { x: 5, y: 5 }
    ],
    start: { x: 6, y: 6 },
    goal: { x: 0, y: 3 }
  },
  {
    size: 8,
    walls: [
      { x: 2, y: 1 },
      { x: 2, y: 2 },
      { x: 2, y: 3 },
      { x: 4, y: 4 },
      { x: 4, y: 5 },
      { x: 6, y: 2 },
      { x: 6, y: 3 }
    ],
    start: { x: 1, y: 6 },
    goal: { x: 7, y: 1 }
  }
];

type Direction = "up" | "down" | "left" | "right";

export function IceSlidePuzzleGame() {
  const { playFailure, playSuccess } = useMiniGamesSound();
  const [phase, setPhase] = useState<"ready" | "running" | "paused" | "over">("ready");
  const [levelIndex, setLevelIndex] = useState(0);
  const [player, setPlayer] = useState<Point>(LEVELS[0].start);
  const [moves, setMoves] = useState(0);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [solved, setSolved] = useState(false);
  const [sliding, setSliding] = useState(false);
  const [levelTransition, setLevelTransition] = useState(false);
  const isTouch = useTouchDevice();

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setBestScore(Number(saved) || 0);
    }
  }, []);

  const level = LEVELS[levelIndex];
  const wallSet = useMemo(
    () => new Set(level.walls.map((wall) => `${wall.x}:${wall.y}`)),
    [levelIndex]
  );

  useEffect(() => {
    setPlayer(level.start);
    setMoves(0);
    setSolved(false);
  }, [levelIndex, level.start]);

  function startRun() {
    setPhase("running");
    setLevelIndex(0);
    setScore(0);
    setCombo(0);
    setMoves(0);
    setSolved(false);
    setPlayer(LEVELS[0].start);
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

  function finishRun(finalScore: number) {
    setPhase("over");
    updateGameMeta({ gameId: "ice-slide-puzzle", score: finalScore, outcome: "loss" });
    playFailure();
    if (shouldVibrate()) {
      navigator.vibrate([30, 60, 30]);
    }
    setBestScore((current) => {
      const next = Math.max(current, finalScore);
      window.localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  }

  function resetRun() {
    setPhase("ready");
    setLevelIndex(0);
    setScore(0);
    setCombo(0);
    setMoves(0);
    setSolved(false);
    setPlayer(LEVELS[0].start);
  }

  function slide(dir: Direction) {
    if (phase !== "running" || solved) return;
    const next = slidePosition(player, dir, level.size, wallSet);
    if (next.x === player.x && next.y === player.y) return;

    setPlayer(next);
    setMoves((current) => current + 1);
    setSliding(true);
    window.setTimeout(() => setSliding(false), 220);

    if (next.x === level.goal.x && next.y === level.goal.y) {
      const roundScore = Math.max(40, 140 - moves * 6) + combo * 20;
      const nextScore = score + roundScore;
      setScore(nextScore);
      setCombo((current) => current + 1);
      setSolved(true);
      playSuccess();
      if (shouldVibrate()) {
        navigator.vibrate(18);
      }

      setLevelTransition(true);
      window.setTimeout(() => {
        if (levelIndex < LEVELS.length - 1) {
          setLevelIndex((current) => current + 1);
          setSolved(false);
          setLevelTransition(false);
        } else {
          setLevelTransition(false);
          finishRun(nextScore);
        }
      }, 700);
    }
  }

  return (
    <GameShell
      title="Ice Slide Puzzle"
      subtitle="Slide until you hit a wall. Reach the goal."
      icon="IP"
      badge={`Level ${levelIndex + 1}`}
      aspectRatio="1 / 1"
      stats={
        <>
          <StatDisplay label="Score" value={score} />
          <StatDisplay label="Moves" value={moves} />
          <StatDisplay label="Combo" value={combo} />
          <StatDisplay label="Best" value={bestScore} />
        </>
      }
      footer={
        <div className="game-shell__footer-row">
          <ScoreBadge label="Mode" value={phase === "running" ? "Solve" : phase === "over" ? "Complete" : "Ready"} />
          <div className="game-shell__actions">
            <GameButton onClick={phase === "running" ? () => undefined : startRun}>
              {phase === "over" ? "Run Again" : "Start Puzzle"}
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
      <div className="ice-slide">
        <GameCard className="ice-slide__board" tone="highlight">
          <div className="ice-slide__grid" style={{ gridTemplateColumns: `repeat(${level.size}, 1fr)` }}>
            {Array.from({ length: level.size * level.size }).map((_, index) => {
              const x = index % level.size;
              const y = Math.floor(index / level.size);
              const key = `${x}:${y}`;
              const isWall = wallSet.has(key);
              const isGoal = level.goal.x === x && level.goal.y === y;
              return (
                <div key={key} className={`ice-slide__cell ${isWall ? "is-wall" : ""} ${isGoal ? "is-goal" : ""}`} />
              );
            })}
            <span
              className={`ice-slide__player ${solved ? "is-solved" : ""} ${sliding ? "is-sliding" : ""}`}
              style={{
                left: `${(player.x / level.size) * 100}%`,
                top: `${(player.y / level.size) * 100}%`,
                width: `${100 / level.size}%`,
                height: `${100 / level.size}%`
              }}
            />
          </div>
          {levelTransition && <div className="ice-slide__transition">Level {levelIndex + 2}</div>}
          {isTouch ? (
            <SwipeControls
              onSwipeLeft={() => slide("left")}
              onSwipeRight={() => slide("right")}
              onSwipeUp={() => slide("up")}
              onSwipeDown={() => slide("down")}
              label="Swipe"
            />
          ) : (
            <div className="ice-slide__controls">
              <GameButton onClick={() => slide("up")} variant="secondary">
                Up
              </GameButton>
              <div className="ice-slide__controls-row">
                <GameButton onClick={() => slide("left")} variant="secondary">
                  Left
                </GameButton>
                <GameButton onClick={() => slide("down")} variant="secondary">
                  Down
                </GameButton>
                <GameButton onClick={() => slide("right")} variant="secondary">
                  Right
                </GameButton>
              </div>
            </div>
          )}
        </GameCard>

        <GameOverlay
          title={phase === "ready" ? "Ice Slide Puzzle" : phase === "paused" ? "Paused" : phase === "over" ? "Puzzle Run Complete" : ""}
          description={
            phase === "ready"
              ? "Slide to the goal. You cannot stop mid-path."
              : phase === "paused"
                ? "Resume when ready."
                : phase === "over"
                  ? "All levels cleared."
                  : undefined
          }
          helper={phase === "over" ? `Score ${score} • Best ${bestScore}` : phase === "ready" ? "Start to begin." : undefined}
          actions={
            phase === "ready" ? (
              <GameButton onClick={startRun}>Start Puzzle</GameButton>
            ) : phase === "paused" ? (
              <GameButton onClick={resumeRun}>Resume</GameButton>
            ) : phase === "over" ? (
              <GameButton onClick={startRun}>Run Again</GameButton>
            ) : null
          }
          tone={phase === "over" ? "success" : "default"}
          visible={phase === "ready" || phase === "paused" || phase === "over"}
        />
      </div>
    </GameShell>
  );
}

function slidePosition(player: Point, dir: Direction, size: number, walls: Set<string>) {
  let { x, y } = player;
  while (true) {
    const next = nextStep({ x, y }, dir);
    if (next.x < 0 || next.y < 0 || next.x >= size || next.y >= size) return { x, y };
    if (walls.has(`${next.x}:${next.y}`)) return { x, y };
    x = next.x;
    y = next.y;
  }
}

function nextStep(point: Point, dir: Direction): Point {
  if (dir === "up") return { x: point.x, y: point.y - 1 };
  if (dir === "down") return { x: point.x, y: point.y + 1 };
  if (dir === "left") return { x: point.x - 1, y: point.y };
  return { x: point.x + 1, y: point.y };
}
