/**
 * Cookie consent persistence — adapted from the archive site banner.
 * Choice lives in `furnishes-cookie-consent` (1 year, SameSite=Lax).
 */

type ConsentChoice = {
  essential: true;
  analytics: boolean;
  marketing: boolean;
  /** ISO timestamp when choice was recorded */
  recordedAt: string;
};

const COOKIE_CONSENT_NAME = "furnishes-cookie-consent";
const COOKIE_CONSENT_MAX_AGE_DAYS = 365;

function isConsentChoice(value: unknown): value is ConsentChoice {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    v.essential === true &&
    typeof v.analytics === "boolean" &&
    typeof v.marketing === "boolean" &&
    typeof v.recordedAt === "string"
  );
}

export function parseCookieConsent(
  raw: string | null | undefined,
): ConsentChoice | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(decodeURIComponent(raw));
    return isConsentChoice(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function serializeCookieConsent(
  choice: Omit<ConsentChoice, "recordedAt">,
  recordedAt = new Date().toISOString(),
): string {
  const value: ConsentChoice = { ...choice, recordedAt };
  return encodeURIComponent(JSON.stringify(value));
}

export function getCookieConsent(): ConsentChoice | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp(`${COOKIE_CONSENT_NAME}=([^;]+)`),
  );
  return parseCookieConsent(match?.[1]);
}

export function setCookieConsent(
  choice: Omit<ConsentChoice, "recordedAt">,
): void {
  const maxAge = COOKIE_CONSENT_MAX_AGE_DAYS * 24 * 60 * 60;
  document.cookie = `${COOKIE_CONSENT_NAME}=${serializeCookieConsent(choice)};path=/;max-age=${maxAge};SameSite=Lax`;
}
