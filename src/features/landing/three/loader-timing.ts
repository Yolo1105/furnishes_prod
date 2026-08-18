/** Loader clock — kept off the Three.js module so landing chrome can import it. */
export const LOADER_TIMING = {
  minMs: 6000,
  fallbackMs: 6500,
  dropMs: 720,
  dwellMs: 750,
  /**
   * Exit hop→collapse window (must cover lead + hop + collapse + a short tail).
   * Kept shorter than the reference 1000ms so the swallow reads as a clear beat.
   */
  exitMs: 700,
  /** Pause after breath before furniture starts hopping. */
  exitLeadMs: 80,
  /** Up-spring duration before pieces rush the hole. */
  exitHopMs: 180,
  /** Collapse / swallow duration. */
  exitCollapseMs: 320,
  /** Peak hop height (world units) — taller = more readable. */
  exitHopHeight: 0.95,
  /** Crossfade duration after the hero has painted under the cover. */
  revealMs: 1400,
  /** If the hero never signals ready, arm the crossfade anyway. */
  heroReadyFallbackMs: 1200,
  stallForceMs: 9000,
  stallGoneMs: 12000,
} as const;
