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

type Block = {
  id: number;
  width: number;
  center: number;
  currentY: number;
  targetY: number;
};

type Slice = {
  id: number;
  width: number;
  center: number;
  y: number;
};

const STORAGE_KEY = "snailslayer-stack-builder-best";
const BASE_WIDTH = 60;
const STACK_HEIGHT = 18;
const MAX_LEVELS = 12;

export function StackBuilderGame() {
  const { playFailure, playSuccess } = useMiniGamesSound();
  const [phase, setPhase] = useState<"ready" | "running" | "paused" | "over">("ready");
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [movingCenter, setMovingCenter] = useState(20);
  const [direction, setDirection] = useState(1);
  const [movingWidth, setMovingWidth] = useState(BASE_WIDTH);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [level, setLevel] = useState(1);
  const [shake, setShake] = useState(false);
  const [slices, setSlices] = useState<Slice[]>([]);
  const [perfectFlash, setPerfectFlash] = useState(false);

  const movingCenterRef = useRef(movingCenter);
  const directionRef = useRef(direction);
  const movingWidthRef = useRef(movingWidth);
  const levelRef = useRef(level);
  const animationRef = useRef<number | null>(null);
  const lastFrameRef = useRef<number | null>(null);
  const nextId = useRef(1);
  const nextSliceId = useRef(1);

  useEffect(() => {
    movingCenterRef.current = movingCenter;
  }, [movingCenter]);

  useEffect(() => {
    directionRef.current = direction;
  }, [direction]);

  useEffect(() => {
    movingWidthRef.current = movingWidth;
  }, [movingWidth]);

  useEffect(() => {
    levelRef.current = level;
  }, [level]);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setBestScore(Number(saved) || 0);
    }
  }, []);

  useEffect(() => {
    if (phase !== "running") {
      if (animationRef.current) {
        window.cancelAnimationFrame(animationRef.current);
      }
      animationRef.current = null;
      lastFrameRef.current = null;
      return;
    }

    const tick = (timestamp: number) => {
      if (lastFrameRef.current == null) {
        lastFrameRef.current = timestamp;
      }
      const delta = Math.min((timestamp - lastFrameRef.current) / 1000, 0.045);
      lastFrameRef.current = timestamp;

      const speed = 35 + levelRef.current * 3.2;
      let next = movingCenterRef.current + directionRef.current * delta * speed;
      let nextDirection = directionRef.current;

      if (next >= 100 - movingWidthRef.current / 2) {
        next = 100 - movingWidthRef.current / 2;
        nextDirection = -1;
      } else if (next <= movingWidthRef.current / 2) {
        next = movingWidthRef.current / 2;
        nextDirection = 1;
      }

      directionRef.current = nextDirection;
      movingCenterRef.current = next;
      setDirection(nextDirection);
      setMovingCenter(next);

      animationRef.current = window.requestAnimationFrame(tick);
    };

    animationRef.current = window.requestAnimationFrame(tick);
    return () => {
      if (animationRef.current) {
        window.cancelAnimationFrame(animationRef.current);
      }
    };
  }, [phase]);

  function startRun() {
    const baseBlock: Block = {
      id: nextId.current++,
      width: BASE_WIDTH,
      center: 50,
      currentY: (MAX_LEVELS - 1) * STACK_HEIGHT,
      targetY: (MAX_LEVELS - 1) * STACK_HEIGHT
    };
    setBlocks([baseBlock]);
    setMovingWidth(BASE_WIDTH);
    setMovingCenter(20);
    setDirection(1);
    movingCenterRef.current = 20;
    directionRef.current = 1;
    movingWidthRef.current = BASE_WIDTH;
    setScore(0);
    setCombo(0);
    setLevel(1);
    setSlices([]);
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
    setPhase("over");
    playFailure();
    updateGameMeta({ gameId: "stack-builder", score, outcome: "loss" });
    if (shouldVibrate()) {
      navigator.vibrate([30, 60, 30]);
    }
    setShake(true);
    window.setTimeout(() => setShake(false), 260);
    setBestScore((currentBest) => {
      const nextBest = Math.max(currentBest, score);
      window.localStorage.setItem(STORAGE_KEY, String(nextBest));
      return nextBest;
    });
  }

  function dropBlock() {
    if (phase !== "running") return;
    const last = blocks[blocks.length - 1];
    const movingLeft = movingCenterRef.current - movingWidthRef.current / 2;
    const movingRight = movingCenterRef.current + movingWidthRef.current / 2;
    const lastLeft = last.center - last.width / 2;
    const lastRight = last.center + last.width / 2;
    const overlapLeft = Math.max(movingLeft, lastLeft);
    const overlapRight = Math.min(movingRight, lastRight);
    const overlap = overlapRight - overlapLeft;

    if (overlap <= 0.8) {
      finishRun();
      return;
    }

    const nextWidth = Math.max(8, overlap);
    const nextCenter = overlapLeft + overlap / 2;
    const precision = overlap / last.width;
    const perfect = precision >= 0.94;
    const nextSlices: Slice[] = [];

    const leftCut = overlapLeft - lastLeft;
    if (leftCut > 0.6) {
      nextSlices.push({
        id: nextSliceId.current++,
        width: leftCut,
        center: lastLeft + leftCut / 2,
        y: (MAX_LEVELS - 1) * STACK_HEIGHT
      });
    }

    const rightCut = lastRight - overlapRight;
    if (rightCut > 0.6) {
      nextSlices.push({
        id: nextSliceId.current++,
        width: rightCut,
        center: overlapRight + rightCut / 2,
        y: (MAX_LEVELS - 1) * STACK_HEIGHT
      });
    }
    const nextCombo = perfect ? combo + 1 : Math.max(0, combo - 1);
    const gain = Math.round(40 * precision + nextCombo * 12);
    const nextScore = score + gain;

    const targetY = Math.max(0, (MAX_LEVELS - blocks.length - 1) * STACK_HEIGHT);
    const newBlock: Block = {
      id: nextId.current++,
      width: nextWidth,
      center: nextCenter,
      currentY: 0,
      targetY
    };

    setBlocks((current) => current.concat(newBlock).slice(-MAX_LEVELS));
    if (nextSlices.length) {
      setSlices((current) => current.concat(nextSlices));
      window.setTimeout(() => {
        setSlices((current) => current.filter((slice) => !nextSlices.some((item) => item.id === slice.id)));
      }, 520);
    }
    setMovingWidth(nextWidth);
    movingWidthRef.current = nextWidth;
    setMovingCenter(15 + Math.random() * 70);
    movingCenterRef.current = 15 + Math.random() * 70;
    setDirection(directionRef.current * -1);
    directionRef.current = directionRef.current * -1;
    setScore(nextScore);
    setCombo(nextCombo);
    setLevel((current) => current + 1);
    playSuccess();
    if (shouldVibrate()) {
      navigator.vibrate(18);
    }
    if (perfect) {
      setPerfectFlash(true);
      window.setTimeout(() => setPerfectFlash(false), 180);
    }

    window.requestAnimationFrame(() => {
      setBlocks((current) =>
        current.map((block) =>
          block.id === newBlock.id
            ? {
                ...block,
                currentY: block.targetY
              }
            : block
        )
      );
    });
  }

  function resetRun() {
    setPhase("ready");
    setBlocks([]);
    setMovingWidth(BASE_WIDTH);
    setMovingCenter(20);
    setDirection(1);
    setScore(0);
    setCombo(0);
    setLevel(1);
    setShake(false);
    setSlices([]);
    setPerfectFlash(false);
    lastFrameRef.current = null;
  }

  const precisionLabel = useMemo(() => {
    if (combo >= 6) return "Perfect";
    if (combo >= 3) return "Sharp";
    return "Clean";
  }, [combo]);

  return (
    <GameShell
      title="Stack Builder"
      subtitle="Drop the block at the cleanest overlap."
      icon="SB"
      badge={precisionLabel}
      aspectRatio="4 / 3"
      stats={
        <>
          <StatDisplay label="Score" value={score} />
          <StatDisplay label="Combo" value={combo} />
          <StatDisplay label="Level" value={level} />
          <StatDisplay label="Best" value={bestScore} />
        </>
      }
      footer={
        <div className="game-shell__footer-row">
          <ScoreBadge label="Run" value={phase === "running" ? "Stacking" : phase === "over" ? "Missed" : "Ready"} />
          <div className="game-shell__actions">
            <GameButton onClick={phase === "running" ? dropBlock : startRun}>
              {phase === "running" ? "Drop" : phase === "over" ? "Try Again" : "Start Stack"}
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
      <div className={`stack-builder ${shake ? "is-shaking" : ""}`}>
        <GameCard className={`stack-builder__board ${perfectFlash ? "is-perfect" : ""}`} tone="highlight">
          <div
            className="stack-builder__arena"
            role="img"
            aria-label="Stacking board"
            style={{ transform: `scale(${1 + Math.min(blocks.length * 0.015, 0.18)})` }}
          >
            {blocks.map((block) => (
              <span
                className="stack-builder__block"
                key={block.id}
                style={{
                  width: `${block.width}%`,
                  left: `${block.center}%`,
                  top: `${block.currentY}px`
                }}
              />
            ))}
            {slices.map((slice) => (
              <span
                className="stack-builder__slice"
                key={slice.id}
                style={{
                  width: `${slice.width}%`,
                  left: `${slice.center}%`,
                  top: `${slice.y}px`
                }}
              />
            ))}
            {phase === "running" ? (
              <span
                className="stack-builder__block is-moving"
                style={{
                  width: `${movingWidth}%`,
                  left: `${movingCenter}%`,
                  top: `${(MAX_LEVELS - 1) * STACK_HEIGHT}px`
                }}
              />
            ) : null}
          </div>
          <TouchControls leftLabel="Drop" rightLabel="Drop" onLeft={dropBlock} onRight={dropBlock} repeatDelay={120} />
        </GameCard>

        <GameOverlay
          title={phase === "ready" ? "Stack Builder" : phase === "paused" ? "Paused" : phase === "over" ? "Stack Lost" : ""}
          description={
            phase === "ready"
              ? "Drop the block inside the overlap. Perfect hits boost combo."
              : phase === "paused"
                ? "Hold the stack. Resume when ready."
                : phase === "over"
                  ? "Missed the overlap. Tighten the timing."
                  : undefined
          }
          helper={phase === "over" ? `Score ${score} • Best ${bestScore}` : phase === "ready" ? "Tap to drop." : undefined}
          actions={
            phase === "ready" ? (
              <GameButton onClick={startRun}>Start Stack</GameButton>
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
