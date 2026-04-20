import { prisma } from "@/lib/eva/db";
import { getSessionUserId } from "@/lib/eva/auth/helpers";
import { apiError, ErrorCodes } from "@/lib/eva/api/error";
import { mapDbErrorToResponse } from "@/lib/eva/api/db-error";
import { requireProjectViewer } from "@/lib/eva/projects/access";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await getSessionUserId();
    const { id: projectId } = await ctx.params;
    const access = await requireProjectViewer(projectId, userId);
    if (access.error || !access.access) {
      return apiError(
        ErrorCodes.NOT_FOUND,
        access.error ?? "Not found",
        access.status,
      );
    }

    const take = Math.min(
      100,
      Math.max(1, Number(new URL(req.url).searchParams.get("take")) || 40),
    );

    const rows = await prisma.projectTimelineEvent.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      take,
    });

    return Response.json({
      events: rows.map((e) => ({
        id: e.id,
        kind: e.kind,
        eventType: e.eventType,
        targetType: e.targetType,
        targetId: e.targetId,
        summary: e.summary,
        label: e.label,
        metadata: e.metadata,
        createdAt: e.createdAt.toISOString(),
        actorUserId: e.actorUserId,
      })),
    });
  } catch (e) {
    return mapDbErrorToResponse(e, "api_project_timeline_get");
  }
}
