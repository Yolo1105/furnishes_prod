import { prisma } from "@/lib/eva/db";
import { getSessionUserId } from "@/lib/eva/auth/helpers";
import { apiError, ErrorCodes } from "@/lib/eva/api/error";
import { mapDbErrorToResponse } from "@/lib/eva/api/db-error";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await getSessionUserId();
    if (!userId) {
      return apiError(ErrorCodes.UNAUTHORIZED, "Sign in required", 401);
    }
    const { id } = await ctx.params;
    const json: unknown = await req.json().catch(() => null);
    const read =
      typeof json === "object" &&
      json !== null &&
      "read" in json &&
      (json as { read?: unknown }).read === true;

    if (!read) {
      return apiError(
        ErrorCodes.VALIDATION_ERROR,
        "Expected { read: true }",
        400,
      );
    }

    const n = await prisma.inAppNotification.updateMany({
      where: { id, userId },
      data: { readAt: new Date() },
    });
    if (n.count === 0) {
      return apiError(ErrorCodes.NOT_FOUND, "Not found", 404);
    }
    return Response.json({ ok: true });
  } catch (e) {
    return mapDbErrorToResponse(e, "api_notifications_patch");
  }
}
