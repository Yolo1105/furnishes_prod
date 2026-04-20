import "server-only";

import { serverLog } from "@/lib/server/server-log";

/**
 * One-time startup warnings for production misconfiguration.
 * Called from `instrumentation.ts` (Node runtime only).
 */
export function logProductionConfigWarnings(): void {
  if (process.env.NODE_ENV !== "production") return;

  if (process.env.SUPPORT_MEMORY_FALLBACK === "1") {
    serverLog("warn", "config_support_memory_fallback", {
      fix: "Unset SUPPORT_MEMORY_FALLBACK in real production; use only for emergency/dev.",
    });
  }

  if (process.env.ALLOW_MOCK_AUTH === "1") {
    serverLog("warn", "config_allow_mock_auth", {
      fix: "Unset ALLOW_MOCK_AUTH unless this deploy is demo/staging-only.",
    });
  } else if (process.env.NEXT_PUBLIC_MOCK_AUTH === "1") {
    serverLog("warn", "config_next_public_mock_ui", {
      fix: "NEXT_PUBLIC_MOCK_AUTH is UI-only. For server mock auth set ALLOW_MOCK_AUTH=1.",
    });
  }

  const hasUpstash =
    !!process.env.UPSTASH_REDIS_REST_URL?.trim() &&
    !!process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!hasUpstash) {
    serverLog("warn", "config_upstash_missing", {
      fix: "Set UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN for cross-instance rate limits.",
    });
  }
}
