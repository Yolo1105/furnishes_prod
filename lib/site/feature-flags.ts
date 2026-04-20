/**
 * Client-safe flags (NEXT_PUBLIC_* only). For server/API gating use
 * `@/lib/site/server-flags` / `@/lib/site/commerce/server-flags` — never rely on
 * public flags alone for payments or sensitive behavior.
 */
export const FEATURE_FLAGS = {
  COMMERCE_ENABLED: process.env.NEXT_PUBLIC_COMMERCE_ENABLED === "1",
} as const;
