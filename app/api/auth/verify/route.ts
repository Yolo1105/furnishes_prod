import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createHash } from "crypto";
import { prisma } from "@/lib/db/prisma";
import { apiError } from "@/lib/api/error";

const VerifySchema = z.object({
  token: z.string().length(64),
});

/**
 * POST /api/auth/verify
 *   body: { token }
 *
 *   Consumes an email verification token (re-using the PasswordReset
 *   model — in production, move to a dedicated EmailVerification model if
 *   you want distinct lifecycles).
 */
export async function POST(req: NextRequest) {
  try {
    const { token } = VerifySchema.parse(await req.json());
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

    await prisma.$transaction([
      prisma.user.update({
        where: { id: row.userId },
        data: { emailVerified: new Date() },
      }),
      prisma.passwordReset.update({
        where: { id: row.id },
        data: { consumedAt: new Date() },
      }),
      prisma.activityEvent.create({
        data: {
          userId: row.userId,
          category: "profile",
          label: "Email verified",
        },
      }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}
