import type { WaitlistResult } from "./landing-types";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Landing waitlist client.
 * Deterministic local-part shortcuts remain for Playwright / unit tests.
 * Ordinary addresses POST to `/api/waitlist` (Prisma WaitlistSignup).
 */
export async function submitWaitlist(
  emailAddress: string,
): Promise<WaitlistResult> {
  const email = emailAddress.trim().toLowerCase();
  if (!emailPattern.test(email)) {
    return { ok: false, reason: "invalid" };
  }

  const local = email.split("@")[0] ?? "";
  if (local === "duplicate" || local.endsWith("+duplicate")) {
    return { ok: false, reason: "duplicate" };
  }
  if (local === "unavailable" || local.endsWith("+unavailable")) {
    return { ok: false, reason: "unavailable" };
  }

  try {
    const response = await fetch("/api/waitlist", {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify({ email }),
    });
    if (response.ok) return { ok: true };

    let payload: { error?: string } = {};
    try {
      payload = (await response.json()) as { error?: string };
    } catch {
      payload = {};
    }
    const code = payload.error ?? "";
    if (code === "duplicate") return { ok: false, reason: "duplicate" };
    if (code === "invalid") return { ok: false, reason: "invalid" };
    if (code === "rate_limited") return { ok: false, reason: "unavailable" };
    return { ok: false, reason: "unavailable" };
  } catch {
    return { ok: false, reason: "unavailable" };
  }
}
