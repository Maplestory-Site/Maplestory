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

const STORAGE_KEY = "snailslayer-boss-clicker-best";
const BASE_BOSS_HP = 180;
const BASE_PLAYER_HP = 5;

export function BossClickerGame() {
  const { playFailure, playSuccess } = useMiniGamesSound();
  const [phase, setPhase] = useState<"ready" | "running" | "paused" | "over">("ready");
  const [bossHp, setBossHp] = useState(BASE_BOSS_HP);
  const [playerHp, setPlayerHp] = useState(BASE_PLAYER_HP);
  const [round, setRound] = useState(1);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [warning, setWarning] = useState(false);
  const [shake, setShake] = useState(false);
  const [pattern, setPattern] = useState<"strike" | "double" | "slam">("strike");
  const [attackNote, setAttackNote] = useState("Strike");
  const [queuedHits, setQueuedHits] = useState(0);
  const playerHpRef = useRef(BASE_PLAYER_HP);

  function applyBossHit(damage = 1) {
    const next = Math.max(0, playerHpRef.current - damage);
    playerHpRef.current = next;
    setPlayerHp(next);
    if (next <= 0) {
      finishRun();
    }
  }

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setBestScore(Number(saved) || 0);
    }
  }, []);

  useEffect(() => {
    if (phase !== "running") return;

    const baseInterval = Math.max(1100, 2600 - round * 170);
    const timer = window.setInterval(() => {
      const roll = Math.random();
      const nextPattern: "strike" | "double" | "slam" =
        roll > 0.82 ? "slam" : roll > 0.55 ? "double" : "strike";
      setPattern(nextPattern);
      setWarning(true);
      setAttackNote(nextPattern === "slam" ? "Heavy Slam" : nextPattern === "double" ? "Double Swipe" : "Quick Strike");
      window.setTimeout(() => {
        setWarning(false);
        if (nextPattern === "double") {
          setQueuedHits(2);
        } else {
          applyBossHit(nextPattern === "slam" ? 2 : 1);
        }
      }, nextPattern === "slam" ? 420 : 300);
    }, baseInterval);

    return () => window.clearInterval(timer);
  }, [phase, round, playerHp]);

  useEffect(() => {
    if (phase !== "running") return;
    if (queuedHits <= 0) return;
    const delay = queuedHits === 2 ? 160 : 140;
    const timer = window.setTimeout(() => {
      applyBossHit(1);
      setQueuedHits((current) => Math.max(0, current - 1));
    }, delay);
    return () => window.clearTimeout(timer);
  }, [queuedHits, phase]);

  const bossHpPercent = Math.max(0, (bossHp / (BASE_BOSS_HP + round * 40)) * 100);
  const playerHpPercent = Math.max(0, (playerHp / BASE_PLAYER_HP) * 100);

  const pressureLabel = useMemo(() => {
    if (round >= 7) return "Pressure III";
    if (round >= 4) return "Pressure II";
    return "Pressure I";
  }, [round]);

  const phaseLabel = round >= 7 ? "Phase III" : round >= 4 ? "Phase II" : "Phase I";

  function startRun() {
    setRound(1);
    setBossHp(BASE_BOSS_HP);
    playerHpRef.current = BASE_PLAYER_HP;
    setPlayerHp(BASE_PLAYER_HP);
    setScore(0);
    setCombo(0);
    setPhase("running");
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
    updateGameMeta({ gameId: "boss-clicker", score, outcome: "loss" });
    playFailure();
    if (shouldVibrate()) {
      navigator.vibrate([30, 60, 30]);
    }
    setShake(true);
    window.setTimeout(() => setShake(false), 260);
    setBestScore((current) => {
      const next = Math.max(current, score);
      window.localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  }

  function resetRun() {
    setPhase("ready");
    setRound(1);
    setBossHp(BASE_BOSS_HP);
    playerHpRef.current = BASE_PLAYER_HP;
    setPlayerHp(BASE_PLAYER_HP);
    setScore(0);
    setCombo(0);
    setWarning(false);
    setQueuedHits(0);
    setPattern("strike");
    setAttackNote("Strike");
  }

  function handleAttack() {
    if (phase !== "running") return;
    const damage = 8 + combo * 2;
    setBossHp((current) => {
      const next = current - damage;
      if (next <= 0) {
        advanceRound();
        return BASE_BOSS_HP + (round + 1) * 40;
      }
      return next;
    });
    setScore((current) => current + damage * 2);
    setCombo((current) => Math.min(12, current + 1));
    playSuccess();
    if (shouldVibrate()) {
      navigator.vibrate(12);
    }
  }

  function advanceRound() {
    setRound((current) => current + 1);
    setCombo(0);
    setPlayerHp((current) => Math.min(BASE_PLAYER_HP, current + 1));
  }

  return (
    <GameShell
      title="Boss Clicker"
      subtitle="Tap to attack. Survive the boss counter hits."
      icon="BC"
      badge={pressureLabel}
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
          <ScoreBadge label="Boss" value={`${Math.max(0, Math.round(bossHp))} HP`} tone={bossHpPercent < 25 ? "danger" : "default"} />
          <div className="game-shell__actions">
            <GameButton onClick={phase === "running" ? handleAttack : startRun}>
              {phase === "over" ? "Try Again" : "Attack"}
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
      <div className={`boss-clicker ${shake ? "is-shaking" : ""}`}>
        <GameCard className="boss-clicker__board" tone="highlight">
          <div className="boss-clicker__hud">
            <div>
              <span>Boss HP</span>
              <div className="boss-clicker__bar">
                <span style={{ width: `${bossHpPercent}%` }} />
              </div>
            </div>
            <div>
              <span>Your HP</span>
              <div className="boss-clicker__bar is-player">
                <span style={{ width: `${playerHpPercent}%` }} />
              </div>
            </div>
          </div>
          <div className="boss-clicker__phase">
            <span>{phaseLabel}</span>
            <span className={`boss-clicker__pattern-badge is-${pattern}`}>{attackNote}</span>
          </div>
          <button
            className={`boss-clicker__core ${warning ? "is-warning" : ""} is-${pattern}`}
            onClick={handleAttack}
            type="button"
          >
            <span>Tap to Attack</span>
          </button>
          <div className="boss-clicker__pattern">
            {warning ? "Boss charging! Brace and keep tapping." : "Attack before the next hit."}
          </div>
        </GameCard>

        <TouchControls leftLabel="Attack" rightLabel="Attack" onLeft={handleAttack} onRight={handleAttack} repeatDelay={120} />

        <GameOverlay
          title={phase === "ready" ? "Boss Clicker" : phase === "paused" ? "Paused" : phase === "over" ? "Down" : ""}
          description={
            phase === "ready"
              ? "Tap fast to drop the boss HP. Survive the counter hits."
              : phase === "paused"
                ? "Resume when ready."
                : phase === "over"
                  ? "The boss got you. Try again."
                  : undefined
          }
          helper={phase === "over" ? `Score ${score} • Best ${bestScore}` : phase === "ready" ? "Start to fight." : undefined}
          actions={
            phase === "ready" ? (
              <GameButton onClick={startRun}>Start Fight</GameButton>
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
