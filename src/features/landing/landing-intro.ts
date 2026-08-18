/**
 * Landing % loader — show once per browser, then skip on later visits
 * (including return from Account Studio). Cookie so SSR + client agree
 * (avoids hydration mismatch). Does not skip the hero open (small→large).
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
