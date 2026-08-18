import { Prisma } from "@prisma/client";
import { envInt } from "@/server/env";
import { prisma } from "@/server/db";

export function authRateLimitWindowMs(): number {
  return envInt("AUTH_RATE_LIMIT_WINDOW_MS", 15 * 60 * 1000);
}

export function authLoginMaxAttempts(): number {
  return envInt("AUTH_LOGIN_MAX_ATTEMPTS", 10);
}

export function authSignupMaxAttempts(): number {
  return envInt("AUTH_SIGNUP_MAX_ATTEMPTS", 10);
}

export function authForgotMaxAttempts(): number {
  return envInt("AUTH_FORGOT_MAX_ATTEMPTS", 5);
}

export function authResetMaxAttempts(): number {
  return envInt("AUTH_RESET_MAX_ATTEMPTS", 10);
}

export function authVerifyMaxAttempts(): number {
  return envInt("AUTH_VERIFY_MAX_ATTEMPTS", 30);
}

export function authResendVerifyMaxAttempts(): number {
  return envInt("AUTH_RESEND_VERIFY_MAX_ATTEMPTS", 5);
}

export function authDemoMaxAttempts(): number {
  return envInt("AUTH_DEMO_MAX_ATTEMPTS", 20);
}

/**
 * Sliding-window counter stored in AuthRateLimit.
 * One atomic INSERT … ON CONFLICT so concurrent hammering cannot fail open.
 */
export async function consumeRateLimit(
  key: string,
  max = 20,
  windowMs = authRateLimitWindowMs(),
): Promise<{ allowed: boolean; remaining: number }> {
  const cutoff = new Date(Date.now() - windowMs);
  const rows = await prisma.$queryRaw<Array<{ count: number }>>(Prisma.sql`
    INSERT INTO "AuthRateLimit" ("id", "key", "count", "windowStart")
    VALUES (gen_random_uuid()::text, ${key}, 1, NOW())
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "AuthRateLimit"."windowStart" < ${cutoff}
        THEN 1 ELSE "AuthRateLimit"."count" + 1 END,
      "windowStart" = CASE WHEN "AuthRateLimit"."windowStart" < ${cutoff}
        THEN NOW() ELSE "AuthRateLimit"."windowStart" END
    RETURNING "count"
  `);
  const count = rows[0]?.count ?? 1;
  return { allowed: count <= max, remaining: Math.max(0, max - count) };
}
