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
  notes: z.string().max(8000).optional().nullable(),
  resolutionSuggestion: z.string().max(4000).optional().nullable(),
  linkedConstraintKey: z.string().max(200).optional().nullable(),
  source: z.enum(["user", "system"]).optional(),
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
    const blockers = await prisma.projectExecutionBlocker.findMany({
      where: { projectId },
      orderBy: { updatedAt: "desc" },
      take: 64,
    });
    return Response.json({ blockers });
  } catch (e) {
    return mapDbErrorToResponse(e, "api_project_execution_blockers_get");
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
    const blocker = await prisma.projectExecutionBlocker.create({
      data: {
        projectId,
        title: d.title,
        description: d.description ?? undefined,
        notes: d.notes ?? undefined,
        resolutionSuggestion: d.resolutionSuggestion ?? undefined,
        linkedConstraintKey: d.linkedConstraintKey ?? undefined,
        source: d.source ?? "user",
      },
    });
    await recordProjectEvent(prisma, {
      projectId,
      actorUserId: userId!,
      eventType: ProjectEventType.blocker_added,
      targetType: "execution_blocker",
      targetId: blocker.id,
      label: `Blocker added: ${blocker.title}`,
    });
    return Response.json({ blocker });
  } catch (e) {
    return mapDbErrorToResponse(e, "api_project_execution_blockers_post");
  }
}
