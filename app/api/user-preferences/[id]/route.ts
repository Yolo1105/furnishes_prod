import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/auth";
import { ensureOwns } from "@/lib/auth/authorize";
import { apiError } from "@/lib/api/error";
import { PreferencePatchSchema } from "@/lib/validation/schemas";

type Params = { id: string };

/**
 * PATCH /api/user-preferences/[id]
 *   body: PreferencePatch
 *   → update fields on a preference you own.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<Params> },
) {
  try {
    const { id } = await params;
    const { userId } = await requireUser();
    await ensureOwns(userId, "userPreference", id);

    const json = await req.json();
    const patch = PreferencePatchSchema.parse(json);

    const row = await prisma.userPreference.update({
      where: { id },
      data: patch,
    });
    return NextResponse.json({ preference: row });
  } catch (e) {
    return apiError(e);
  }
}

/**
 * DELETE /api/user-preferences/[id]
 *   → permanently remove a preference you own.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<Params> },
) {
  try {
    const { id } = await params;
    const { userId } = await requireUser();
    await ensureOwns(userId, "userPreference", id);

    await prisma.userPreference.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}
