import { z } from "zod";
import { prisma } from "@/lib/eva/db";
import { getSessionUserId } from "@/lib/eva/auth/helpers";
import { apiError, ErrorCodes } from "@/lib/eva/api/error";
import { mapDbErrorToResponse } from "@/lib/eva/api/db-error";
import { requireProjectEditor } from "@/lib/eva/projects/access";
import { ProjectEventType } from "@prisma/client";
import { recordProjectEvent } from "@/lib/eva/projects/project-events";

export const dynamic = "force-dynamic";

const PatchSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  description: z.string().max(8000).nullable().optional(),
  status: z.enum(["open", "in_progress", "done", "cancelled"]).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  linkedBlockerId: z.string().nullable().optional(),
  linkedShortlistItemId: z.string().nullable().optional(),
  linkedConstraintLabel: z.string().max(400).nullable().optional(),
  sourceRecommendationId: z.string().nullable().optional(),
  sortOrder: z.number().int().optional(),
});

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string; taskId: string }> },
) {
  try {
    const userId = await getSessionUserId();
    const { id: projectId, taskId } = await ctx.params;
    const access = await requireProjectEditor(projectId, userId);
    if (access.error || !access.access) {
      return apiError(
        ErrorCodes.NOT_FOUND,
        access.error ?? "Not found",
        access.status,
      );
    }
    const json: unknown = await req.json().catch(() => null);
    const parsed = PatchSchema.safeParse(json);
    if (!parsed.success) {
      return apiError(ErrorCodes.VALIDATION_ERROR, "Invalid body", 400);
    }
    const d = parsed.data;
    const existing = await prisma.projectExecutionTask.findFirst({
      where: { id: taskId, projectId },
    });
    if (!existing) {
      return apiError(ErrorCodes.NOT_FOUND, "Task not found", 404);
    }

    const task = await prisma.projectExecutionTask.update({
      where: { id: taskId },
      data: {
        ...(d.title !== undefined ? { title: d.title } : {}),
        ...(d.description !== undefined ? { description: d.description } : {}),
        ...(d.status !== undefined ? { status: d.status } : {}),
        ...(d.priority !== undefined ? { priority: d.priority } : {}),
        ...(d.linkedBlockerId !== undefined
          ? { linkedBlockerId: d.linkedBlockerId }
          : {}),
        ...(d.linkedShortlistItemId !== undefined
          ? { linkedShortlistItemId: d.linkedShortlistItemId }
          : {}),
        ...(d.linkedConstraintLabel !== undefined
          ? { linkedConstraintLabel: d.linkedConstraintLabel }
          : {}),
        ...(d.sourceRecommendationId !== undefined
          ? { sourceRecommendationId: d.sourceRecommendationId }
          : {}),
        ...(d.sortOrder !== undefined ? { sortOrder: d.sortOrder } : {}),
      },
    });
    await recordProjectEvent(prisma, {
      projectId,
      actorUserId: userId!,
      eventType: ProjectEventType.execution_task_updated,
      targetType: "execution_task",
      targetId: taskId,
      label: `Task updated: ${task.title} (${task.status})`,
      metadata: { status: task.status, priority: task.priority },
    });
    return Response.json({ task });
  } catch (e) {
    return mapDbErrorToResponse(e, "api_project_execution_task_patch");
  }
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string; taskId: string }> },
) {
  try {
    const userId = await getSessionUserId();
    const { id: projectId, taskId } = await ctx.params;
    const access = await requireProjectEditor(projectId, userId);
    if (access.error || !access.access) {
      return apiError(
        ErrorCodes.NOT_FOUND,
        access.error ?? "Not found",
        access.status,
      );
    }
    const n = await prisma.projectExecutionTask.deleteMany({
      where: { id: taskId, projectId },
    });
    if (n.count === 0) {
      return apiError(ErrorCodes.NOT_FOUND, "Task not found", 404);
    }
    return Response.json({ ok: true });
  } catch (e) {
    return mapDbErrorToResponse(e, "api_project_execution_task_delete");
  }
}
