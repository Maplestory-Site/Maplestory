import type { ButtonHTMLAttributes, ReactNode } from "react";
import { useMiniGamesSound } from "./MiniGamesSound";

type GameButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  wide?: boolean;
};

export function GameButton({
  children,
  className = "",
  variant = "primary",
  wide = false,
  type = "button",
  onClick,
  ...props
}: GameButtonProps) {
  const { playClick } = useMiniGamesSound();

  return (
    <button
      className={`game-button game-button--${variant} ${wide ? "game-button--wide" : ""} ${className}`.trim()}
      onClick={(event) => {
        if (!props.disabled) {
          playClick();
        }

        onClick?.(event);
      }}
      type={type}
      {...props}
    >
      {children}
    </button>
  );
}
