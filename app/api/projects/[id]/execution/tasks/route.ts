import { z } from "zod";
import { prisma } from "@/lib/eva/db";
import { getSessionUserId } from "@/lib/eva/auth/helpers";
import { apiError, ErrorCodes } from "@/lib/eva/api/error";
import { mapDbErrorToResponse } from "@/lib/eva/api/db-error";
import { requireProjectEditor } from "@/lib/eva/projects/access";
import { ProjectEventType } from "@prisma/client";
import { recordProjectEvent } from "@/lib/eva/projects/project-events";

export const dynamic = "force-dynamic";

const CreateSchema = z.object({
  title: z.string().min(1).max(300),
  description: z.string().max(8000).optional().nullable(),
  status: z.enum(["open", "in_progress", "done", "cancelled"]).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  linkedBlockerId: z.string().optional().nullable(),
  linkedShortlistItemId: z.string().optional().nullable(),
  linkedConstraintLabel: z.string().max(400).optional().nullable(),
  sourceRecommendationId: z.string().optional().nullable(),
  sortOrder: z.number().int().optional(),
});

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await getSessionUserId();
    const { id: projectId } = await ctx.params;
    const access = await requireProjectEditor(projectId, userId);
    if (access.error || !access.access) {
      return apiError(
        ErrorCodes.NOT_FOUND,
        access.error ?? "Not found",
        access.status,
      );
    }
    const tasks = await prisma.projectExecutionTask.findMany({
      where: { projectId },
      orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
      take: 64,
    });
    return Response.json({ tasks });
  } catch (e) {
    return mapDbErrorToResponse(e, "api_project_execution_tasks_get");
  }
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await getSessionUserId();
    const { id: projectId } = await ctx.params;
    const access = await requireProjectEditor(projectId, userId);
    if (access.error || !access.access) {
      return apiError(
        ErrorCodes.NOT_FOUND,
        access.error ?? "Not found",
        access.status,
      );
    }
    const json: unknown = await req.json().catch(() => null);
    const parsed = CreateSchema.safeParse(json);
    if (!parsed.success) {
      return apiError(ErrorCodes.VALIDATION_ERROR, "Invalid body", 400);
    }
    const d = parsed.data;

    if (d.linkedShortlistItemId) {
      const sl = await prisma.shortlistItem.findFirst({
        where: { id: d.linkedShortlistItemId, projectId, userId: userId! },
      });
      if (!sl) {
        return apiError(
          ErrorCodes.VALIDATION_ERROR,
          "Shortlist item not on this project",
          400,
        );
      }
    }
    if (d.linkedBlockerId) {
      const b = await prisma.projectExecutionBlocker.findFirst({
        where: { id: d.linkedBlockerId, projectId },
      });
      if (!b) {
        return apiError(
          ErrorCodes.VALIDATION_ERROR,
          "Blocker not found on this project",
          400,
        );
      }
    }

    const task = await prisma.projectExecutionTask.create({
      data: {
        projectId,
        title: d.title,
        description: d.description ?? undefined,
        status: d.status ?? "open",
        priority: d.priority ?? "medium",
        linkedBlockerId: d.linkedBlockerId ?? undefined,
        linkedShortlistItemId: d.linkedShortlistItemId ?? undefined,
        linkedConstraintLabel: d.linkedConstraintLabel ?? undefined,
        sourceRecommendationId: d.sourceRecommendationId ?? undefined,
        sortOrder: d.sortOrder ?? 0,
      },
    });
    await recordProjectEvent(prisma, {
      projectId,
      actorUserId: userId!,
      eventType: ProjectEventType.execution_task_created,
      targetType: "execution_task",
      targetId: task.id,
      label: `Task created: ${task.title}`,
      metadata: { status: task.status },
    });
    return Response.json({ task });
  } catch (e) {
    return mapDbErrorToResponse(e, "api_project_execution_tasks_post");
  }
}
