import "server-only";

/**
 * Backend / server-only toggles. Do not mirror here with `NEXT_PUBLIC_*` unless
 * the value is intentionally public (see `lib/site/feature-flags.ts` for UI).
 *
 * Examples:
 * - Commerce APIs: {@link isCommerceBackendEnabled} in `./commerce/server-flags`.
 * - Support in-memory fallback: only when `SUPPORT_MEMORY_FALLBACK=1` in production
 *   (see `lib/site/support/store.ts`). Do **not** set that in real production;
 *   it is for emergency/dev only.
 */
export { isCommerceBackendEnabled } from "./commerce/server-flags";

/** Whether dangerous support in-memory fallback was explicitly enabled. */
export function isSupportMemoryFallbackExplicitlyEnabled(): boolean {
  return process.env.SUPPORT_MEMORY_FALLBACK === "1";
}
