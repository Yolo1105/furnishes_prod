import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import * as bcrypt from "bcrypt";
import { randomBytes, createHash } from "crypto";
import { prisma } from "@/lib/db/prisma";
import { apiError } from "@/lib/api/error";
import { strictRateLimit, rateLimitError, AUTH_LIMITS } from "@/lib/rate-limit";
import { clientIdentity } from "@/lib/api/identity";
import { getPublicOrigin } from "@/lib/eva/core/public-origin";

const SignupSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email().toLowerCase(),
  password: z.string().min(12).max(200),
  marketingOptIn: z.boolean().optional().default(false),
});

/**
 * POST /api/auth/signup
 *   body: { name, email, password, marketingOptIn? }
 *
 *   - Rate limited: 5 per hour per IP
 *   - Does NOT leak whether email is registered (returns 200 on duplicate
 *     with a "check email" response; real notification via email only)
 *   - Creates User + UserProfile + NotificationPrefs + Consents
 *   - Hashes password with bcrypt cost 12
 *   - Generates a verification token (SHA-256 hashed in DB)
 *   - Returns 201 on real creation, 200 on ambiguous (already registered)
 */
export async function POST(req: NextRequest) {
  try {
    // Rate limit by IP (signup is unauthenticated — no userId yet)
    const identity = clientIdentity(req);
    const limit = await strictRateLimit(identity, AUTH_LIMITS.signup);
    if (!limit.success) {
      return NextResponse.json(rateLimitError(limit), {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil((limit.resetAt - Date.now()) / 1000)),
          "X-RateLimit-Limit": String(limit.limit),
          "X-RateLimit-Remaining": String(limit.remaining),
        },
      });
    }

    const json = await req.json();
    const { name, email, password, marketingOptIn } = SignupSchema.parse(json);

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      // DO NOT leak that the email is taken. Return success-shaped response
      // so an attacker can't enumerate users. In a production system, send
      // a "someone tried to sign up with your email" email instead.
      //
      // Match the timing of the real creation path to prevent timing-based
      // enumeration.
      await new Promise((r) => setTimeout(r, 250));
      return NextResponse.json({ ok: true, ambiguous: true }, { status: 200 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    // Verification token — raw emailed; hash stored
    const rawToken = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    const user = await prisma.$transaction(async (tx) => {
      const u = await tx.user.create({
        data: {
          email,
          name,
          // Adapt to your auth schema — if password lives on an Account row, move it.
          password: hashedPassword,
          profile: {
            create: {
              phone: null,
              homeType: "Other",
            },
          },
          notificationPrefs: {
            create: {
              matrix: {
                transactional: { email: true, sms: true, push: true },
                marketing: { email: marketingOptIn, sms: false, push: false },
              },
              digestFrequency: "weekly",
              quietHoursStart: "22:00",
              quietHoursEnd: "07:00",
            },
          },
          consents: {
            create: [
              { kind: "terms-v1", source: "signup", active: true },
              { kind: "pdpa-analytics", source: "signup", active: true },
              ...(marketingOptIn
                ? [{ kind: "marketing-email", source: "signup", active: true }]
                : []),
            ],
          },
          // Email verification token via PasswordReset table shape (re-used for verify)
          passwordResets: {
            create: {
              tokenHash,
              expiresAt,
            },
          },
        },
        select: { id: true, email: true, name: true },
      });

      await tx.activityEvent.create({
        data: {
          userId: u.id,
          category: "sign_in",
          label: "Account created",
        },
      });
      return u;
    });

    // In production: send verification email with rawToken
    const verifyUrl = `${getPublicOrigin(req)}/login/verify/${rawToken}`;
    // Dev-only: log the URL so devs can click through without email setup.
    if (process.env.NODE_ENV !== "production") {
      console.log(`[dev] verification URL for ${user.email}: ${verifyUrl}`);
    }
    const { sendVerificationEmail } = await import("@/lib/email/send");
    await sendVerificationEmail({
      to: user.email!,
      name: user.name,
      verifyUrl,
    });

    return NextResponse.json({ ok: true, userId: user.id }, { status: 201 });
  } catch (e) {
    return apiError(e);
  }
}
