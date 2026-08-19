/**
 * Landing % loader — dropping blocks + drawing line, then the house.
 *
 * Show once per tab visit. Refresh and in-site navigation skip it while this
 * tab is still open (sessionStorage). Close the tab/window and it plays again.
 * Does not skip the hero open (small→large).
 *
 * Query (E2E / debug only, never linked in the product UI):
 *   `?intro=skip` — skip loader (and hero open, via LandingEntry)
 *   `?intro=1` / `?intro=play` — replay even if already seen this tab
 */

/** Storage key for this tab, and the legacy cookie name to expire. */
export const LANDING_INTRO_SEEN_KEY = "furnishes-landing-intro-seen";

export function hasSeenLandingIntroThisVisit(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(LANDING_INTRO_SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

/** Replay the first-visit 3D loader even when this tab already saw it. */
export function isLandingIntroReplayQuery(
  raw: string | null | undefined,
): boolean {
  const v = raw?.trim().toLowerCase();
  return v === "1" || v === "play" || v === "force";
}

/** SSR / E2E query only. Per-tab skip is sessionStorage on the client. */
export function shouldSkipLandingLoader(options: {
  introQuery?: string | null;
}): boolean {
  if (isLandingIntroReplayQuery(options.introQuery)) return false;
  return options.introQuery?.trim().toLowerCase() === "skip";
}

export function markLandingIntroSeen(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(LANDING_INTRO_SEEN_KEY, "1");
  } catch {
    /* private mode */
  }
}

/** Drop durable flags from earlier builds so closing the tab can replay. */
export function forgetPersistentIntroSeen(): void {
  if (typeof document === "undefined") return;
  const expire = `${LANDING_INTRO_SEEN_KEY}=; Path=/; Max-Age=0`;
  try {
    document.cookie = expire;
    document.cookie = `${expire}; Secure`;
  } catch {
    /* ignore */
  }
  try {
    window.localStorage.removeItem(LANDING_INTRO_SEEN_KEY);
  } catch {
    /* ignore */
  }
}
