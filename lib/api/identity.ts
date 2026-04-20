import type { NextRequest } from "next/server";

function identityFromHeaders(get: (name: string) => string | null): string {
  const xff = get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return `ip:${first}`;
  }
  const real = get("x-real-ip");
  if (real) return `ip:${real.trim()}`;
  const cf = get("cf-connecting-ip");
  if (cf) return `ip:${cf.trim()}`;
  return "ip:unknown";
}

/**
 * Best-effort client identifier for rate limiting (NextRequest / Route Handlers).
 *
 * This is NOT for security-critical identification — soft abuse gate only.
 */
export function clientIdentity(req: NextRequest): string {
  return identityFromHeaders((name) => req.headers.get(name));
}

/** Same identity derivation for standard `Request` (e.g. `/api/chat`). */
export function clientIdentityFromRequest(req: Request): string {
  return identityFromHeaders((name) => req.headers.get(name));
}
