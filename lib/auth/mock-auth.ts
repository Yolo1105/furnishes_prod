/**
 * Mock auth (`furnishes-mock-auth=1` cookie) — middleware, layouts, server actions.
 *
 * **Server never reads `NEXT_PUBLIC_*` for auth.** Only `ALLOW_MOCK_AUTH=1` enables
 * mock auth when you need it (including non-production if you want an explicit flag).
 *
 * **Client / UI:** use {@link isMockAuthUiOffered} for demo buttons / cookie attempts.
 */

/** Server-side: whether mock auth is allowed. Never inspects NEXT_PUBLIC_MOCK_AUTH. */
export function isMockAuthEnabled(): boolean {
  if (process.env.ALLOW_MOCK_AUTH === "1") return true;
  if (process.env.NODE_ENV !== "production") return true;
  return false;
}

/**
 * Client-safe: whether to show mock/demo login affordances and attempt setting
 * the mock cookie. Does **not** grant server trust — {@link isMockAuthEnabled}
 * decides that separately.
 */
export function isMockAuthUiOffered(): boolean {
  if (process.env.NODE_ENV !== "production") return true;
  return process.env.NEXT_PUBLIC_MOCK_AUTH === "1";
}
