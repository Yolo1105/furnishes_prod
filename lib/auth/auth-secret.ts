/**
 * Single source of truth for NextAuth / JWT signing.
 * Production must never start without an explicit secret.
 */
const DEV_FALLBACK =
  "local-dev-fallback-auth-secret-min-32-chars-do-not-use-in-prod!!";

export function getAuthSecret(): string {
  const fromEnv =
    process.env.AUTH_SECRET?.trim() || process.env.NEXTAUTH_SECRET?.trim();
  if (fromEnv) return fromEnv;
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "AUTH_SECRET or NEXTAUTH_SECRET must be set in production.",
    );
  }
  return DEV_FALLBACK;
}
