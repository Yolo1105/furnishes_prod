import { z } from "zod";
import {
  ProjectApprovalDecisionStatus,
  ProjectApprovalTargetType,
  ProjectEventType,
} from "@prisma/client";
import { prisma } from "@/lib/eva/db";
import { getSessionUserId } from "@/lib/eva/auth/helpers";
import { apiError, ErrorCodes } from "@/lib/eva/api/error";
import { mapDbErrorToResponse } from "@/lib/eva/api/db-error";
import { requireProjectViewer } from "@/lib/eva/projects/access";
import { appendProjectTimelineEvent } from "@/lib/eva/projects/timeline";

export const dynamic = "force-dynamic";

const UpsertSchema = z.object({
  targetType: z.nativeEnum(ProjectApprovalTargetType),
  targetId: z.string().max(200).default(""),
  status: z.nativeEnum(ProjectApprovalDecisionStatus),
  note: z.string().max(2000).nullable().optional(),
});

export async function GET(
  _req: Request,
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

    const rows = await prisma.projectApproval.findMany({
      where: { projectId },
      orderBy: { updatedAt: "desc" },
      take: 48,
    });
    return Response.json({ approvals: rows });
  } catch (e) {
    return mapDbErrorToResponse(e, "api_project_approvals_get");
  }
}

/** Request or record a decision on a milestone (all collaborators with project access). */
export async function POST(
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

    const body = await req.json();
    const parsed = UpsertSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(
        ErrorCodes.VALIDATION_ERROR,
        "Invalid body",
        400,
        parsed.error.flatten(),
      );
    }

    const d = parsed.data;
    const decided =
      d.status === ProjectApprovalDecisionStatus.approved ||
      d.status === ProjectApprovalDecisionStatus.rejected;

    const row = await prisma.projectApproval.upsert({
      where: {
        projectId_targetType_targetId: {
          projectId,
          targetType: d.targetType,
          targetId: d.targetId,
        },
      },
      create: {
        projectId,
        targetType: d.targetType,
        targetId: d.targetId,
        status: d.status,
        note: d.note ?? null,
        createdByUserId: userId,
        decidedByUserId: decided ? userId : null,
        decidedAt: decided ? new Date() : null,
      },
      update: {
        status: d.status,
        note: d.note ?? undefined,
        decidedByUserId: decided ? userId : null,
        decidedAt: decided ? new Date() : null,
      },
    });

    const approvalEventType =
      d.status === ProjectApprovalDecisionStatus.pending
        ? ProjectEventType.approval_requested
        : d.status === ProjectApprovalDecisionStatus.approved
          ? ProjectEventType.approval_granted
          : d.status === ProjectApprovalDecisionStatus.rejected
            ? ProjectEventType.approval_rejected
            : ProjectEventType.approval_updated;

    await appendProjectTimelineEvent(prisma, {
      projectId,
      actorUserId: userId,
      kind: "approval_updated",
      eventType: approvalEventType,
      targetType: d.targetType,
      targetId: d.targetId,
      label: `Approval ${d.targetType}: ${d.status}`,
      metadata: {
        targetType: d.targetType,
        targetId: d.targetId,
        status: d.status,
      },
    });

    return Response.json({ approval: row });
  } catch (e) {
    return mapDbErrorToResponse(e, "api_project_approvals_post");
  }
}
