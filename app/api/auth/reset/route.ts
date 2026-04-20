import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import * as bcrypt from "bcrypt";
import { createHash } from "crypto";
import { prisma } from "@/lib/db/prisma";
import { apiError } from "@/lib/api/error";
import { strictRateLimit, rateLimitError, AUTH_LIMITS } from "@/lib/rate-limit";
import { clientIdentity } from "@/lib/api/identity";

const ResetSchema = z.object({
  token: z.string().length(64),
  newPassword: z.string().min(12).max(200),
});

/**
 * POST /api/auth/reset
 *   body: { token, newPassword }
 *
 *   - Rate limited: 5 per hour per IP
 *   - 200 on success
 *   - 404 if token not found
 *   - 410 if token expired or already consumed
 *   - Invalidates all other active reset tokens for the user
 *   - Invalidates all existing sessions (session rotation on password change)
 */
export async function POST(req: NextRequest) {
  try {
    const identity = clientIdentity(req);
    const limit = await strictRateLimit(identity, AUTH_LIMITS.reset);
    if (!limit.success) {
      return NextResponse.json(rateLimitError(limit), {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil((limit.resetAt - Date.now()) / 1000)),
        },
      });
    }

    const { token, newPassword } = ResetSchema.parse(await req.json());
    const tokenHash = createHash("sha256").update(token).digest("hex");

    const row = await prisma.passwordReset.findUnique({
      where: { tokenHash },
      select: {
        id: true,
        userId: true,
        expiresAt: true,
        consumedAt: true,
      },
    });
    if (!row) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Token not found" },
        { status: 404 },
      );
    }
    if (row.consumedAt || row.expiresAt.getTime() < Date.now()) {
      return NextResponse.json(
        { error: "GONE", message: "Token expired or already used" },
        { status: 410 },
      );
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: row.userId },
        data: {
          password: hashedPassword,
          sessionVersion: { increment: 1 },
        },
      }),
      prisma.passwordReset.update({
        where: { id: row.id },
        data: { consumedAt: new Date() },
      }),
      // Invalidate all other active resets for this user
      prisma.passwordReset.updateMany({
        where: {
          userId: row.userId,
          consumedAt: null,
          id: { not: row.id },
        },
        data: { consumedAt: new Date() },
      }),
      /*
       * SESSION ROTATION — critical security step.
       * After password reset, all existing sessions (laptop, phone, rogue
       * actor with stolen cookie) must be invalidated. User must re-sign-in
       * everywhere using the new password.
       */
      prisma.session.deleteMany({
        where: { userId: row.userId },
      }),
      prisma.securityEvent.create({
        data: {
          userId: row.userId,
          kind: "password_change",
          ok: true,
          description: "Password reset via email link — all sessions rotated",
        },
      }),
      prisma.activityEvent.create({
        data: {
          userId: row.userId,
          category: "security",
          label: "Password reset",
        },
      }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}
