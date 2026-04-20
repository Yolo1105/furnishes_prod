/** Shared animation presets (matches furnishes_v2/app/lib/animations.ts). */

export const defaultTransition = { duration: 0.6, ease: "easeOut" as const };

export const expandTransitionQuick = {
  duration: 0.2,
  ease: "easeOut" as const,
};

const expandTransitionInternal = { duration: 0.25, ease: "easeOut" as const };

/** Accordion height animation (includes `transition` for AnimatePresence). */
export const expandCollapse = {
  initial: { height: 0, opacity: 0 },
  animate: { height: "auto", opacity: 1 },
  exit: { height: 0, opacity: 0 },
  transition: expandTransitionInternal,
} as const;

export const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

export const slideFromLeft = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0 },
};

export const slideFromRight = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
};
