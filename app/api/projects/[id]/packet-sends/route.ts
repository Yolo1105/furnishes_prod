import { z } from "zod";
import {
  ProjectEventType,
  ProjectPacketDeliveryChannel,
  ProjectPacketKind,
} from "@prisma/client";
import { prisma } from "@/lib/eva/db";
import { getSessionUserId } from "@/lib/eva/auth/helpers";
import { apiError, ErrorCodes } from "@/lib/eva/api/error";
import { mapDbErrorToResponse } from "@/lib/eva/api/db-error";
import {
  requireProjectEditor,
  requireProjectViewer,
} from "@/lib/eva/projects/access";
import { buildProjectSummary } from "@/lib/eva/projects/build-project-summary";
import { recordProjectEvent } from "@/lib/eva/projects/project-events";
import { PROJECT_EVENT_AUDIT_LABEL } from "@/lib/eva/projects/summary-constants";

export const dynamic = "force-dynamic";

const PostSchema = z.object({
  kind: z.nativeEnum(ProjectPacketKind),
  channel: z.nativeEnum(ProjectPacketDeliveryChannel),
  recipientEmail: z.string().email().max(320).optional().nullable(),
  stateSnapshot: z.record(z.string(), z.any()).optional(),
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
    const rows = await prisma.projectPacketSend.findMany({
      where: { projectId },
      orderBy: { sentAt: "desc" },
      take: 48,
    });
    return Response.json({
      sends: rows.map((r) => ({
        id: r.id,
        kind: r.kind,
        channel: r.channel,
        recipientEmail: r.recipientEmail,
        sentByUserId: r.sentByUserId,
        sentAt: r.sentAt.toISOString(),
        stateSnapshot: r.stateSnapshot,
      })),
    });
  } catch (e) {
    return mapDbErrorToResponse(e, "api_project_packet_sends_get");
  }
}

/** Record a real handoff / packet send (download, email, or link) with persisted snapshot. */
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
    const parsed = PostSchema.safeParse(json);
    if (!parsed.success) {
      return apiError(ErrorCodes.VALIDATION_ERROR, "Invalid body", 400);
    }
    const d = parsed.data;

    const summary = await buildProjectSummary(prisma, projectId);
    if (!summary) {
      return apiError(ErrorCodes.NOT_FOUND, "Project not found", 404);
    }
    const stateSnapshot =
      d.stateSnapshot ??
      ({
        recordedAt: new Date().toISOString(),
        operationalPhase: summary.externalExecution.phase,
        handoffClearForExport: summary.collaboration.handoffClearForExport,
        shortlistIds: summary.shortlist.map((s) => s.id),
        executionLifecycle: summary.execution.lifecycle,
      } as Record<string, unknown>);

    const row = await prisma.projectPacketSend.create({
      data: {
        projectId,
        kind: d.kind,
        channel: d.channel,
        recipientEmail: d.recipientEmail ?? undefined,
        sentByUserId: userId!,
        stateSnapshot: stateSnapshot as object,
      },
    });

    await recordProjectEvent(prisma, {
      projectId,
      actorUserId: userId!,
      eventType: ProjectEventType.handoff_sent,
      targetType: "packet_send",
      targetId: row.id,
      label: PROJECT_EVENT_AUDIT_LABEL.packetHandoffRecorded(d.kind, d.channel),
      metadata: {
        packetSendId: row.id,
        kind: d.kind,
        channel: d.channel,
      },
    });

    return Response.json({
      send: {
        id: row.id,
        kind: row.kind,
        channel: row.channel,
        sentAt: row.sentAt.toISOString(),
      },
    });
  } catch (e) {
    return mapDbErrorToResponse(e, "api_project_packet_sends_post");
  }
}
