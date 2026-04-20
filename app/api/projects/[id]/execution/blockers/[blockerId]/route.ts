import { z } from "zod";
import { prisma } from "@/lib/eva/db";
import { getSessionUserId } from "@/lib/eva/auth/helpers";
import { apiError, ErrorCodes } from "@/lib/eva/api/error";
import { mapDbErrorToResponse } from "@/lib/eva/api/db-error";
import { requireProjectEditor } from "@/lib/eva/projects/access";
import { appendBlockerResolutionHistory } from "@/lib/eva/projects/execution-history-helpers";
import { appendProjectTimelineEvent } from "@/lib/eva/projects/timeline";

export const dynamic = "force-dynamic";

const PatchSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  description: z.string().max(8000).nullable().optional(),
  notes: z.string().max(8000).nullable().optional(),
  resolutionSuggestion: z.string().max(4000).nullable().optional(),
  resolutionNotes: z.string().max(8000).nullable().optional(),
  status: z.enum(["active", "resolved"]).optional(),
  linkedConstraintKey: z.string().max(200).nullable().optional(),
});

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string; blockerId: string }> },
) {
  try {
    const userId = await getSessionUserId();
    const { id: projectId, blockerId } = await ctx.params;
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
    const existing = await prisma.projectExecutionBlocker.findFirst({
      where: { id: blockerId, projectId },
    });
    if (!existing) {
      return apiError(ErrorCodes.NOT_FOUND, "Blocker not found", 404);
    }

    const now = new Date();
    const resolving = d.status === "resolved" && existing.status !== "resolved";
    const reopening = d.status === "active" && existing.status === "resolved";

    const blocker = await prisma.projectExecutionBlocker.update({
      where: { id: blockerId },
      data: {
        ...(d.title !== undefined ? { title: d.title } : {}),
        ...(d.description !== undefined ? { description: d.description } : {}),
        ...(d.notes !== undefined ? { notes: d.notes } : {}),
        ...(d.resolutionSuggestion !== undefined
          ? { resolutionSuggestion: d.resolutionSuggestion }
          : {}),
        ...(d.resolutionNotes !== undefined
          ? { resolutionNotes: d.resolutionNotes }
          : {}),
        ...(d.status !== undefined ? { status: d.status } : {}),
        ...(d.linkedConstraintKey !== undefined
          ? { linkedConstraintKey: d.linkedConstraintKey }
          : {}),
        ...(resolving ? { resolvedAt: now } : {}),
        ...(reopening ? { resolvedAt: null } : {}),
      },
    });

    if (resolving) {
      await appendBlockerResolutionHistory(prisma, projectId, {
        blockerId,
        summary: d.resolutionNotes?.trim() || `Resolved: ${blocker.title}`,
      });
      await appendProjectTimelineEvent(prisma, {
        projectId,
        actorUserId: userId,
        kind: "blocker_resolved",
        label: `Execution blocker resolved: ${blocker.title}`,
        metadata: { blockerId },
      });
    }

    return Response.json({ blocker });
  } catch (e) {
    return mapDbErrorToResponse(e, "api_project_execution_blocker_patch");
  }
}
