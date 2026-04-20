/**
 * Absolute origin for links in emails, webhooks, and API responses.
 *
 * Resolution order:
 *   1. NEXTAUTH_URL, AUTH_URL, or PUBLIC_SITE_URL (first set wins)
 *   2. VERCEL_URL (https://…)
 *   3. Request URL (when `req` is passed)
 *   4. http://localhost:3000 — development only, or production only if
 *      ALLOW_PUBLIC_ORIGIN_LOCALHOST_FALLBACK=1 (emergency / miswired proxy).
 */

const LOCAL_FALLBACK = "http://localhost:3000";

function explicitOriginFromEnv(): string | null {
  for (const key of ["NEXTAUTH_URL", "AUTH_URL", "PUBLIC_SITE_URL"] as const) {
    const v = process.env[key]?.trim();
    if (v) return v.replace(/\/$/, "");
  }
  return null;
}

export function getPublicOrigin(req?: Request): string {
  const explicit = explicitOriginFromEnv();
  if (explicit) return explicit;

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    const host = vercel.startsWith("http") ? vercel : `https://${vercel}`;
    return host.replace(/\/$/, "");
  }

  if (req) {
    try {
      const u = new URL(req.url);
      return `${u.protocol}//${u.host}`;
    } catch {
      // ignore
    }
  }

  if (process.env.NODE_ENV === "production") {
    if (process.env.ALLOW_PUBLIC_ORIGIN_LOCALHOST_FALLBACK === "1") {
      console.error(
        "[public-origin] No public URL env — using localhost (ALLOW_PUBLIC_ORIGIN_LOCALHOST_FALLBACK=1). Fix NEXTAUTH_URL / AUTH_URL / PUBLIC_SITE_URL / VERCEL_URL.",
      );
      return LOCAL_FALLBACK;
    }
    throw new Error(
      "Production requires NEXTAUTH_URL, AUTH_URL, PUBLIC_SITE_URL, VERCEL_URL, or a request URL for getPublicOrigin(req).",
    );
  }

  return LOCAL_FALLBACK;
}
