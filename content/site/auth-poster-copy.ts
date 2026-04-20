import type { CSSProperties } from "react";

/**
 * Poster copy on auth split pages — align with `LandingHeroCopy`: cream (`--background`)
 * on imagery plus the same shadow stacks used on the home hero for legibility.
 */
export const authPosterKickerSx: CSSProperties = {
  color: "var(--background)",
  textShadow: "0 1px 2px rgba(0, 0, 0, 0.85), 0 2px 6px rgba(0, 0, 0, 0.65)",
  opacity: 0.95,
};

export const authPosterHeadlineSx: CSSProperties = {
  color: "var(--background)",
  textShadow:
    "0 1px 2px rgba(0, 0, 0, 0.9), 0 2px 8px rgba(0, 0, 0, 0.75), 0 4px 20px rgba(0, 0, 0, 0.55)",
};

export const authPosterBodySx: CSSProperties = {
  color: "var(--background)",
  textShadow: "0 1px 2px rgba(0, 0, 0, 0.85), 0 2px 8px rgba(0, 0, 0, 0.65)",
  opacity: 0.92,
};
