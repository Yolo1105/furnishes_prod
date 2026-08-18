import { jsonError, requireApiSession } from "@/server/http";
import { isCanvasPlaygroundEnabled } from "./canvas-playground-enabled";

/**
 * Guards playground HTTP routes. Requires an Account session cookie
 * (same as `/api/account/*`) and rejects when Canvas is disabled.
 */
export async function requirePlaygroundApiSession(options?: {
  allowUnverified?: boolean;
}) {
  if (!isCanvasPlaygroundEnabled()) {
    return {
      session: null,
      response: jsonError(
        503,
        "disabled",
        "Canvas playground is disabled on this server.",
      ),
    } as const;
  }
  return requireApiSession(options);
}

/** Per-user rate-limit key for playground AI routes. */
export function playgroundRateLimitKey(userId: string): string {
  return `user:${userId}`;
}
