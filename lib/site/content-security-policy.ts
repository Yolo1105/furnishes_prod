/**
 * Single source of truth for production CSP — applied only from `next.config.ts`
 * (do not set Content-Security-Policy in middleware).
 *
 * - Tighten `connect-src` over time (env-specific host lists) — `https:` + `wss:`
 *   remain so OpenAI, OpenRouter, Fal, R2 public URLs, and OAuth flows work
 *   without per-tenant deploys.
 * - Remove `'unsafe-eval'` when the bundle no longer requires it (Next/script nonces).
 */
export const productionContentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
  "object-src 'none'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  [
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "https://js.stripe.com",
    "https://vercel.live",
  ].join(" "),
  "connect-src 'self' https: wss:",
  [
    "frame-src 'self'",
    "https://js.stripe.com",
    "https://hooks.stripe.com",
    "https://accounts.google.com",
  ].join(" "),
  "worker-src 'self' blob:",
  "upgrade-insecure-requests",
].join("; ");
