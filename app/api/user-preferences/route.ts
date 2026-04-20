import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/auth";
import { apiError } from "@/lib/api/error";
import { PreferenceInputSchema } from "@/lib/validation/schemas";

/**
 * GET /api/user-preferences
 *   → list the signed-in user's preferences, newest first.
 */
export async function GET() {
  try {
    const { userId } = await requireUser();
    const rows = await prisma.userPreference.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      include: {
        sourceConversation: { select: { id: true, title: true } },
      },
    });
    return NextResponse.json({ preferences: rows });
  } catch (e) {
    return apiError(e);
  }
}

/**
 * POST /api/user-preferences
 *   body: PreferenceInput
 *   → create a new preference owned by the current user.
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await requireUser();
    const json = await req.json();
    const parsed = PreferenceInputSchema.parse(json);

    const row = await prisma.userPreference.create({
      data: { ...parsed, userId },
    });
    return NextResponse.json({ preference: row }, { status: 201 });
  } catch (e) {
    return apiError(e);
  }
}
