import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { randomBytes, createHash } from "crypto";
import { prisma } from "@/lib/db/prisma";
import { apiError } from "@/lib/api/error";
import { strictRateLimit, rateLimitError, AUTH_LIMITS } from "@/lib/rate-limit";
import { clientIdentity } from "@/lib/api/identity";
import { getPublicOrigin } from "@/lib/eva/core/public-origin";

const ForgotSchema = z.object({
  email: z.string().email().toLowerCase(),
});

/**
 * POST /api/auth/forgot
 *   body: { email }
 *
 * - Rate limited: 3 per hour per IP
 * - Always returns 200 regardless of whether the email is registered —
 *   prevents account enumeration
 * - Generates a PasswordReset row only if a user exists; sends email
 *   only if a row was generated
 *
 * Token lifetime: 30 minutes.
 */
export async function POST(req: NextRequest) {
  try {
    const identity = clientIdentity(req);
    const limit = await strictRateLimit(identity, AUTH_LIMITS.forgot);
    if (!limit.success) {
      return NextResponse.json(rateLimitError(limit), {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil((limit.resetAt - Date.now()) / 1000)),
        },
      });
    }

    const { email } = ForgotSchema.parse(await req.json());
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, name: true },
    });

    // Always succeed — don't leak existence
    if (!user) {
      // Tiny artificial delay to mask branch timing
      await new Promise((r) => setTimeout(r, 50));
      return NextResponse.json({ ok: true });
    }

    const rawToken = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 min

    await prisma.passwordReset.create({
      data: { userId: user.id, tokenHash, expiresAt },
    });

    const resetUrl = `${getPublicOrigin(req)}/login/reset/${rawToken}`;
    // Dev-only: log the URL so devs can click through without email setup.
    if (process.env.NODE_ENV !== "production") {
      console.log(`[dev] password reset URL for ${user.email}: ${resetUrl}`);
    }
    // Send the actual email — no-op in dev when RESEND_API_KEY not set,
    // hard failure with Sentry alert in prod when key is missing.
    const { sendPasswordResetEmail } = await import("@/lib/email/send");
    await sendPasswordResetEmail({
      to: user.email!,
      name: user.name,
      resetUrl,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}
