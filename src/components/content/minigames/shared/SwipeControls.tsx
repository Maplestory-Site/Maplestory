import { useRef, useState, type PointerEvent } from "react";

type SwipeControlsProps = {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  threshold?: number;
  label?: string;
  haptics?: boolean;
};

export function SwipeControls({
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  threshold = 30,
  label = "Swipe",
  haptics = true
}: SwipeControlsProps) {
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const activeRef = useRef(false);
  const [pressed, setPressed] = useState(false);

  const triggerHaptic = () => {
    if (!haptics || !("vibrate" in navigator)) return;
    navigator.vibrate(8);
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    activeRef.current = true;
    setPressed(true);
    startRef.current = { x: event.clientX, y: event.clientY };
  };

  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (!activeRef.current || !startRef.current) {
      activeRef.current = false;
      startRef.current = null;
      setPressed(false);
      return;
    }
    const dx = event.clientX - startRef.current.x;
    const dy = event.clientY - startRef.current.y;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);
    if (Math.max(absX, absY) < threshold) {
      activeRef.current = false;
      startRef.current = null;
      setPressed(false);
      return;
    }
    if (absX > absY) {
      if (dx > 0) onSwipeRight?.();
      else onSwipeLeft?.();
    } else {
      if (dy > 0) onSwipeDown?.();
      else onSwipeUp?.();
    }
    triggerHaptic();
    activeRef.current = false;
    startRef.current = null;
    setPressed(false);
  };

  const onPointerCancel = () => {
    activeRef.current = false;
    startRef.current = null;
    setPressed(false);
  };

  return (
    <div
      className={`game-swipe ${pressed ? "is-pressed" : ""}`}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onPointerLeave={onPointerCancel}
      role="presentation"
      aria-label={`${label} controls`}
    >
      <span className="game-swipe__hint">{label}</span>
    </div>
  );
}
