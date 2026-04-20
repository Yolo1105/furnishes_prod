import { prisma } from "@/lib/eva/db";
import { getSessionUserId } from "@/lib/eva/auth/helpers";
import { apiError, ErrorCodes } from "@/lib/eva/api/error";
import { mapDbErrorToResponse } from "@/lib/eva/api/db-error";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const userId = await getSessionUserId();
    if (!userId) {
      return apiError(ErrorCodes.UNAUTHORIZED, "Sign in required", 401);
    }
    const take = Math.min(
      80,
      Math.max(1, Number(new URL(req.url).searchParams.get("take")) || 40),
    );
    const rows = await prisma.inAppNotification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take,
      include: {
        project: { select: { id: true, title: true } },
      },
    });
    return Response.json({
      notifications: rows.map((n) => ({
        id: n.id,
        projectId: n.projectId,
        projectTitle: n.project?.title ?? null,
        category: n.category,
        title: n.title,
        body: n.body,
        readAt: n.readAt?.toISOString() ?? null,
        createdAt: n.createdAt.toISOString(),
        sourceTimelineEventId: n.sourceTimelineEventId,
      })),
    });
  } catch (e) {
    return mapDbErrorToResponse(e, "api_notifications_get");
  }
}
