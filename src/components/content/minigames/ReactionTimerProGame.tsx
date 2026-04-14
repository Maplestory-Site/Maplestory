import { useEffect, useMemo, useRef, useState } from "react";
import { GameButton } from "./shared/GameButton";
import { GameCard } from "./shared/GameCard";
import { GameOverlay } from "./shared/GameOverlay";
import { GameShell } from "./shared/GameShell";
import { useMiniGamesSound } from "./shared/MiniGamesSound";
import { ScoreBadge } from "./shared/ScoreBadge";
import { StatDisplay } from "./shared/StatDisplay";
import { TouchControls } from "./shared/TouchControls";
import { updateGameMeta } from "./shared/gameMeta";
import { shouldVibrate } from "./shared/gameSettings";

type Rating = "Perfect" | "Good" | "Slow" | "Too Early";

const STORAGE_KEY = "snailslayer-reaction-pro-best";
const BEST_SCORE_KEY = "snailslayer-reaction-pro-best-score";
const PERFECT_MS = 180;
const GOOD_MS = 260;
const SLOW_MS = 420;

export function ReactionTimerProGame() {
  const { playFailure, playSuccess } = useMiniGamesSound();
  const [phase, setPhase] = useState<"ready" | "waiting" | "active" | "result" | "paused" | "over">("ready");
  const [reactionMs, setReactionMs] = useState<number | null>(null);
  const [bestReaction, setBestReaction] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [round, setRound] = useState(1);
  const [rating, setRating] = useState<Rating | null>(null);
  const [shake, setShake] = useState(false);

  const startRef = useRef<number | null>(null);
  const delayRef = useRef<number | null>(null);
  const replayRef = useRef<number | null>(null);
  const runningRef = useRef(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = Number(saved);
      if (!Number.isNaN(parsed) && parsed > 0) {
        setBestReaction(parsed);
      }
    }

    const storedScore = window.localStorage.getItem(BEST_SCORE_KEY);
    if (storedScore) {
      const parsedScore = Number(storedScore);
      if (!Number.isNaN(parsedScore)) {
        setBestScore(parsedScore);
      }
    }
  }, []);

  useEffect(() => {
    return () => {
      if (delayRef.current) window.clearTimeout(delayRef.current);
      if (replayRef.current) window.clearTimeout(replayRef.current);
    };
  }, []);

  const paceLabel = useMemo(() => {
    if (round >= 10) return "Elite";
    if (round >= 6) return "Fast";
    return "Warmup";
  }, [round]);

  function startRun() {
    if (delayRef.current) window.clearTimeout(delayRef.current);
    if (replayRef.current) window.clearTimeout(replayRef.current);
    runningRef.current = true;
    setPhase("waiting");
    setRating(null);
    setReactionMs(null);
    startRef.current = null;

    const delay = 800 + Math.random() * 1600;
    delayRef.current = window.setTimeout(() => {
      startRef.current = performance.now();
      setPhase("active");
    }, delay);
  }

  function pauseRun() {
    if (phase !== "active" && phase !== "waiting") return;
    setPhase("paused");
  }

  function resumeRun() {
    if (phase !== "paused") return;
    startRun();
  }

  function finishRun(finalScore: number) {
    runningRef.current = false;
    updateGameMeta({
      gameId: "reaction-timer-pro",
      score: finalScore,
      outcome: "loss"
    });
  }

  function handleTap() {
    if (phase === "waiting") {
      setRating("Too Early");
      setPhase("over");
      setCombo(0);
      setReactionMs(null);
      playFailure();
      if (shouldVibrate()) {
        navigator.vibrate([30, 60, 30]);
      }
      setShake(true);
      window.setTimeout(() => setShake(false), 280);
      finishRun(score);
      return;
    }

    if (phase !== "active") {
      if (phase === "result") {
        startRun();
      }
      return;
    }

    const now = performance.now();
    const reaction = Math.max(0, Math.round(now - (startRef.current ?? now)));
    setReactionMs(reaction);

    const nextRating = getRating(reaction);
    setRating(nextRating);

    const gain = getScoreGain(reaction, combo);
    const nextScore = score + gain;
    const nextCombo = nextRating === "Perfect" ? combo + 1 : nextRating === "Good" ? Math.max(0, combo - 1) : 0;
    const nextRound = round + 1;

    setScore(nextScore);
    setCombo(nextCombo);
    setRound(nextRound);

    if (nextRating === "Slow") {
      setPhase("over");
      playFailure();
      if (shouldVibrate()) {
        navigator.vibrate([24, 40, 24]);
      }
      setShake(true);
      window.setTimeout(() => setShake(false), 280);
      finishRun(nextScore);
    } else {
      setPhase("result");
      playSuccess();
      if (shouldVibrate()) {
        navigator.vibrate(18);
      }
      if (bestReaction == null || reaction < bestReaction) {
        setBestReaction(reaction);
        window.localStorage.setItem(STORAGE_KEY, String(reaction));
      }
      setBestScore((current) => {
        const next = Math.max(current, nextScore);
        window.localStorage.setItem(BEST_SCORE_KEY, String(next));
        return next;
      });
      replayRef.current = window.setTimeout(startRun, 620);
    }
  }

  function resetRun() {
    if (delayRef.current) window.clearTimeout(delayRef.current);
    if (replayRef.current) window.clearTimeout(replayRef.current);
    runningRef.current = false;
    setPhase("ready");
    setReactionMs(null);
    setRating(null);
    setScore(0);
    setCombo(0);
    setRound(1);
    setShake(false);
  }

  const statusText =
    phase === "waiting"
      ? "Wait"
      : phase === "active"
        ? "Tap"
        : phase === "result"
          ? rating ?? "Ready"
          : phase === "over"
            ? rating ?? "Over"
            : "Ready";

  const reactionLabel =
    reactionMs == null ? "--" : `${reactionMs} ms`;

  return (
    <GameShell
      title="Reaction Timer Pro"
      subtitle="Tap instantly when the screen flips. Chase the fastest time."
      icon="RP"
      badge={paceLabel}
      aspectRatio="4 / 3"
      stats={
        <>
          <StatDisplay label="Score" value={score} />
          <StatDisplay label="Combo" value={combo} />
          <StatDisplay label="Best React" value={bestReaction ? `${bestReaction} ms` : "--"} />
          <StatDisplay label="Round" value={round} />
        </>
      }
      footer={
        <div className="game-shell__footer-row">
          <ScoreBadge
            label="Status"
            tone={phase === "over" ? "danger" : phase === "active" ? "success" : "default"}
            value={statusText}
          />
          <div className="game-shell__actions">
            <GameButton onClick={phase === "active" || phase === "waiting" ? handleTap : startRun}>
              {phase === "active" || phase === "waiting" ? "Tap Now" : phase === "over" ? "Try Again" : "Start"}
            </GameButton>
            <GameButton onClick={phase === "active" || phase === "waiting" ? pauseRun : resumeRun} variant="secondary">
              {phase === "paused" ? "Resume" : "Pause"}
            </GameButton>
            <GameButton onClick={resetRun} variant="secondary">
              Reset
            </GameButton>
          </div>
        </div>
      }
    >
      <div className={`reaction-timer-pro ${shake ? "is-shaking" : ""}`}>
        <GameCard className={`reaction-timer-pro__panel is-${phase}`}>
          <button
            className="reaction-timer-pro__tap"
            onClick={handleTap}
            type="button"
            aria-label="Tap to register reaction time"
          >
            <span className="reaction-timer-pro__label">
              {phase === "ready" ? "Tap to start" : phase === "waiting" ? "Wait for green" : phase === "active" ? "Tap!" : "Tap to continue"}
            </span>
            <strong className="reaction-timer-pro__time">{reactionLabel}</strong>
            {rating ? <span className={`reaction-timer-pro__rating is-${rating.toLowerCase().replace(" ", "-")}`}>{rating}</span> : null}
          </button>
        </GameCard>

        <TouchControls
          leftLabel={phase === "active" || phase === "waiting" ? "Tap" : "Start"}
          rightLabel={phase === "active" || phase === "waiting" ? "Tap" : "Start"}
          onLeft={phase === "active" || phase === "waiting" ? handleTap : startRun}
          onRight={phase === "active" || phase === "waiting" ? handleTap : startRun}
          repeatDelay={240}
        />

        <GameOverlay
          title={phase === "ready" ? "Reaction Timer Pro" : phase === "paused" ? "Paused" : phase === "over" ? "Run Over" : ""}
          description={
            phase === "ready"
              ? "Wait for the color flip, then tap instantly. Perfect hits build combo."
              : phase === "paused"
                ? "Resume when you are ready."
                : phase === "over"
                  ? "Too early or too slow. Reset and react faster."
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

function getRating(reactionMs: number): Rating {
  if (reactionMs <= PERFECT_MS) return "Perfect";
  if (reactionMs <= GOOD_MS) return "Good";
  if (reactionMs <= SLOW_MS) return "Slow";
  return "Slow";
}

function getScoreGain(reactionMs: number, combo: number) {
  const base = Math.max(0, 520 - reactionMs);
  return Math.round(base + combo * 22);
}
