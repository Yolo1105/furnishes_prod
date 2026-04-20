import type { CSSProperties } from "react";

/** Horizontal arrow — e.g. active row affordance in service lists, inspiration cards. */
export function ArrowRightIcon({
  className,
  size = 18,
  style,
  variant = "compact",
}: {
  className?: string;
  size?: number;
  style?: CSSProperties;
  /** `compact` = short chevron; `stroke` = long arrow (e.g. bento card hover). */
  variant?: "compact" | "stroke";
}) {
  if (variant === "stroke") {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        style={style}
        aria-hidden
      >
        <path d="M5 12h14M12 5l7 7-7 7" />
      </svg>
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 18 18"
      fill="none"
      className={className}
      style={style}
      aria-hidden
    >
      <path
        d="M3 9H15M15 9L10 4M15 9L10 14"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
