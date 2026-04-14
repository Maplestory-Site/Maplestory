import { useEffect, useMemo, useState } from "react";
import { GameButton } from "./shared/GameButton";
import { GameCard } from "./shared/GameCard";
import { GameOverlay } from "./shared/GameOverlay";
import { GameShell } from "./shared/GameShell";
import { useMiniGamesSound } from "./shared/MiniGamesSound";
import { ProgressBar } from "./shared/ProgressBar";
import { ScoreBadge } from "./shared/ScoreBadge";
import { StatDisplay } from "./shared/StatDisplay";
import { TouchControls } from "./shared/TouchControls";
import { updateGameMeta } from "./shared/gameMeta";

type UpgradeId = "focus" | "weights" | "boots";

type UpgradeState = Record<UpgradeId, number>;

const UPGRADE_LABELS: Record<UpgradeId, { title: string; detail: string }> = {
  focus: {
    title: "Focus Drill",
    detail: "Boosts Power gain"
  },
  weights: {
    title: "Weight Room",
    detail: "Boosts progress gain"
  },
  boots: {
    title: "Speed Boots",
    detail: "Boosts Speed gain"
  }
};

const BASE_COSTS: Record<UpgradeId, number> = {
  focus: 80,
  weights: 110,
  boots: 95
};

const STORAGE_KEY = "snailslayer-training-best";
const XP_PER_LEVEL = 120;
const BREAKTHROUGH_TARGET = 5;

function getBuildRank(score: number) {
  if (score >= 520) return "S";
  if (score >= 400) return "A";
  if (score >= 300) return "B";
  return "C";
}

export function MapleTrainingGame() {
  const { playFailure, playSuccess } = useMiniGamesSound();
  const [phase, setPhase] = useState<"ready" | "running" | "paused">("ready");
  const [power, setPower] = useState(38);
  const [speed, setSpeed] = useState(26);
  const [level, setLevel] = useState(1);
  const [xp, setXp] = useState(0);
  const [coins, setCoins] = useState(140);
  const [momentum, setMomentum] = useState(0);
  const [breakthroughs, setBreakthroughs] = useState(0);
  const [upgrades, setUpgrades] = useState<UpgradeState>({ focus: 0, weights: 0, boots: 0 });
  const [lastAction, setLastAction] = useState("Warm up the build and stack a clean training loop.");
  const [bestScore, setBestScore] = useState(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return saved ? Number(saved) || 0 : 0;
  });

  const progressPercent = Math.min((xp / XP_PER_LEVEL) * 100, 100);
  const efficiency = 1 + upgrades.weights * 0.18 + momentum * 0.025;
  const powerBoost = 1 + upgrades.focus * 0.22 + momentum * 0.02;
  const speedBoost = 1 + upgrades.boots * 0.2 + momentum * 0.018;
  const nextBreakthroughLevel = Math.ceil(level / BREAKTHROUGH_TARGET) * BREAKTHROUGH_TARGET;
  const nextBreakthroughProgress = Math.min((level / nextBreakthroughLevel) * 100, 100);

  const trainingScore = useMemo(
    () => Math.round(power * 1.55 + speed * 1.2 + level * 28 + breakthroughs * 65 + momentum * 8),
    [breakthroughs, level, momentum, power, speed]
  );
  const buildRank = getBuildRank(trainingScore);

  useEffect(() => {
    if (trainingScore > bestScore) {
      setBestScore(trainingScore);
      window.localStorage.setItem(STORAGE_KEY, String(trainingScore));
    }
  }, [trainingScore, bestScore]);

  function startTraining() {
    setPhase("running");
  }

  function pauseTraining() {
    if (phase !== "running") return;
    setPhase("paused");
  }

  function resumeTraining() {
    if (phase !== "paused") return;
    setPhase("running");
  }

  function train() {
    if (phase !== "running") {
      setLastAction("Tap start to begin the training run.");
      return;
    }

    const momentumGain = 1 + Math.floor(Math.random() * 2);
    const nextMomentum = Math.min(momentum + momentumGain, 18);
    const nextXpGain = Math.round((16 + Math.random() * 8) * efficiency);
    const nextPowerGain = Math.max(1, Math.round((2 + Math.random() * 3) * powerBoost));
    const nextSpeedGain = Math.max(1, Math.round((1 + Math.random() * 2.5) * speedBoost));
    const nextCoinsGain = 10 + upgrades.weights * 3 + Math.floor(nextMomentum / 3);

    let totalXp = xp + nextXpGain;
    let nextLevel = level;
    let breakthroughsEarned = breakthroughs;

    while (totalXp >= XP_PER_LEVEL) {
      totalXp -= XP_PER_LEVEL;
      nextLevel += 1;

      if (nextLevel % BREAKTHROUGH_TARGET === 0) {
        breakthroughsEarned += 1;
      }
    }

    const leveledUp = nextLevel > level;
    const breakthroughHit = breakthroughsEarned > breakthroughs;

    setXp(totalXp);
    setLevel(nextLevel);
    setPower((current) => current + nextPowerGain);
    setSpeed((current) => current + nextSpeedGain);
    setCoins((current) => current + nextCoinsGain);
    setMomentum(nextMomentum);
    setBreakthroughs(breakthroughsEarned);
    setLastAction(
      breakthroughHit
        ? "Breakthrough unlocked. Build pressure rising fast."
        : leveledUp
          ? `Level ${nextLevel} reached. Keep the momentum clean.`
          : `+${nextPowerGain} Power, +${nextSpeedGain} Speed, +${nextCoinsGain} Coins`
    );
    playSuccess();
  }

  function buyUpgrade(upgradeId: UpgradeId) {
    if (phase !== "running") {
      setLastAction("Start the session before upgrading.");
      return;
    }

    const currentLevel = upgrades[upgradeId];
    const cost = BASE_COSTS[upgradeId] + currentLevel * 55;

    if (coins < cost) {
      setLastAction("Need more coins before the next upgrade lands.");
      playFailure();
      return;
    }

    setCoins((current) => current - cost);
    setUpgrades((current) => ({
      ...current,
      [upgradeId]: current[upgradeId] + 1
    }));
    setMomentum((current) => Math.max(current - 2, 0));
    setLastAction(`${UPGRADE_LABELS[upgradeId].title} upgraded to Lv.${currentLevel + 1}.`);
    playSuccess();
  }

  function resetTraining() {
    updateGameMeta({
      gameId: "maple-training",
      score: trainingScore,
      outcome: "session"
    });
    setPhase("ready");
    setPower(38);
    setSpeed(26);
    setLevel(1);
    setXp(0);
    setCoins(140);
    setMomentum(0);
    setBreakthroughs(0);
    setUpgrades({ focus: 0, weights: 0, boots: 0 });
    setLastAction("Training reset. Fresh push ready.");
  }

  function buyCheapestUpgrade() {
    const candidates = (["focus", "weights", "boots"] as UpgradeId[]).map((id) => {
      const currentLevel = upgrades[id];
      return { id, cost: BASE_COSTS[id] + currentLevel * 55 };
    });
    const affordable = candidates.filter((candidate) => coins >= candidate.cost);
    if (!affordable.length) {
      setLastAction("Stack more coins before the next upgrade lands.");
      playFailure();
      return;
    }
    affordable.sort((a, b) => a.cost - b.cost);
    buyUpgrade(affordable[0].id);
  }

  return (
    <GameShell
      badge={`Build ${buildRank}`}
      icon="MT"
      subtitle="Train up, build progress, and sharpen the next account push."
      stats={
        <>
          <StatDisplay label="Power" value={power} />
          <StatDisplay label="Speed" value={speed} />
          <StatDisplay label="Training Level" value={level} />
          <StatDisplay label="Momentum" value={momentum} />
        </>
      }
      aspectRatio="4 / 3"
      title="Maple Training"
      footer={
        <div className="game-shell__footer-row">
          <ScoreBadge label="Training Score" value={trainingScore} />
          <div className="game-shell__actions">
            <GameButton onClick={train}>Train</GameButton>
            <GameButton onClick={phase === "running" ? pauseTraining : resumeTraining} variant="secondary">
              {phase === "paused" ? "Resume" : "Pause"}
            </GameButton>
            <GameButton onClick={resetTraining} variant="secondary">
              Reset
            </GameButton>
          </div>
        </div>
      }
    >
      <div className="maple-training">
        <div className="maple-training__grid">
          <section className="maple-training__main">
            <GameCard className="maple-training__progress-card" tone="highlight">
              <div className="maple-training__progress-head">
                <div>
                  <span className="mini-card-label">Training Progress</span>
                  <strong>Level {level} push</strong>
                </div>
                <span className="maple-training__coins">{coins} Coins</span>
              </div>

              <ProgressBar accent="gold" label="XP" progress={progressPercent} value={`${xp} / ${XP_PER_LEVEL}`} />

              <div className="maple-training__stats">
                <ProgressBar accent="ember" label="Power growth" progress={Math.min(power / 2, 100)} value={`x${powerBoost.toFixed(2)}`} />
                <ProgressBar accent="violet" label="Speed growth" progress={Math.min(speed / 2, 100)} value={`x${speedBoost.toFixed(2)}`} />
              </div>
            </GameCard>

            <div className="maple-training__summary-grid">
              <GameCard className="maple-training__milestone-card" tone="muted">
                <span className="mini-card-label">Breakthrough Track</span>
                <strong>Next milestone at Lv.{nextBreakthroughLevel}</strong>
                <ProgressBar
                  accent="gold"
                  label="Milestone progress"
                  progress={nextBreakthroughProgress}
                  value={`${level}/${nextBreakthroughLevel}`}
                />
                <span className="maple-training__build-score">{breakthroughs} breakthroughs unlocked</span>
              </GameCard>

              <GameCard className="maple-training__milestone-card" tone="muted">
                <span className="mini-card-label">Build Grade</span>
                <strong>Rank {buildRank}</strong>
                <ProgressBar
                  accent="violet"
                  label="Momentum"
                  progress={Math.min((momentum / 18) * 100, 100)}
                  value={`${momentum}/18`}
                />
                <span className="maple-training__build-score">Score {trainingScore}</span>
              </GameCard>
            </div>

            <GameCard className="game-feedback" tone="muted">
              <strong>Training feed</strong>
              <span>{lastAction}</span>
            </GameCard>
          </section>

          <aside className="maple-training__upgrades">
            <span className="mini-card-label">Upgrades</span>
            {(["focus", "weights", "boots"] as UpgradeId[]).map((upgradeId) => {
              const currentLevel = upgrades[upgradeId];
              const cost = BASE_COSTS[upgradeId] + currentLevel * 55;
              const canAfford = coins >= cost;

              return (
                <button
                  className="maple-upgrade-card"
                  key={upgradeId}
                  onClick={() => buyUpgrade(upgradeId)}
                  type="button"
                >
                  <div className="maple-upgrade-card__top">
                    <strong>{UPGRADE_LABELS[upgradeId].title}</strong>
                    <span>Lv.{currentLevel}</span>
                  </div>
                  <span className="maple-upgrade-card__detail">{UPGRADE_LABELS[upgradeId].detail}</span>
                  <div className="maple-upgrade-card__bottom">
                    <span>Cost {cost}</span>
                    <span>{canAfford ? "Upgrade" : "Locked"}</span>
                  </div>
                </button>
              );
            })}
          </aside>
        </div>
        <TouchControls
          leftLabel="Train"
          rightLabel="Boost"
          onLeft={train}
          onRight={buyCheapestUpgrade}
          repeatDelay={200}
        />
        <GameOverlay
          title={phase === "ready" ? "Training Session" : phase === "paused" ? "Paused" : ""}
          description={
            phase === "ready"
              ? "Build power, speed, and momentum. Quick taps stack upgrades fast."
              : phase === "paused"
                ? "Hold your progress. Resume when ready."
                : undefined
          }
          helper={
            phase === "ready" ? `Best score ${bestScore}` : phase === "paused" ? `Current score ${trainingScore}` : undefined
          }
          actions={
            phase === "ready" ? (
              <GameButton onClick={startTraining}>Start Training</GameButton>
            ) : phase === "paused" ? (
              <GameButton onClick={resumeTraining}>Resume</GameButton>
            ) : null
          }
          visible={phase === "ready" || phase === "paused"}
        />
      </div>
    </GameShell>
  );
}
