import "server-only";

/**
 * Whether commerce **API** routes (checkout intent, etc.) may run.
 *
 * - `COMMERCE_BACKEND_ENABLED=1` → on (explicit).
 * - `COMMERCE_BACKEND_ENABLED=0` → off (even if NEXT_PUBLIC_COMMERCE_ENABLED=1).
 * - Unset → legacy: follows `NEXT_PUBLIC_COMMERCE_ENABLED=1` only.
 *
 * UI/nav can still use {@link FEATURE_FLAGS} from `lib/site/feature-flags.ts`;
 * for production, set `COMMERCE_BACKEND_ENABLED` explicitly so the public flag
 * cannot alone enable payments.
 */
export function isCommerceBackendEnabled(): boolean {
  const raw = process.env.COMMERCE_BACKEND_ENABLED?.trim().toLowerCase();
  if (raw === "0" || raw === "false" || raw === "no") return false;
  if (raw === "1" || raw === "true" || raw === "yes") return true;
  return process.env.NEXT_PUBLIC_COMMERCE_ENABLED === "1";
}
