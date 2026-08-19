/**
 * Landing % loader — dropping blocks + drawing line, then the house.
 *
 * Show once per browser, then skip (including return from Account Studio
 * and later localhost refreshes). The “cache” is an explicit seen flag,
 * not HTTP cache: asset cache is a bad first-visit signal (hash busts,
 * hard refresh, prefetch). Cookie so SSR + client agree (no hydration
 * flash of the loader). localStorage is a fallback + migration source.
 * Does not skip the hero open (small→large).
 *
 * Query:
 *   `?intro=skip` — skip loader (and hero open, via LandingEntry)
 *   `?intro=1` / `?intro=play` — replay even if already seen
 */

export const LANDING_INTRO_SEEN_COOKIE = "furnishes-landing-intro-seen";
/** Older localStorage key — migrated into the cookie when present. */
const LANDING_INTRO_SEEN_KEY = LANDING_INTRO_SEEN_COOKIE;

const MAX_AGE_SECONDS = 60 * 60 * 24 * 400; // ~13 months

export function hasSeenLandingIntroCookie(
  raw: string | null | undefined,
): boolean {
  return raw === "1";
}

/** Replay the first-visit 3D loader even when the seen cookie is set. */
export function isLandingIntroReplayQuery(
  raw: string | null | undefined,
): boolean {
  const v = raw?.trim().toLowerCase();
  return v === "1" || v === "play" || v === "force";
}

export function shouldSkipLandingLoader(options: {
  introQuery?: string | null;
  seenCookie?: string | null;
}): boolean {
  if (isLandingIntroReplayQuery(options.introQuery)) return false;
  if (options.introQuery?.trim().toLowerCase() === "skip") return true;
  return hasSeenLandingIntroCookie(options.seenCookie);
}

export function markLandingIntroSeen(): void {
  if (typeof document === "undefined") return;
  try {
    document.cookie = `${LANDING_INTRO_SEEN_COOKIE}=1; Path=/; Max-Age=${MAX_AGE_SECONDS}; SameSite=Lax`;
  } catch {
    /* ignore */
  }
  try {
    window.localStorage.setItem(LANDING_INTRO_SEEN_KEY, "1");
  } catch {
    /* ignore */
  }
}

/** Migrate older localStorage-only flag into the cookie. */
export function migrateLandingIntroSeenFromLocalStorage(): void {
  if (typeof window === "undefined") return;
  try {
    if (window.localStorage.getItem(LANDING_INTRO_SEEN_KEY) === "1") {
      markLandingIntroSeen();
    }
  } catch {
    /* ignore */
  }
}
