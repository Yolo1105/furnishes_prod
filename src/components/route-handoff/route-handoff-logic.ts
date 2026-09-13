/** Hero-band orange — same as landing html/body paint. */
export const LANDING_HANDOFF_BG = "#e83200";
/** Quiz document paint. */
export const QUIZ_HANDOFF_BG = "#1a1714";
/** Account / auth / legal paper. */
export const PEACH_HANDOFF_BG = "#fff2e5";
/** Canvas playground cream. */
export const CANVAS_HANDOFF_BG = "#fff4e3";
/** Shared conversation page. */
const SHARED_HANDOFF_BG = "#f7f4ef";

const AUTH_PATHS = new Set([
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
]);

export type RouteSurface =
  "landing" | "quiz" | "account" | "canvas" | "auth" | "shared" | "public";

function routeSurface(pathname: string): RouteSurface {
  if (pathname === "/") return "landing";
  if (pathname === "/quiz" || pathname.startsWith("/quiz/")) return "quiz";
  if (pathname.startsWith("/account/canvas")) return "canvas";
  if (pathname.startsWith("/account")) return "account";
  if (AUTH_PATHS.has(pathname)) return "auth";
  if (pathname.startsWith("/shared")) return "shared";
  return "public";
}

function surfaceColor(pathname: string) {
  switch (routeSurface(pathname)) {
    case "landing":
      return LANDING_HANDOFF_BG;
    case "quiz":
      return QUIZ_HANDOFF_BG;
    case "canvas":
      return CANVAS_HANDOFF_BG;
    case "shared":
      return SHARED_HANDOFF_BG;
    default:
      return PEACH_HANDOFF_BG;
  }
}

/** Cover stays on the origin color when going home so landing orange never fills first. */
export function handoffCoverColor(toPathname: string, fromPathname?: string) {
  if (fromPathname && routeSurface(toPathname) === "landing") {
    return surfaceColor(fromPathname);
  }
  return surfaceColor(toPathname);
}

export function isAuthPath(pathname: string) {
  return AUTH_PATHS.has(pathname);
}

/** Clear auth scroll locks left on html/body when leaving /login. */
export function clearAuthScrollLock() {
  if (typeof document === "undefined") return;
  document.documentElement.style.overflow = "";
  document.body.style.overflow = "";
}

function isApiPath(pathname: string) {
  return pathname === "/api" || pathname.startsWith("/api/");
}

/**
 * Full-screen cover for any in-app URL change that swaps a page surface.
 * Account↔account (except canvas) and auth↔auth keep their own chrome motion.
 */
export function shouldHandoff(from: string, to: string) {
  if (from === to) return false;
  if (isApiPath(from) || isApiPath(to)) return false;
  const fromSurface = routeSurface(from);
  const toSurface = routeSurface(to);
  if (
    fromSurface === toSurface &&
    (fromSurface === "account" || fromSurface === "auth")
  ) {
    return false;
  }
  return true;
}

export function routePaintSelector(pathname: string) {
  const escaped = pathname.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return `[data-route-path="${escaped}"]`;
}

/**
 * Home is painted once the landing stage (hero island or % loader) is in the
 * tree. Waiting for WebGL `hero-ready` leaves the peach cover up for seconds
 * after /login → / — a blank cream page.
 */
export const LANDING_PAINTED_SELECTORS = [
  "#landing-hero-scene",
  '[aria-label="Loading Furnishes"]',
  '[data-hero-ready="1"]',
  '[data-renderer-state="webgl"]',
  '[data-renderer-state="fallback"]',
] as const;

export function routePainted(pathname: string) {
  if (typeof document === "undefined") return false;
  if (pathname === "/") {
    return LANDING_PAINTED_SELECTORS.some((selector) =>
      Boolean(document.querySelector(selector)),
    );
  }
  if (isAuthPath(pathname)) {
    return Boolean(
      document.querySelector(
        `${routePaintSelector(pathname)} [data-auth-content-ready]`,
      ),
    );
  }
  return Boolean(document.querySelector(routePaintSelector(pathname)));
}

export function paintDocumentBg(color: string) {
  if (typeof document === "undefined") return;
  document.documentElement.style.backgroundColor = color;
  document.body.style.backgroundColor = color;
}
