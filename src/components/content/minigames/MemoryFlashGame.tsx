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

const STORAGE_KEY = "snailslayer-memory-flash-best";
const TILES = ["alpha", "beta", "gamma", "delta"] as const;
type TileId = (typeof TILES)[number];

export function MemoryFlashGame() {
  const { playFailure, playSuccess } = useMiniGamesSound();
  const [phase, setPhase] = useState<"ready" | "show" | "input" | "paused" | "over">("ready");
  const [sequence, setSequence] = useState<TileId[]>([]);
  const [inputIndex, setInputIndex] = useState(0);
  const [flashTile, setFlashTile] = useState<TileId | null>(null);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [round, setRound] = useState(1);
  const [shake, setShake] = useState(false);

  const playbackRef = useRef<number | null>(null);
  const sequenceRef = useRef<TileId[]>([]);
  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setBestScore(Number(saved) || 0);
    }
  }, []);

  useEffect(() => {
    sequenceRef.current = sequence;
  }, [sequence]);

  useEffect(() => {
    return () => {
      if (playbackRef.current) {
        window.clearTimeout(playbackRef.current);
      }
    };
  }, []);

  const paceLabel = useMemo(() => {
    if (round >= 8) return "Hyper";
    if (round >= 5) return "Fast";
    return "Warmup";
  }, [round]);

  function buildNextSequence(nextRound: number) {
    const next = sequenceRef.current.concat(randomTile());
    setSequence(next);
    setRound(nextRound);
    setInputIndex(0);
    playSequence(next, nextRound);
  }

  function startRun() {
    setScore(0);
    setCombo(0);
    setRound(1);
    setSequence([]);
    setInputIndex(0);
    setPhase("show");
    const next = [randomTile()];
    setSequence(next);
    playSequence(next, 1);
    playSuccess();
  }

  function pauseRun() {
    if (phase === "show" || phase === "input") {
      setPhase("paused");
      if (playbackRef.current) {
        window.clearTimeout(playbackRef.current);
      }
    }
  }

  function resumeRun() {
    if (phase !== "paused") return;
    playSequence(sequenceRef.current, round);
  }

  function playSequence(next: TileId[], currentRound: number) {
    if (playbackRef.current) {
      window.clearTimeout(playbackRef.current);
    }
    setPhase("show");
    let step = 0;
    const pace = Math.max(180, 520 - currentRound * 40);

    const flashStep = () => {
      if (step >= next.length) {
        setFlashTile(null);
        setPhase("input");
        return;
      }
      const tile = next[step];
      setFlashTile(tile);
      playSuccess();
      if (shouldVibrate()) {
        navigator.vibrate(12);
      }
      playbackRef.current = window.setTimeout(() => {
        setFlashTile(null);
        step += 1;
        playbackRef.current = window.setTimeout(flashStep, pace * 0.45);
      }, pace);
    };

    playbackRef.current = window.setTimeout(flashStep, 360);
  }

  function handleInput(tile: TileId) {
    if (phase !== "input") return;
    if (sequenceRef.current[inputIndex] !== tile) {
      setPhase("over");
      playFailure();
      updateGameMeta({ gameId: "memory-flash", score, outcome: "loss" });
      if (shouldVibrate()) {
        navigator.vibrate([30, 60, 30]);
      }
      setShake(true);
      window.setTimeout(() => setShake(false), 280);
      setBestScore((current) => {
        const next = Math.max(current, score);
        window.localStorage.setItem(STORAGE_KEY, String(next));
        return next;
      });
      return;
    }

    playSuccess();
    const nextIndex = inputIndex + 1;
    setInputIndex(nextIndex);
    if (nextIndex >= sequenceRef.current.length) {
      const bonus = Math.round(70 + combo * 18 + round * 10);
      setScore((current) => current + bonus);
      setCombo((current) => current + 1);
      buildNextSequence(round + 1);
    }
  }

  function resetRun() {
    setPhase("ready");
    setSequence([]);
    setInputIndex(0);
    setCombo(0);
    setRound(1);
    setScore(0);
    setShake(false);
  }

  return (
    <GameShell
      title="Memory Flash"
      subtitle="Repeat the flash pattern and build the streak."
      icon="MF"
      badge={paceLabel}
      aspectRatio="4 / 3"
      stats={
        <>
          <StatDisplay label="Score" value={score} />
          <StatDisplay label="Round" value={round} />
          <StatDisplay label="Combo" value={combo} />
          <StatDisplay label="Best" value={bestScore} />
        </>
      }
      footer={
        <div className="game-shell__footer-row">
          <ScoreBadge label="Mode" value={phase === "input" ? "Repeat" : phase === "show" ? "Watch" : "Ready"} />
          <div className="game-shell__actions">
            <GameButton onClick={startRun}>
              {phase === "over" ? "Try Again" : "Start Memory"}
            </GameButton>
            <GameButton onClick={phase === "paused" ? resumeRun : pauseRun} variant="secondary">
              {phase === "paused" ? "Resume" : "Pause"}
            </GameButton>
            <GameButton onClick={resetRun} variant="secondary">
              Reset
            </GameButton>
          </div>
        </div>
      }
    >
      <div className={`memory-flash ${shake ? "is-shaking" : ""}`}>
        <GameCard className="memory-flash__board" tone="highlight">
          <div className="memory-flash__grid" role="img" aria-label="Memory flash grid">
            {TILES.map((tile) => (
              <button
                key={tile}
                className={`memory-flash__tile memory-flash__tile--${tile} ${flashTile === tile ? "is-flash" : ""}`}
                onClick={() => handleInput(tile)}
                type="button"
              >
                <span>{tile.toUpperCase()}</span>
              </button>
            ))}
          </div>
          <div className="memory-flash__hint">
            {phase === "show"
              ? "Watch the sequence"
              : phase === "input"
                ? `Repeat ${sequence.length} steps`
                : "Tap start to begin"}
          </div>
        </GameCard>

        <GameOverlay
          title={phase === "ready" ? "Memory Flash" : phase === "paused" ? "Paused" : phase === "over" ? "Run Over" : ""}
          description={
            phase === "ready"
              ? "Memorize the pattern and repeat it clean."
              : phase === "paused"
                ? "Resume when ready."
                : phase === "over"
                  ? "Wrong tile. Try again."
                  : undefined
          }
          helper={phase === "over" ? `Score ${score} • Best ${bestScore}` : phase === "ready" ? "Start to play." : undefined}
          actions={
            phase === "ready" ? (
              <GameButton onClick={startRun}>Start Memory</GameButton>
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

function randomTile(): TileId {
  return TILES[Math.floor(Math.random() * TILES.length)];
}
