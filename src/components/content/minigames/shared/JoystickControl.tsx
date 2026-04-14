import { useEffect, useRef, useState, type PointerEvent } from "react";

type JoystickControlProps = {
  onMove: (x: number, y: number) => void;
  onRelease?: () => void;
  label?: string;
  haptics?: boolean;
};

export function JoystickControl({ onMove, onRelease, label = "Move", haptics = true }: JoystickControlProps) {
  const baseRef = useRef<HTMLDivElement | null>(null);
  const [active, setActive] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const radius = 54;

  const triggerHaptic = () => {
    if (!haptics || !("vibrate" in navigator)) return;
    navigator.vibrate(8);
  };

  useEffect(() => {
    onMove(pos.x / radius, pos.y / radius);
  }, [pos, onMove]);

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setActive(true);
    triggerHaptic();
    updatePosition(event);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!active) return;
    updatePosition(event);
  };

  const handlePointerUp = () => {
    setActive(false);
    setPos({ x: 0, y: 0 });
    onRelease?.();
  };

  const updatePosition = (event: PointerEvent<HTMLDivElement>) => {
    const base = baseRef.current;
    if (!base) return;
    const rect = base.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    let dx = event.clientX - centerX;
    let dy = event.clientY - centerY;
    const distance = Math.hypot(dx, dy);
    if (distance > radius) {
      const scale = radius / distance;
      dx *= scale;
      dy *= scale;
    }
    setPos({ x: dx, y: dy });
  };

  return (
    <div
      className={`game-joystick ${active ? "is-active" : ""}`}
      ref={baseRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onPointerLeave={handlePointerUp}
      role="presentation"
      aria-label={`${label} joystick`}
    >
      <div className="game-joystick__base" />
      <div className="game-joystick__handle" style={{ transform: `translate(${pos.x}px, ${pos.y}px)` }} />
      <span className="game-joystick__label">{label}</span>
    </div>
  );
}
