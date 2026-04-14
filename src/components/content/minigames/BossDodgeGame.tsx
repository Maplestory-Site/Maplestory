import { useEffect, useMemo, useRef, useState } from "react";
import { GameButton } from "./shared/GameButton";
import { GameCard } from "./shared/GameCard";
import { GameOverlay } from "./shared/GameOverlay";
import { GameShell } from "./shared/GameShell";
import { useMiniGamesSound } from "./shared/MiniGamesSound";
import { ScoreBadge } from "./shared/ScoreBadge";
import { StatDisplay } from "./shared/StatDisplay";
import { TapZoneControls } from "./shared/TapZoneControls";
import { TouchControls } from "./shared/TouchControls";
import { gameDebug } from "./shared/gameDebug";
import { updateGameMeta } from "./shared/gameMeta";
import { shouldVibrate } from "./shared/gameSettings";
import { useTouchDevice } from "./shared/useTouchDevice";

type Attack = {
  id: number;
  lane: number;
  y: number;
  speed: number;
  state: "warning" | "falling";
  warningElapsed: number;
  isClutch?: boolean;
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
  const [phase, setPhase] = useState<"ready" | "running" | "paused" | "over">("ready");
  const [playerLane, setPlayerLane] = useState(1);
  const [attacks, setAttacks] = useState<Attack[]>([]);
  const [survivalTime, setSurvivalTime] = useState(0);
  const [bestTime, setBestTime] = useState(0);
  const [lastTime, setLastTime] = useState(0);
  const [clutches, setClutches] = useState(0);
  const [streak, setStreak] = useState(0);
  const [shake, setShake] = useState(false);
  const [dodgeFlash, setDodgeFlash] = useState(false);
  const [nearMissFlash, setNearMissFlash] = useState(false);
  const [movePulse, setMovePulse] = useState(false);
  const [scorePulse, setScorePulse] = useState(false);
  const survivalRef = useRef(0);
  const comboRef = useRef(0);
  const lastLaneRef = useRef(1);
  const nextId = useRef(1);
  const laneRef = useRef(1);
  const runningRef = useRef(false);
  const animationRef = useRef<number | null>(null);
  const lastFrameRef = useRef<number | null>(null);
  const spawnTimerRef = useRef(0);
  const debugTickRef = useRef(0);
  const spawnCountRef = useRef(0);
  const isTouch = useTouchDevice();

  useEffect(() => {
    laneRef.current = playerLane;
    lastLaneRef.current = playerLane;
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
    gameDebug("boss-dodge:start");

    const loop = (timestamp: number) => {
      if (!runningRef.current) {
        return;
      }

      if (lastFrameRef.current == null) {
        lastFrameRef.current = timestamp;
      }

      const delta = Math.min((timestamp - lastFrameRef.current) / 1000, 0.045);
      lastFrameRef.current = timestamp;

      const nextTime = survivalRef.current + delta;
      survivalRef.current = nextTime;
      setSurvivalTime(nextTime);
      spawnTimerRef.current += delta;

      setAttacks((current) => {
        const dangerSpeed = 28 + Math.min(nextTime * 1.2, 36);
        const warningDuration = Math.max(0.22, 0.65 - nextTime * 0.012);
        const spawnInterval = Math.max(0.32, 1.15 - nextTime * 0.022);
        const burstChance = Math.min(0.32, 0.08 + nextTime * 0.01);

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

            const nextY = attack.y + attack.speed * delta;
            return {
              ...attack,
              y: nextY,
              isClutch: attack.state === "falling" && Math.abs(nextY - 84) < 5
            };
          })
          .filter((attack) => attack.y <= 112);

        if (spawnTimerRef.current >= spawnInterval) {
          spawnTimerRef.current = 0;
          spawnCountRef.current += 1;
          gameDebug("boss-dodge:spawn", {
            count: spawnCountRef.current,
            speed: Math.round(dangerSpeed)
          });
          const lane = Math.floor(Math.random() * LANE_COUNT);
          nextAttacks = nextAttacks.concat({
            id: nextId.current++,
            lane,
            y: -10,
            speed: dangerSpeed + Math.random() * 6,
            state: "warning",
            warningElapsed: 0
          });

          if (Math.random() < burstChance) {
            const secondLane = (lane + 1 + Math.floor(Math.random() * 2)) % LANE_COUNT;
            nextAttacks = nextAttacks.concat({
              id: nextId.current++,
              lane: secondLane,
              y: -18,
              speed: dangerSpeed + 6 + Math.random() * 8,
              state: "warning",
              warningElapsed: 0
            });
          }
        }
        if (nextAttacks.length === 0 && nextTime > 1.6) {
          spawnCountRef.current += 1;
          gameDebug("boss-dodge:spawn-fallback", { count: spawnCountRef.current });
          nextAttacks = nextAttacks.concat({
            id: nextId.current++,
            lane: Math.floor(Math.random() * LANE_COUNT),
            y: -6,
            speed: dangerSpeed + 4,
            state: "warning",
            warningElapsed: 0
          });
        }

        const hit = nextAttacks.some(
          (attack) => attack.state === "falling" && attack.lane === laneRef.current && attack.y >= 75 && attack.y <= 92
        );

        if (hit) {
          comboRef.current = 0;
          window.setTimeout(() => finishRun(nextTime), 0);
        }

        const nearMisses = nextAttacks.filter(
          (attack) =>
            attack.state === "falling" &&
            attack.lane === laneRef.current &&
            !hit &&
            attack.y > 68 &&
            attack.y < 76
        );
        const exitedClutches = nextAttacks.filter(
          (attack) => attack.state === "falling" && attack.y > 92 && attack.y <= 112 && attack.lane === laneRef.current
        );

        if (exitedClutches.length > 0) {
          setClutches((currentValue) => currentValue + exitedClutches.length);
          const comboNext = comboRef.current + exitedClutches.length;
          comboRef.current = comboNext;
          setStreak(comboNext);
          setDodgeFlash(true);
          window.setTimeout(() => setDodgeFlash(false), 160);
          setScorePulse(true);
          window.setTimeout(() => setScorePulse(false), 180);
        }

        if (nearMisses.length > 0) {
          setNearMissFlash(true);
          window.setTimeout(() => setNearMissFlash(false), 140);
        }

        if (timestamp - debugTickRef.current > 2000) {
          debugTickRef.current = timestamp;
          gameDebug("boss-dodge:tick", {
            time: Number(nextTime.toFixed(2)),
            attacks: nextAttacks.length,
            lane: laneRef.current
          });
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
      gameDebug("boss-dodge:stop");
    };
  }, [phase]);

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
      Array.from(new Set(attacks.filter((attack) => attack.state === "warning").map((attack) => attack.lane))),
    [attacks]
  );

  const survivalSeconds = survivalTime.toFixed(1);
  const bestSeconds = bestTime.toFixed(1);
  const lastSeconds = lastTime.toFixed(1);

  function startRun() {
    nextId.current = 1;
    spawnTimerRef.current = 0;
    spawnCountRef.current = 0;
    setAttacks([]);
    survivalRef.current = 0;
    setSurvivalTime(0);
    setPlayerLane(1);
    laneRef.current = 1;
    setLastTime(0);
    setClutches(0);
    setStreak(0);
    comboRef.current = 0;
    setDodgeFlash(false);
    setNearMissFlash(false);
    setScorePulse(false);
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

  function finishRun(time: number) {
    if (!runningRef.current) {
      return;
    }

    runningRef.current = false;
    setLastTime(time);
    setPhase("over");
    setStreak(0);
    playFailure();
    updateGameMeta({
      gameId: "boss-dodge",
      score: Number(time.toFixed(1)),
      duration: time,
      outcome: "loss"
    });
    if (shouldVibrate()) {
      navigator.vibrate([40, 60, 40]);
    }
    setShake(true);
    window.setTimeout(() => setShake(false), 320);
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
    survivalRef.current = 0;
    setPhase("ready");
    setAttacks([]);
    setSurvivalTime(0);
    setPlayerLane(1);
    laneRef.current = 1;
    setLastTime(0);
    setClutches(0);
    setStreak(0);
    setDodgeFlash(false);
    setNearMissFlash(false);
    setScorePulse(false);
  }

  function moveLeft() {
    if (phase !== "running") {
      startRun();
    }
    setPlayerLane((current) => Math.max(current - 1, 0));
    if (lastLaneRef.current !== playerLane) {
      setMovePulse(true);
      window.setTimeout(() => setMovePulse(false), 120);
    }
  }

  function moveRight() {
    if (phase !== "running") {
      startRun();
    }
    setPlayerLane((current) => Math.min(current + 1, LANE_COUNT - 1));
    if (lastLaneRef.current !== playerLane) {
      setMovePulse(true);
      window.setTimeout(() => setMovePulse(false), 120);
    }
  }

  function handleLaneSelect(lane: number) {
    if (phase !== "running") {
      startRun();
    }
    setPlayerLane(lane);
    setMovePulse(true);
    window.setTimeout(() => setMovePulse(false), 120);
  }

  return (
      <GameShell
        badge={getBossPressureLabel(survivalTime)}
        icon="BD"
        subtitle="Read the warning flash, shift lanes, and survive the pattern."
        stats={
          <>
            <StatDisplay label="Survival" value={`${survivalSeconds}s`} />
            <StatDisplay label="Best" value={`${bestSeconds}s`} />
            <StatDisplay label="Lane" value={playerLane + 1} />
            <StatDisplay label="Streak" value={streak} />
        </>
      }
      aspectRatio="3 / 4"
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
      <div
        className={`boss-dodge ${shake ? "is-shaking" : ""} ${dodgeFlash ? "is-dodging" : ""} ${
          nearMissFlash ? "is-near-miss" : ""
        }`}
      >
        <GameCard
          className={`boss-dodge__board ${dodgeFlash ? "is-dodging" : ""} ${nearMissFlash ? "is-near-miss" : ""}`}
          tone="highlight"
        >
          <div className="boss-dodge__arena" role="img" aria-label="Three lane dodge arena">
            {Array.from({ length: LANE_COUNT }).map((_, lane) => (
              <button
                aria-label={`Move to lane ${lane + 1}`}
                className={`boss-dodge__lane ${playerLane === lane ? "is-active" : ""} ${
                  warningLanes.includes(lane) ? "is-warning" : ""
                } ${playerLane === lane && movePulse ? "is-pulse" : ""}`}
                key={lane}
                onClick={() => handleLaneSelect(lane)}
                type="button"
              >
                {attacks
                  .filter((attack) => attack.lane === lane)
                  .map((attack) => (
                    <span
                      className={`boss-dodge__attack ${attack.state === "warning" ? "is-warning" : ""} ${
                        attack.isClutch ? "is-clutch" : ""
                      }`}
                      key={attack.id}
                      style={{ top: `${attack.y}%` }}
                    />
                  ))}
                {playerLane === lane ? <span className="boss-dodge__player" /> : null}
              </button>
            ))}
          </div>
          {isTouch ? (
            <TapZoneControls leftLabel="Left" rightLabel="Right" onLeft={moveLeft} onRight={moveRight} />
          ) : (
            <TouchControls leftLabel="Left" rightLabel="Right" onLeft={moveLeft} onRight={moveRight} />
          )}
        </GameCard>

        <GameOverlay
          title={phase === "ready" ? "Boss Dodge" : phase === "paused" ? "Paused" : phase === "over" ? "Game Over" : ""}
          description={
            phase === "ready"
              ? "Survive as long as possible. Move only after the warning flash."
              : phase === "paused"
                ? "Hold your lane. Resume when ready."
                : phase === "over"
                  ? "One hit ends it. Read the warning earlier."
                  : undefined
          }
          helper={
            phase === "over"
              ? `Last run ${lastSeconds}s - Best ${bestSeconds}s`
              : phase === "ready"
                ? "Tap any lane to start instantly."
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

        <GameCard className="game-feedback" tone="muted">
          <strong>
            {phase === "running"
              ? "Read the warning first, then move clean."
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
      </div>
    </GameShell>
  );
}
