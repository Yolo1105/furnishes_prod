import { prisma } from "@/server/db";
import { consumeRateLimit } from "@/server/auth/rate-limit";
import { err, ok, type ServiceResult } from "@/server/result";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type WaitlistError = "invalid" | "duplicate" | "unavailable" | "rate_limited";

/**
 * Persist a waitlist signup. Unique email → duplicate. Rate-limited per IP key.
 */
export async function joinWaitlist(input: {
  email: string;
  ipKey?: string | null;
}): Promise<ServiceResult<{ joined: true }, WaitlistError>> {
  const email = input.email.trim().toLowerCase();
  if (!emailPattern.test(email)) {
    return err("invalid", "Enter a valid email address.");
  }

  const rateKey = `waitlist:${input.ipKey?.trim() || "anon"}`;
  const rate = await consumeRateLimit(rateKey, 10, 60 * 60 * 1000);
  if (!rate.allowed) {
    return err("rate_limited", "Too many waitlist attempts. Try again later.");
  }

  try {
    await prisma.waitlistSignup.create({ data: { email } });
    return ok({ joined: true });
  } catch (error: unknown) {
    const code =
      typeof error === "object" &&
      error &&
      "code" in error &&
      typeof (error as { code?: unknown }).code === "string"
        ? (error as { code: string }).code
        : null;
    if (code === "P2002") {
      return err("duplicate", "That email is already on the waitlist.");
    }
    console.error("[waitlist] persist failed", {
      reason: error instanceof Error ? error.name : "unknown",
    });
    return err("unavailable", "Waitlist is temporarily unavailable.");
  }
}
