import { useRef, useState } from "react";

type TouchControlsProps = {
  leftLabel: string;
  rightLabel: string;
  onLeft: () => void;
  onRight: () => void;
  repeatDelay?: number;
  haptics?: boolean;
};

export function TouchControls({
  leftLabel,
  rightLabel,
  onLeft,
  onRight,
  repeatDelay = 110,
  haptics = true
}: TouchControlsProps) {
  const holdRef = useRef<number | null>(null);
  const [pressed, setPressed] = useState<"left" | "right" | null>(null);

  const triggerHaptic = () => {
    if (!haptics || !("vibrate" in navigator)) return;
    navigator.vibrate(8);
  };

  const startHold = (action: () => void) => {
    if (holdRef.current) {
      window.clearInterval(holdRef.current);
      holdRef.current = null;
    }
    triggerHaptic();
    action();
    holdRef.current = window.setInterval(action, repeatDelay);
  };

  const stopHold = () => {
    if (holdRef.current) {
      window.clearInterval(holdRef.current);
      holdRef.current = null;
    }
    setPressed(null);
  };

  return (
    <div className="game-touch" aria-hidden="true">
      <div className="game-touch__controls">
        <button
          className={`game-touch__button ${pressed === "left" ? "is-pressed" : ""}`}
          type="button"
          onPointerDown={(event) => {
            event.preventDefault();
            event.currentTarget.setPointerCapture(event.pointerId);
            setPressed("left");
            startHold(onLeft);
          }}
          onPointerUp={stopHold}
          onPointerLeave={stopHold}
          onPointerCancel={stopHold}
        >
          {leftLabel}
        </button>
        <button
          className={`game-touch__button ${pressed === "right" ? "is-pressed" : ""}`}
          type="button"
          onPointerDown={(event) => {
            event.preventDefault();
            event.currentTarget.setPointerCapture(event.pointerId);
            setPressed("right");
            startHold(onRight);
          }}
          onPointerUp={stopHold}
          onPointerLeave={stopHold}
          onPointerCancel={stopHold}
        >
          {rightLabel}
        </button>
      </div>
    </div>
  );
}
