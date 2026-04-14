import { useRef, useState } from "react";

type TapZoneControlsProps = {
  onLeft: () => void;
  onRight: () => void;
  onAction?: () => void;
  leftLabel?: string;
  rightLabel?: string;
  actionLabel?: string;
  repeatDelay?: number;
  haptics?: boolean;
};

export function TapZoneControls({
  onLeft,
  onRight,
  onAction,
  leftLabel = "Left",
  rightLabel = "Right",
  actionLabel = "Action",
  repeatDelay = 120,
  haptics = true
}: TapZoneControlsProps) {
  const holdRef = useRef<number | null>(null);
  const [pressed, setPressed] = useState<"left" | "right" | "action" | null>(null);

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
    <div className="game-tapzones" aria-hidden="true">
      <button
        className={`game-tapzones__zone game-tapzones__zone--left ${pressed === "left" ? "is-pressed" : ""}`}
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
        className={`game-tapzones__zone game-tapzones__zone--right ${pressed === "right" ? "is-pressed" : ""}`}
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
      {onAction ? (
        <button
          className={`game-tapzones__action ${pressed === "action" ? "is-pressed" : ""}`}
          type="button"
          onPointerDown={(event) => {
            event.preventDefault();
            event.currentTarget.setPointerCapture(event.pointerId);
            setPressed("action");
            triggerHaptic();
          }}
          onPointerUp={() => setPressed(null)}
          onPointerCancel={() => setPressed(null)}
          onPointerLeave={() => setPressed(null)}
          onClick={onAction}
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}
