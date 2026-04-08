import { useEffect, useRef, useState } from "react";
import { GameButton } from "./shared/GameButton";
import { GameCard } from "./shared/GameCard";
import { GameShell } from "./shared/GameShell";
import { useMiniGamesSound } from "./shared/MiniGamesSound";
import { ScoreBadge } from "./shared/ScoreBadge";
import { StatDisplay } from "./shared/StatDisplay";

type ReactionResult = {
  label: "Perfect" | "Good" | "Miss";
  gain: number;
  tone: "perfect" | "good" | "miss";
  accuracy: number;
};

const BASE_PERFECT_HALF = 0.055;
const BASE_GOOD_HALF = 0.115;
const STORAGE_KEY = "snailslayer-reaction-best";

export function ReactionTestGame() {
  const { playFailure, playSuccess } = useMiniGamesSound();
  const [phase, setPhase] = useState<"ready" | "running" | "result">("ready");
  const [position, setPosition] = useState(0.14);
  const [direction, setDirection] = useState(1);
  const [zoneCenter, setZoneCenter] = useState(() => randomZoneCenter());
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [round, setRound] = useState(1);
  const [result, setResult] = useState<ReactionResult | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastFrameRef = useRef<number | null>(null);
  const positionRef = useRef(position);
  const directionRef = useRef(direction);
  const zoneRef = useRef(zoneCenter);
  const roundRef = useRef(round);

  const speed = getReactionSpeed(round);
  const perfectHalf = getPerfectHalf(round);
  const goodHalf = getGoodHalf(round);
  const pressureLabel = getPressureLabel(round);

  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  useEffect(() => {
    directionRef.current = direction;
  }, [direction]);

  useEffect(() => {
    zoneRef.current = zoneCenter;
  }, [zoneCenter]);

  useEffect(() => {
    roundRef.current = round;
  }, [round]);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setBestScore(Number(saved) || 0);
    }
  }, []);

  useEffect(() => {
    if (phase !== "running") {
      if (rafRef.current) {
        window.cancelAnimationFrame(rafRef.current);
      }
      rafRef.current = null;
      lastFrameRef.current = null;
      return;
    }

    const tick = (timestamp: number) => {
      if (lastFrameRef.current == null) {
        lastFrameRef.current = timestamp;
      }

      const delta = (timestamp - lastFrameRef.current) / 1000;
      lastFrameRef.current = timestamp;

      let next = positionRef.current + directionRef.current * delta * speed;
      let nextDirection = directionRef.current;

      if (next >= 1) {
        next = 1 - (next - 1);
        nextDirection = -1;
      } else if (next <= 0) {
        next = Math.abs(next);
        nextDirection = 1;
      }

      directionRef.current = nextDirection;
      positionRef.current = next;
      setDirection(nextDirection);
      setPosition(next);
      rafRef.current = window.requestAnimationFrame(tick);
    };

    rafRef.current = window.requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) {
        window.cancelAnimationFrame(rafRef.current);
      }
    };
  }, [phase, speed]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code !== "Space" && event.code !== "Enter") {
        return;
      }

      event.preventDefault();

      if (phase === "running") {
        stopRun();
        return;
      }

      startRound();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [phase, combo, score, perfectHalf, goodHalf]);

  function startRound() {
    setZoneCenter(randomZoneCenter());
    setResult(null);
    setPosition(0.12);
    setDirection(1);
    positionRef.current = 0.12;
    directionRef.current = 1;
    setPhase("running");
  }

  function stopRun() {
    if (phase !== "running") {
      return;
    }

    const distance = Math.abs(positionRef.current - zoneRef.current);
    const nextResult = getReactionResult(distance, combo, perfectHalf, goodHalf);
    const nextCombo = nextResult.label === "Perfect" ? combo + 1 : 0;
    const nextScore = score + nextResult.gain;
    const nextRound = roundRef.current + 1;

    setResult(nextResult);
    setCombo(nextCombo);
    setScore(nextScore);
    setRound(nextRound);
    setPhase("result");

    if (nextResult.label === "Miss") {
      playFailure();
    } else {
      playSuccess();
    }

    if (nextScore > bestScore) {
      setBestScore(nextScore);
      window.localStorage.setItem(STORAGE_KEY, String(nextScore));
    }
  }

  function resetSession() {
    setPhase("ready");
    setPosition(0.14);
    setDirection(1);
    setZoneCenter(randomZoneCenter());
    setScore(0);
    setCombo(0);
    setRound(1);
    setResult(null);
  }

  return (
    <GameShell
      badge={phase === "running" ? `Pressure ${pressureLabel}` : `Tier ${pressureLabel}`}
      icon="RT"
      subtitle="Stop the moving mark inside the cleanest zone."
      stats={
        <>
          <StatDisplay label="Score" value={score} />
          <StatDisplay label="Best" value={bestScore} />
          <StatDisplay label="Perfect Streak" value={combo} />
          <StatDisplay label="Round" value={round} />
        </>
      }
      title="Reaction Test"
      footer={
        <div className="game-shell__footer-row">
          <ScoreBadge
            label="Round"
            tone={result?.tone === "perfect" ? "success" : result?.tone === "miss" ? "danger" : "default"}
            value={result ? result.label : phase === "running" ? "Focus" : "Ready"}
          />
          <div className="game-shell__actions">
            <GameButton onClick={phase === "running" ? stopRun : startRound}>
              {phase === "running" ? "Stop" : phase === "result" ? "Next Round" : "Start Round"}
            </GameButton>
            <GameButton onClick={resetSession} variant="secondary">
              Reset
            </GameButton>
          </div>
        </div>
      }
    >
      <div className="reaction-test">
        <GameCard className="reaction-test__board" tone="highlight">
          <div className="reaction-test__labels">
            <span>Miss</span>
            <span>Good</span>
            <span>Perfect</span>
            <span>Good</span>
            <span>Miss</span>
          </div>
          <div className="reaction-test__track" role="img" aria-label="Reaction timing bar with perfect zone">
            <div
              aria-hidden="true"
              className="reaction-test__zone reaction-test__zone--good"
              style={{
                left: `${(zoneCenter - goodHalf) * 100}%`,
                width: `${goodHalf * 200}%`
              }}
            />
            <div
              aria-hidden="true"
              className="reaction-test__zone reaction-test__zone--perfect"
              style={{
                left: `${(zoneCenter - perfectHalf) * 100}%`,
                width: `${perfectHalf * 200}%`
              }}
            />
            <div
              aria-hidden="true"
              className={`reaction-test__indicator ${phase === "running" ? "is-running" : ""}`}
              style={{ left: `${position * 100}%` }}
            />
          </div>
        </GameCard>

        <div className="reaction-test__hud-grid">
          <GameCard className={`game-feedback ${result ? `is-${result.tone}` : ""}`}>
            <strong>{result ? result.label : phase === "running" ? "Lock it in" : "Ready?"}</strong>
            <span>
              {result
                ? `+${result.gain} score • ${result.accuracy}% accuracy`
                : phase === "running"
                  ? "Stop inside the bright zone."
                  : "Start the bar and hit the cleanest timing."}
            </span>
          </GameCard>

          <GameCard className="reaction-test__intel-card" tone="muted">
            <div className="reaction-test__intel-row">
              <span>Speed</span>
              <strong>{speed.toFixed(2)}x</strong>
            </div>
            <div className="reaction-test__intel-row">
              <span>Perfect Window</span>
              <strong>{(perfectHalf * 200).toFixed(1)}%</strong>
            </div>
            <div className="reaction-test__intel-row">
              <span>Pressure</span>
              <strong>{pressureLabel}</strong>
            </div>
          </GameCard>
        </div>
      </div>
    </GameShell>
  );
}

function randomZoneCenter() {
  return 0.24 + Math.random() * 0.52;
}

function getReactionSpeed(round: number) {
  return Math.min(0.86 + (round - 1) * 0.06, 1.52);
}

function getPerfectHalf(round: number) {
  return Math.max(BASE_PERFECT_HALF - (round - 1) * 0.0035, 0.024);
}

function getGoodHalf(round: number) {
  return Math.max(BASE_GOOD_HALF - (round - 1) * 0.005, 0.066);
}

function getPressureLabel(round: number) {
  if (round >= 10) {
    return "III";
  }
  if (round >= 6) {
    return "II";
  }
  return "I";
}

function getReactionResult(distance: number, combo: number, perfectHalf: number, goodHalf: number): ReactionResult {
  if (distance <= perfectHalf) {
    return {
      label: "Perfect",
      gain: 120 + combo * 30,
      tone: "perfect",
      accuracy: 100
    };
  }

  if (distance <= goodHalf) {
    const accuracy = Math.max(72, Math.round(100 - ((distance - perfectHalf) / Math.max(goodHalf - perfectHalf, 0.001)) * 25));
    return {
      label: "Good",
      gain: 70,
      tone: "good",
      accuracy
    };
  }

  return {
    label: "Miss",
    gain: 0,
    tone: "miss",
    accuracy: Math.max(0, Math.round(100 - distance * 100))
  };
}
