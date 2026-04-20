import "server-only";

/**
 * HttpOnly cookie binding anonymous conversations to this browser.
 * Security boundary is cookie possession (same as a session); use `SameSite=Lax`
 * and `Secure` in production. IDs are UUIDs — do not expose conversation APIs
 * without matching `guestSessionId` or signed-in owner (see `requireConversationAccess`).
 */
export const GUEST_SESSION_COOKIE = "furnishes_guest_session";

export function parseGuestSessionFromCookieHeader(
  cookieHeader: string | null,
): string | null {
  if (!cookieHeader) return null;
  const parts = cookieHeader.split(";").map((p) => p.trim());
  for (const p of parts) {
    if (p.startsWith(`${GUEST_SESSION_COOKIE}=`)) {
      const v = p.slice(GUEST_SESSION_COOKIE.length + 1);
      try {
        return decodeURIComponent(v);
      } catch {
        return v || null;
      }
    }
  }
  return null;
}

export function buildGuestSessionSetCookie(value: string): string {
  const maxAge = 60 * 60 * 24 * 400;
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${GUEST_SESSION_COOKIE}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

export function newGuestSessionId(): string {
  return crypto.randomUUID();
}
