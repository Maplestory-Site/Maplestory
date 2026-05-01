import { LIBRARY_ICON_PATHS, type LibraryIconKey } from "../../data/libraryAssets";

type Props = {
  name: LibraryIconKey;
  size?: number;
  className?: string;
  strokeWidth?: number;
  "aria-label"?: string;
};

/**
 * Inline SVG icon. No external icon library; paths come from `libraryAssets.ts`.
 * Falls back to the category default if an unknown name is passed.
 */
export function LibraryIcon({
  name,
  size = 22,
  className = "",
  strokeWidth = 1.8,
  "aria-label": ariaLabel
}: Props) {
  const path = LIBRARY_ICON_PATHS[name] ?? LIBRARY_ICON_PATHS.book;
  const accessible = ariaLabel ? { role: "img" as const, "aria-label": ariaLabel } : { "aria-hidden": true as const };
  return (
    <svg
      className={`library-icon ${className}`.trim()}
      fill="none"
      height={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={strokeWidth}
      viewBox="0 0 24 24"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
      {...accessible}
    >
      <path d={path} />
    </svg>
  );
}
