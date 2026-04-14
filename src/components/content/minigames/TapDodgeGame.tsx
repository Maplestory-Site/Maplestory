import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { GameButton } from "./shared/GameButton";
import { GameCard } from "./shared/GameCard";
import { GameOverlay } from "./shared/GameOverlay";
import { GameShell } from "./shared/GameShell";
import { useMiniGamesSound } from "./shared/MiniGamesSound";
import { ScoreBadge } from "./shared/ScoreBadge";
import { StatDisplay } from "./shared/StatDisplay";
import { JoystickControl } from "./shared/JoystickControl";
import { TouchControls } from "./shared/TouchControls";
import { gameDebug } from "./shared/gameDebug";
import { updateGameMeta } from "./shared/gameMeta";
import { shouldVibrate } from "./shared/gameSettings";
import { useTouchDevice } from "./shared/useTouchDevice";

type Obstacle = {
  id: number;
  angle: number;
  distance: number;
  speed: number;
  size: number;
};

const STORAGE_KEY = "snailslayer-tap-dodge-best";
const PLAYER_RANGE = 26;
const HIT_RADIUS = 12;

export function TapDodgeGame() {
  const { playFailure, playSuccess } = useMiniGamesSound();
  const [phase, setPhase] = useState<"ready" | "running" | "paused" | "over">("ready");
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [combo, setCombo] = useState(0);
  const [speedTier, setSpeedTier] = useState(1);
  const [shake, setShake] = useState(false);
  const [playerX, setPlayerX] = useState(0);
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const isTouch = useTouchDevice();

  const scoreRef = useRef(0);
  const comboRef = useRef(0);
  const playerRef = useRef(0);
  const runRef = useRef(false);
  const animationRef = useRef<number | null>(null);
  const lastFrameRef = useRef<number | null>(null);
  const spawnTimerRef = useRef(0);
  const nextId = useRef(1);
  const debugTickRef = useRef(0);
  const spawnCountRef = useRef(0);

  useEffect(() => {
    playerRef.current = playerX;
  }, [playerX]);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setBest(Number(stored) || 0);
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
    gameDebug("tap-dodge:start");

    const loop = (timestamp: number) => {
      if (!runRef.current) return;

      if (lastFrameRef.current == null) {
        lastFrameRef.current = timestamp;
      }

      const delta = Math.min((timestamp - lastFrameRef.current) / 1000, 0.045);
      lastFrameRef.current = timestamp;
      spawnTimerRef.current += delta;

      setScore((current) => {
        const next = current + delta * (16 + comboRef.current * 1.6);
        scoreRef.current = next;
        return next;
      });

      setObstacles((current) => {
        const nextScore = scoreRef.current;
        const tier = 1 + Math.min(5, Math.floor(nextScore / 120));
        setSpeedTier(tier);

        const spawnInterval = Math.max(0.32, 0.9 - tier * 0.08);
        const baseSpeed = 38 + tier * 12;

        let nextObstacles = current
          .map((obstacle) => ({
            ...obstacle,
            distance: obstacle.distance - obstacle.speed * delta
          }))
          .filter((obstacle) => obstacle.distance > -18);

        if (spawnTimerRef.current >= spawnInterval) {
          spawnTimerRef.current = 0;
          spawnCountRef.current += 1;
          gameDebug("tap-dodge:spawn", {
            count: spawnCountRef.current,
            speed: Math.round(baseSpeed)
          });
          nextObstacles = nextObstacles.concat({
            id: nextId.current++,
            angle: Math.random() * Math.PI * 2,
            distance: 110,
            speed: baseSpeed + Math.random() * 16,
            size: 10 + Math.random() * 6
          });
        }
        if (nextObstacles.length === 0 && scoreRef.current > 8) {
          spawnCountRef.current += 1;
          gameDebug("tap-dodge:spawn-fallback", { count: spawnCountRef.current });
          nextObstacles = nextObstacles.concat({
            id: nextId.current++,
            angle: Math.random() * Math.PI * 2,
            distance: 80,
            speed: baseSpeed + 6,
            size: 12
          });
        }

        const playerOffset = playerRef.current * PLAYER_RANGE;
        const hit = nextObstacles.some((obstacle) => {
          if (obstacle.distance > 20) return false;
          const dx = Math.cos(obstacle.angle) * obstacle.distance - playerOffset;
          const dy = Math.sin(obstacle.angle) * obstacle.distance;
          const distance = Math.hypot(dx, dy);
          return distance <= HIT_RADIUS + obstacle.size * 0.35;
        });

        if (hit) {
          window.setTimeout(() => finishRun(), 0);
          return nextObstacles;
        }

        const escaped = nextObstacles.filter((obstacle) => obstacle.distance <= -6);
        if (escaped.length) {
          comboRef.current = Math.min(25, comboRef.current + escaped.length);
          setCombo(comboRef.current);
          setScore((currentScore) => {
            const next = currentScore + escaped.length * (12 + comboRef.current * 2);
            scoreRef.current = next;
            return next;
          });
        }

        if (timestamp - debugTickRef.current > 2000) {
          debugTickRef.current = timestamp;
          gameDebug("tap-dodge:tick", {
            score: Math.round(scoreRef.current),
            obstacles: nextObstacles.length,
            player: Number(playerRef.current.toFixed(2))
          });
        }

        return nextObstacles;
      });

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
      gameDebug("tap-dodge:stop");
    };
  }, [phase]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (phase !== "running") return;
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

  const scoreDisplay = Math.round(score);
  const bestDisplay = Math.round(best);

  const speedLabel = useMemo(() => {
    if (speedTier >= 5) return "Chaos";
    if (speedTier >= 4) return "Frenzy";
    if (speedTier >= 3) return "Rush";
    if (speedTier >= 2) return "Pace";
    return "Warmup";
  }, [speedTier]);

  function startRun() {
    nextId.current = 1;
    spawnTimerRef.current = 0;
    spawnCountRef.current = 0;
    scoreRef.current = 0;
    comboRef.current = 0;
    setObstacles([]);
    setScore(0);
    setCombo(0);
    setPlayerX(0);
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
    const finalScore = Math.round(scoreRef.current);
    setPhase("over");
    playFailure();
    updateGameMeta({ gameId: "tap-dodge", score: finalScore, duration: scoreRef.current / 10, outcome: "loss" });
    if (shouldVibrate()) {
      navigator.vibrate([30, 50, 30]);
    }
    setShake(true);
    window.setTimeout(() => setShake(false), 320);
    setBest((currentBest) => {
      const nextBest = Math.max(currentBest, finalScore);
      window.localStorage.setItem(STORAGE_KEY, String(nextBest));
      return nextBest;
    });
  }

  function resetRun() {
    runRef.current = false;
    if (animationRef.current) {
      window.cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    lastFrameRef.current = null;
    spawnTimerRef.current = 0;
    scoreRef.current = 0;
    comboRef.current = 0;
    setObstacles([]);
    setScore(0);
    setCombo(0);
    setPlayerX(0);
    setPhase("ready");
  }

  function moveLeft() {
    if (phase !== "running") {
      startRun();
    }
    setPlayerX((current) => Math.max(current - 0.4, -1));
  }

  function moveRight() {
    if (phase !== "running") {
      startRun();
    }
    setPlayerX((current) => Math.min(current + 0.4, 1));
  }

  return (
    <GameShell
      title="Tap Dodge"
      subtitle="Tap left/right to dodge incoming strikes from every angle."
      icon="TD"
      badge={speedLabel}
      aspectRatio="1 / 1"
      stats={
        <>
          <StatDisplay label="Score" value={scoreDisplay} />
          <StatDisplay label="Best" value={bestDisplay} />
          <StatDisplay label="Combo" value={combo} />
          <StatDisplay label="Speed" value={speedTier} />
        </>
      }
      footer={
        <div className="game-shell__footer-row">
          <ScoreBadge label="Run" value={phase === "running" ? "Active" : phase === "over" ? "Down" : "Ready"} />
          <div className="game-shell__actions">
            <GameButton disabled={phase === "running"} onClick={phase === "running" ? undefined : startRun}>
              {phase === "over" ? "Run Again" : "Start Dodge"}
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
      <div className={`tap-dodge ${shake ? "is-shaking" : ""}`}>
        <GameCard className="tap-dodge__arena" tone="highlight">
          <div className="tap-dodge__field" role="img" aria-label="Tap Dodge arena">
            {obstacles.map((obstacle) => {
              const offsetX = Math.cos(obstacle.angle) * obstacle.distance;
              const offsetY = Math.sin(obstacle.angle) * obstacle.distance;
              return (
              <span
                className="tap-dodge__obstacle"
                key={obstacle.id}
                style={
                  {
                    width: `${obstacle.size}px`,
                    height: `${obstacle.size}px`,
                    left: `calc(50% + ${offsetX}%)`,
                    top: `calc(50% + ${offsetY}%)`
                  } as CSSProperties
                }
              />
            );
            })}
            <span
              className="tap-dodge__player"
              style={{ transform: `translate(calc(${playerX * PLAYER_RANGE}px), 0px)` }}
            />
          </div>
          {isTouch ? (
            <JoystickControl
              label="Move"
              onMove={(x) => {
                if (phase !== "running") return;
                setPlayerX(Math.max(-1, Math.min(1, x)));
              }}
              onRelease={() => setPlayerX(0)}
            />
          ) : (
            <TouchControls leftLabel="Left" rightLabel="Right" onLeft={moveLeft} onRight={moveRight} />
          )}
        </GameCard>

        <GameOverlay
          title={phase === "ready" ? "Tap Dodge" : phase === "paused" ? "Paused" : phase === "over" ? "Game Over" : ""}
          description={
            phase === "ready"
              ? "Tap left/right to slip the incoming strikes."
              : phase === "paused"
                ? "Hold steady and resume when ready."
                : phase === "over"
                  ? "One hit ends it. Tighten your timing."
                  : undefined
          }
          helper={
            phase === "over"
              ? `Score ${scoreDisplay} • Best ${bestDisplay}`
              : phase === "ready"
                ? "Start fast and build combo."
                : undefined
          }
          actions={
            phase === "ready" ? (
              <GameButton onClick={startRun}>Start Dodge</GameButton>
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
