import { useEffect, useRef, useState } from "react";
import { GameButton } from "./shared/GameButton";
import { GameCard } from "./shared/GameCard";
import { GameOverlay } from "./shared/GameOverlay";
import { GameShell } from "./shared/GameShell";
import { StatDisplay } from "./shared/StatDisplay";
import { JoystickControl } from "./shared/JoystickControl";
import { useTouchDevice } from "./shared/useTouchDevice";

type Food = { id: number; x: number; y: number };
type Enemy = { id: number; x: number; y: number };

const EVOLUTIONS = [
  { label: "Sprout", size: 16, color: "#7fffd4" },
  { label: "Mushling", size: 20, color: "#8ee6ff" },
  { label: "Slimelet", size: 24, color: "#7cff8b" },
  { label: "Forestkin", size: 28, color: "#ffd46b" }
];

export function MapleSurvivalGame() {
  const [phase, setPhase] = useState<"ready" | "running" | "over">("ready");
  const [level, setLevel] = useState(1);
  const [xp, setXp] = useState(0);
  const [foods, setFoods] = useState<Food[]>([]);
  const [enemies, setEnemies] = useState<Enemy[]>([]);
  const [score, setScore] = useState(0);
  const [shake, setShake] = useState(false);
  const isTouch = useTouchDevice();

  const playerRef = useRef({ x: 50, y: 50, vx: 0, vy: 0 });
  const foodId = useRef(1);
  const enemyId = useRef(1);
  const loopRef = useRef<number | null>(null);
  const lastRef = useRef<number | null>(null);

  const xpToNext = 5 + level * 2;
  const evo = EVOLUTIONS[Math.min(level - 1, EVOLUTIONS.length - 1)];

  useEffect(() => {
    if (phase !== "running") {
      if (loopRef.current) {
        window.cancelAnimationFrame(loopRef.current);
        loopRef.current = null;
      }
      lastRef.current = null;
      return;
    }

    const loop = (time: number) => {
      if (lastRef.current == null) {
        lastRef.current = time;
      }
      const delta = Math.min((time - lastRef.current) / 1000, 0.04);
      lastRef.current = time;

      const player = playerRef.current;
      player.x = Math.max(4, Math.min(96, player.x + player.vx * delta));
      player.y = Math.max(6, Math.min(94, player.y + player.vy * delta));

      setEnemies((current) =>
        current.map((enemy) => {
          const dx = player.x - enemy.x;
          const dy = player.y - enemy.y;
          const dist = Math.max(1, Math.hypot(dx, dy));
          const speed = 12 + level * 1.2;
          return {
            ...enemy,
            x: enemy.x + (dx / dist) * speed * delta,
            y: enemy.y + (dy / dist) * speed * delta
          };
        })
      );

      setFoods((current) => {
        const hitIndex = current.findIndex((food) => {
          const dx = player.x - food.x;
          const dy = player.y - food.y;
          return Math.hypot(dx, dy) < 6;
        });
        if (hitIndex >= 0) {
          setScore((value) => value + 1);
          setXp((value) => value + 1);
          const next = current.slice();
          next.splice(hitIndex, 1);
          return next;
        }
        return current;
      });

      const hitEnemy = enemies.some((enemy) => {
        const dx = player.x - enemy.x;
        const dy = player.y - enemy.y;
        return Math.hypot(dx, dy) < 7;
      });
      if (hitEnemy) {
        window.setTimeout(() => {
          setPhase("over");
          setShake(true);
          window.setTimeout(() => setShake(false), 240);
        }, 0);
        return;
      }

      loopRef.current = window.requestAnimationFrame(loop);
    };

    loopRef.current = window.requestAnimationFrame(loop);
    return () => {
      if (loopRef.current) {
        window.cancelAnimationFrame(loopRef.current);
        loopRef.current = null;
      }
      lastRef.current = null;
    };
  }, [phase, level, enemies]);

  useEffect(() => {
    if (phase !== "running") return;
    if (foods.length < 6) {
      setFoods((current) =>
        current.concat({
          id: foodId.current++,
          x: 10 + Math.random() * 80,
          y: 10 + Math.random() * 80
        })
      );
    }
    if (enemies.length < 1) {
      setEnemies((current) =>
        current.concat({
          id: enemyId.current++,
          x: 12 + Math.random() * 76,
          y: 12 + Math.random() * 76
        })
      );
    }
  }, [phase, foods.length, enemies.length]);

  useEffect(() => {
    if (xp >= xpToNext) {
      setXp(0);
      setLevel((value) => Math.min(value + 1, EVOLUTIONS.length));
    }
  }, [xp, xpToNext]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (phase !== "running") return;
      const speed = 46;
      if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") playerRef.current.vx = -speed;
      if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") playerRef.current.vx = speed;
      if (event.key === "ArrowUp" || event.key.toLowerCase() === "w") playerRef.current.vy = -speed;
      if (event.key === "ArrowDown" || event.key.toLowerCase() === "s") playerRef.current.vy = speed;
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") playerRef.current.vx = 0;
      if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") playerRef.current.vx = 0;
      if (event.key === "ArrowUp" || event.key.toLowerCase() === "w") playerRef.current.vy = 0;
      if (event.key === "ArrowDown" || event.key.toLowerCase() === "s") playerRef.current.vy = 0;
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [phase]);

  const startRun = () => {
    playerRef.current = { x: 50, y: 50, vx: 0, vy: 0 };
    setFoods([]);
    setEnemies([]);
    setScore(0);
    setXp(0);
    setLevel(1);
    setPhase("running");
  };

  return (
    <GameShell
      title="Maple Survival"
      subtitle="Eat, grow, evolve. Avoid the hunter."
      icon="MS"
      aspectRatio="16 / 9"
      stats={
        <>
          <StatDisplay label="Score" value={score} />
          <StatDisplay label="Level" value={level} />
          <StatDisplay label="XP" value={`${xp}/${xpToNext}`} />
        </>
      }
      footer={null}
    >
      <div className={`maple-survival ${shake ? "is-hit" : ""}`}>
        <GameCard className="maple-survival__board" tone="highlight">
          <div className="maple-survival__arena">
            {foods.map((food) => (
              <span key={food.id} className="maple-survival__food" style={{ left: `${food.x}%`, top: `${food.y}%` }} />
            ))}
            {enemies.map((enemy) => (
              <span
                key={enemy.id}
                className="maple-survival__enemy"
                style={{ left: `${enemy.x}%`, top: `${enemy.y}%` }}
              />
            ))}
            <span
              className="maple-survival__player"
              style={{
                left: `${playerRef.current.x}%`,
                top: `${playerRef.current.y}%`,
                width: `${evo.size}px`,
                height: `${evo.size}px`,
                background: evo.color
              }}
            />
          </div>

          {isTouch ? (
            <JoystickControl
              onMove={(x, y) => {
                const speed = 52;
                playerRef.current.vx = x * speed;
                playerRef.current.vy = y * speed;
              }}
              onRelease={() => {
                playerRef.current.vx = 0;
                playerRef.current.vy = 0;
              }}
              label="Move"
            />
          ) : null}
        </GameCard>

        <GameOverlay
          title={phase === "ready" ? "Maple Survival" : phase === "over" ? "Game Over" : ""}
          description={phase === "ready" ? "Collect food. Avoid the hunter." : phase === "over" ? "Caught!" : undefined}
          actions={
            phase === "ready" ? (
              <GameButton onClick={startRun}>Start</GameButton>
            ) : phase === "over" ? (
              <GameButton onClick={startRun}>Play Again</GameButton>
            ) : null
          }
          visible={phase === "ready" || phase === "over"}
        />
      </div>
    </GameShell>
  );
}
