import { z } from "zod";
import { prisma } from "@/lib/eva/db";
import { getSessionUserId } from "@/lib/eva/auth/helpers";
import { apiError, ErrorCodes } from "@/lib/eva/api/error";
import { mapDbErrorToResponse } from "@/lib/eva/api/db-error";
import type { DesignWorkflowStage, ProjectStatus } from "@prisma/client";
import { ProjectEventType, ProjectMemberStatus } from "@prisma/client";
import { WORKFLOW_STAGE_ORDER } from "@/lib/eva/design-workflow/stages";
import { recordProjectEvent } from "@/lib/eva/projects/project-events";

export const dynamic = "force-dynamic";

const CreateSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(8000).optional(),
  room: z.string().min(1).max(120),
  roomType: z.string().max(64).optional(),
  budgetCents: z.number().int().min(0).optional(),
});

export async function GET() {
  try {
    const userId = await getSessionUserId();
    if (!userId) {
      return apiError(ErrorCodes.FORBIDDEN, "Sign in required", 401);
    }
    const projects = await prisma.project.findMany({
      where: {
        archivedAt: null,
        OR: [
          { userId },
          {
            members: {
              some: { userId, status: ProjectMemberStatus.active },
            },
          },
        ],
      },
      orderBy: { updatedAt: "desc" },
      include: {
        _count: {
          select: {
            conversations: true,
            shortlistItems: true,
            uploads: true,
          },
        },
      },
    });
    return Response.json({
      projects: projects.map((p) => ({
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
        activeConversationId: p.activeConversationId,
        updatedAt: p.updatedAt.toISOString(),
        createdAt: p.createdAt.toISOString(),
        access: p.userId === userId ? ("owned" as const) : ("shared" as const),
        stats: {
          conversations: p._count.conversations,
          shortlistItems: p._count.shortlistItems,
          uploads: p._count.uploads,
        },
      })),
    });
  } catch (e) {
    return mapDbErrorToResponse(e, "api_projects_list");
  }
}

export async function POST(req: Request) {
  try {
    const userId = await getSessionUserId();
    if (!userId) {
      return apiError(ErrorCodes.FORBIDDEN, "Sign in required", 401);
    }
    const body = await req.json();
    const parsed = CreateSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(
        ErrorCodes.VALIDATION_ERROR,
        "Invalid body",
        400,
        parsed.error.flatten(),
      );
    }
    const { title, description, room, roomType, budgetCents } = parsed.data;
    const coverHue = Math.floor(Math.random() * 360);
    const project = await prisma.project.create({
      data: {
        userId,
        title,
        description: description ?? "",
        room,
        roomType: roomType ?? null,
        coverHue,
        budgetCents: budgetCents ?? 0,
        status: "planning" as ProjectStatus,
        members: { create: { userId, role: "owner" } },
      },
    });
    await prisma.projectWorkflowEvent.create({
      data: {
        projectId: project.id,
        fromStage: null,
        toStage: WORKFLOW_STAGE_ORDER[0] as DesignWorkflowStage,
        reason: "Project created",
        trigger: "system",
      },
    });
    await recordProjectEvent(prisma, {
      projectId: project.id,
      actorUserId: userId,
      eventType: ProjectEventType.project_created,
      label: `Project created: ${title}`,
      metadata: { room, roomType: roomType ?? null },
    });
    return Response.json({
      project: {
        id: project.id,
        title: project.title,
        description: project.description,
        room: project.room,
        roomType: project.roomType,
        status: project.status,
        workflowStage: project.workflowStage,
        coverHue: project.coverHue,
      },
    });
  } catch (e) {
    return mapDbErrorToResponse(e, "api_projects_create");
  }
}
