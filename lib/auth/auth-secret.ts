/**
 * Single source of truth for NextAuth / JWT signing.
 * Production must never start without an explicit secret.
 */
const DEV_FALLBACK =
  "local-dev-fallback-auth-secret-min-32-chars-do-not-use-in-prod!!";

/** Next sets this during `next build` while compiling with NODE_ENV=production. */
const NEXT_PHASE_PRODUCTION_BUILD = "phase-production-build";

/** Satisfies length checks during production build when env secrets are not injected. */
const BUILD_PLACEHOLDER_SECRET =
  "build-only-placeholder-auth-secret-32-chars-min!!";

export function getAuthSecret(): string {
  const fromEnv =
    process.env.AUTH_SECRET?.trim() || process.env.NEXTAUTH_SECRET?.trim();
  if (fromEnv) return fromEnv;

  if (process.env.NEXT_PHASE === NEXT_PHASE_PRODUCTION_BUILD) {
    return BUILD_PLACEHOLDER_SECRET;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "AUTH_SECRET or NEXTAUTH_SECRET must be set in production.",
    );
  }
  return DEV_FALLBACK;
}
