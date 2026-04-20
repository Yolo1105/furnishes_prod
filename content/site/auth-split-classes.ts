/**
 * Auth split layouts (login / signup / forgot): fixed chrome is header-only
 * (`--header-bar-height`). The grid is locked to `100dvh` with `overflow-hidden`
 * so the page does not scroll; the poster extends under the header via an inner
 * absolutely positioned cover (see `authPosterAbsoluteCover`) instead of inflating
 * min-height with `100dvh + header` (which caused a ~header-tall body scroll).
 */
export const authSplitGridRoot =
  "grid h-dvh min-h-0 w-full max-h-dvh overflow-hidden grid-cols-1 md:grid-cols-[1.1fr_1fr]";

/** Left column shell — fills one grid row (`h-dvh`) without extra min-height. */
export const authPosterAsideShell =
  "relative hidden h-full min-h-0 overflow-hidden md:block";

/**
 * Absolutely positions poster + overlays so the image meets the viewport top on
 * `md` while the grid row stays exactly `100dvh` (no document overflow).
 */
export const authPosterAbsoluteCover =
  "absolute inset-x-0 bottom-0 md:-top-[var(--header-bar-height)]";

export const authFormSectionClearHeader =
  "min-h-0 overflow-y-auto pt-[var(--header-bar-height)]";
