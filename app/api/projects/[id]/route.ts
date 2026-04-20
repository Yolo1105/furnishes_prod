import { z } from "zod";
import { prisma } from "@/lib/eva/db";
import { getSessionUserId } from "@/lib/eva/auth/helpers";
import { apiError, ErrorCodes } from "@/lib/eva/api/error";
import { mapDbErrorToResponse } from "@/lib/eva/api/db-error";
import {
  requireProjectEditor,
  requireProjectViewer,
} from "@/lib/eva/projects/access";
import { getPreferencesAsRecord } from "@/lib/eva/api/helpers";
import { evaluateProjectWorkflow } from "@/lib/eva/design-workflow/evaluate";
import {
  ProjectDecisionContextSchema,
  RecommendationsSnapshotSchema,
} from "@/lib/eva/projects/decision-schemas";
import { Prisma, ProjectExecutionLifecycle } from "@prisma/client";
import type { ProjectStatus } from "@prisma/client";
import { syncExecutionStateAfterContentChange } from "@/lib/eva/projects/execution-fingerprint-sync";
import { buildProjectSummary } from "@/lib/eva/projects/build-project-summary";

export const dynamic = "force-dynamic";

const PatchSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(8000).optional(),
  room: z.string().min(1).max(120).optional(),
  roomType: z.string().max(64).nullable().optional(),
  status: z
    .enum(["planning", "sourcing", "in_progress", "done", "archived"])
    .optional(),
  progress: z.number().int().min(0).max(100).optional(),
  briefSnapshot: z.record(z.string(), z.unknown()).nullable().optional(),
  activeConversationId: z.string().nullable().optional(),
  decisionContext: z.unknown().optional(),
  recommendationsSnapshot: z.unknown().optional(),
  executionNotes: z.string().max(8000).nullable().optional(),
  executionLifecycle: z.nativeEnum(ProjectExecutionLifecycle).optional(),
});

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await getSessionUserId();
    const { id } = await ctx.params;
    const includeSummary =
      new URL(req.url).searchParams.get("includeSummary") === "1";
    const access = await requireProjectViewer(id, userId);
    if (access.error || !access.access) {
      return apiError(
        access.status === 401 ? ErrorCodes.UNAUTHORIZED : ErrorCodes.NOT_FOUND,
        access.error ?? "Not found",
        access.status,
      );
    }
    const p = access.access.project;
    const [
      conversations,
      events,
      fileCounts,
      latestStudioSave,
      shortlistRows,
      recentFileRows,
    ] = await Promise.all([
      prisma.conversation.findMany({
        where: { projectId: id },
        orderBy: { updatedAt: "desc" },
        take: 50,
        select: {
          id: true,
          title: true,
          updatedAt: true,
          messageCount: true,
        },
      }),
      prisma.projectWorkflowEvent.findMany({
        where: { projectId: id },
        orderBy: { createdAt: "desc" },
        take: 30,
      }),
      prisma.file.count({
        where: { conversation: { projectId: id } },
      }),
      prisma.projectStudioRoomSave.findFirst({
        where: { projectId: id },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          roomShapeId: true,
          widthM: true,
          depthM: true,
          environment: true,
          createdAt: true,
          placements: {
            orderBy: { orderIndex: "asc" },
            select: {
              orderIndex: true,
              piece: {
                select: {
                  id: true,
                  title: true,
                  storedImageUrl: true,
                  providerImageUrl: true,
                },
              },
            },
          },
        },
      }),
      prisma.shortlistItem.findMany({
        where: { projectId: id },
        orderBy: { createdAt: "desc" },
        take: 48,
        select: {
          id: true,
          productId: true,
          productName: true,
          productCategory: true,
          priceCents: true,
          currency: true,
          coverHue: true,
          rationale: true,
          summary: true,
          reasonSelected: true,
          notes: true,
          status: true,
          externalLifecycle: true,
          sourceConversationId: true,
          sourceRecommendationId: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.file.findMany({
        where: { conversation: { projectId: id } },
        orderBy: { createdAt: "desc" },
        take: 48,
        select: {
          id: true,
          filename: true,
          conversationId: true,
          createdAt: true,
        },
      }),
    ]);
    const fileTotal = fileCounts;

    let prefs: Record<string, string> = {};
    let messageCount = 0;
    if (p.activeConversationId) {
      prefs = await getPreferencesAsRecord(prisma, p.activeConversationId);
      messageCount = await prisma.message.count({
        where: { conversationId: p.activeConversationId },
      });
    }
    const [summary, memberRows, pendingInvites] = await Promise.all([
      includeSummary
        ? buildProjectSummary(prisma, id)
        : Promise.resolve(undefined),
      prisma.projectMember.findMany({
        where: { projectId: id, status: "active" },
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
        orderBy: { joinedAt: "asc" },
      }),
      prisma.projectInvitation.findMany({
        where: { projectId: id, status: "pending" },
        select: {
          id: true,
          email: true,
          role: true,
          invitedAt: true,
          expiresAt: true,
        },
        orderBy: { invitedAt: "desc" },
        take: 24,
      }),
    ]);

    const workflowEvaluation =
      summary?.workflowEvaluation ??
      evaluateProjectWorkflow({
        workflowStage: p.workflowStage,
        project: {
          title: p.title,
          room: p.room,
          description: p.description,
          budgetCents: p.budgetCents,
          briefSnapshot: p.briefSnapshot,
          workflowSatisfied: p.workflowSatisfied,
        },
        preferences: prefs,
        messageCount,
        userMessage: "",
      });

    return Response.json({
      project: {
        id: p.id,
        title: p.title,
        description: p.description,
        room: p.room,
        roomType: p.roomType,
        status: p.status,
        budgetCents: p.budgetCents,
        currency: p.currency,
        coverHue: p.coverHue,
        progress: p.progress,
        workflowStage: p.workflowStage,
        briefSnapshot: p.briefSnapshot,
        workflowSatisfied: p.workflowSatisfied,
        playbookUpdatedAt: p.playbookUpdatedAt?.toISOString() ?? null,
        decisionContext: p.decisionContext ?? null,
        recommendationsSnapshot: p.recommendationsSnapshot ?? null,
        activeConversationId: p.activeConversationId,
        executionLifecycle: p.executionLifecycle,
        executionNotes: p.executionNotes,
        updatedAt: p.updatedAt.toISOString(),
        createdAt: p.createdAt.toISOString(),
      },
      workflowEvaluation,
      conversations,
      workflowHistory: events.map((e) => ({
        id: e.id,
        fromStage: e.fromStage,
        toStage: e.toStage,
        reason: e.reason,
        trigger: e.trigger,
        createdAt: e.createdAt.toISOString(),
      })),
      aggregates: { fileCount: fileTotal },
      shortlistItems: shortlistRows.map((s) => ({
        id: s.id,
        productId: s.productId,
        productName: s.productName,
        productCategory: s.productCategory,
        priceCents: s.priceCents,
        currency: s.currency,
        coverHue: s.coverHue,
        rationale: s.rationale,
        summary: s.summary,
        reasonSelected: s.reasonSelected,
        notes: s.notes,
        status: s.status,
        externalLifecycle: s.externalLifecycle,
        sourceConversationId: s.sourceConversationId,
        sourceRecommendationId: s.sourceRecommendationId,
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
      })),
      recentFiles: recentFileRows.map((f) => ({
        id: f.id,
        filename: f.filename,
        conversationId: f.conversationId,
        createdAt: f.createdAt.toISOString(),
      })),
      latestStudioRoomSave: latestStudioSave
        ? {
            id: latestStudioSave.id,
            roomShapeId: latestStudioSave.roomShapeId,
            widthM: latestStudioSave.widthM,
            depthM: latestStudioSave.depthM,
            environment: latestStudioSave.environment,
            createdAt: latestStudioSave.createdAt.toISOString(),
            placements: latestStudioSave.placements.map((row) => ({
              pieceId: row.piece.id,
              title: row.piece.title,
              orderIndex: row.orderIndex,
              previewImageUrl:
                row.piece.storedImageUrl ?? row.piece.providerImageUrl ?? null,
            })),
          }
        : null,
      ...(summary !== undefined ? { summary } : {}),
      collaboration: {
        accessRole: access.access.role,
        isCanonicalOwner: access.access.isCanonicalOwner,
        members: memberRows
          .filter((m) => m.userId !== p.userId)
          .map((m) => ({
            id: m.id,
            userId: m.userId,
            role: m.role,
            name: m.user.name,
            email: m.user.email,
            joinedAt: m.joinedAt.toISOString(),
          })),
        pendingInvitations: pendingInvites.map((inv) => ({
          id: inv.id,
          email: inv.email,
          role: inv.role,
          invitedAt: inv.invitedAt.toISOString(),
          expiresAt: inv.expiresAt.toISOString(),
        })),
      },
    });
  } catch (e) {
    return mapDbErrorToResponse(e, "api_projects_get");
  }
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await getSessionUserId();
    const { id } = await ctx.params;
    const access = await requireProjectEditor(id, userId);
    if (access.error || !access.access) {
      return apiError(
        ErrorCodes.NOT_FOUND,
        access.error ?? "Not found",
        access.status,
      );
    }
    const body = await req.json();
    const parsed = PatchSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(
        ErrorCodes.VALIDATION_ERROR,
        "Invalid body",
        400,
        parsed.error.flatten(),
      );
    }
    const d = parsed.data;
    const data: Prisma.ProjectUpdateInput = {};
    if (d.title !== undefined) data.title = d.title;
    if (d.description !== undefined) data.description = d.description;
    if (d.room !== undefined) data.room = d.room;
    if (d.roomType !== undefined) data.roomType = d.roomType;
    if (d.status !== undefined) data.status = d.status as ProjectStatus;
    if (d.progress !== undefined) data.progress = d.progress;
    if (d.briefSnapshot !== undefined) {
      data.briefSnapshot =
        d.briefSnapshot === null
          ? Prisma.JsonNull
          : (d.briefSnapshot as Prisma.InputJsonValue);
    }
    if (d.activeConversationId !== undefined) {
      if (d.activeConversationId) {
        const convo = await prisma.conversation.findFirst({
          where: {
            id: d.activeConversationId,
            projectId: id,
          },
        });
        if (!convo) {
          return apiError(
            ErrorCodes.VALIDATION_ERROR,
            "Conversation must belong to this project",
            400,
          );
        }
        data.activeConversation = { connect: { id: d.activeConversationId } };
      } else {
        data.activeConversation = { disconnect: true };
      }
    }

    if (d.decisionContext !== undefined) {
      if (d.decisionContext === null) {
        data.decisionContext = Prisma.JsonNull;
      } else {
        const parsed = ProjectDecisionContextSchema.safeParse(
          d.decisionContext,
        );
        if (!parsed.success) {
          return apiError(
            ErrorCodes.VALIDATION_ERROR,
            "Invalid decisionContext",
            400,
            parsed.error.flatten(),
          );
        }
        data.decisionContext = parsed.data as Prisma.InputJsonValue;
      }
    }

    if (d.recommendationsSnapshot !== undefined) {
      if (d.recommendationsSnapshot === null) {
        data.recommendationsSnapshot = Prisma.JsonNull;
      } else {
        const parsed = RecommendationsSnapshotSchema.safeParse(
          d.recommendationsSnapshot,
        );
        if (!parsed.success) {
          return apiError(
            ErrorCodes.VALIDATION_ERROR,
            "Invalid recommendationsSnapshot",
            400,
            parsed.error.flatten(),
          );
        }
        data.recommendationsSnapshot = parsed.data as Prisma.InputJsonValue;
      }
    }

    if (d.executionNotes !== undefined) {
      data.executionNotes = d.executionNotes;
    }
    if (d.executionLifecycle !== undefined) {
      data.executionLifecycle = d.executionLifecycle;
    }

    const updated = await prisma.project.update({
      where: { id },
      data,
    });

    if (d.decisionContext !== undefined) {
      await syncExecutionStateAfterContentChange(prisma, id);
    }

    return Response.json({ project: updated });
  } catch (e) {
    return mapDbErrorToResponse(e, "api_projects_patch");
  }
}
