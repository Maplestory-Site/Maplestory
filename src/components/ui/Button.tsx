import type { ReactNode } from "react";
import { Link } from "react-router-dom";

type ButtonProps = {
  children: ReactNode;
  href?: string;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "ghost" | "link";
  size?: "sm" | "md";
  fullWidth?: boolean;
  disabled?: boolean;
  type?: "button" | "submit";
};

export function Button({
  children,
  href,
  onClick,
  variant = "primary",
  size = "md",
  fullWidth = false,
  disabled = false,
  type = "button"
}: ButtonProps) {
  const className = ["button", `button--${variant}`, `button--${size}`, fullWidth ? "button--full" : ""].filter(Boolean).join(" ");
  const isExternal = typeof href === "string" && /^https?:\/\//.test(href);

  if (href) {
    if (isExternal) {
      return (
        <a className={className} href={href} rel="noreferrer" target="_blank">
          {children}
        </a>
      );
    }

    return (
      <Link className={className} to={href}>
        {children}
      </Link>
    );
  }

  return (
    <button className={className} disabled={disabled} onClick={onClick} type={type}>
      {children}
    </button>
  );
}
