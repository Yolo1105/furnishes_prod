import { z } from "zod";
import {
  ProjectEventType,
  type DesignWorkflowStage,
  type ProjectStatus,
} from "@prisma/client";
import { prisma } from "@/lib/eva/db";
import { WORKFLOW_STAGE_ORDER } from "@/lib/eva/design-workflow/stages";
import { recordProjectEvent } from "@/lib/eva/projects/project-events";
import { prismaRowToStudioProject } from "@/lib/studio/projects/map-prisma-project";
import { withStudioAuth } from "@/lib/studio/server/auth";
import { accessibleProjectsWhereClause } from "@/lib/studio/server/studio-project-scope";

export const dynamic = "force-dynamic";

const CreateBodySchema = z.object({
  name: z.string().min(1).max(200).optional(),
});

export const GET = withStudioAuth("studio:projects:get", async (_req, ctx) => {
  const { userId } = ctx;
  const where = accessibleProjectsWhereClause(userId);
  const rows = await prisma.project.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    select: { id: true, title: true, updatedAt: true },
  });
  return Response.json({
    projects: rows.map(prismaRowToStudioProject),
  });
});

export const POST = withStudioAuth("studio:projects:post", async (req, ctx) => {
  const { userId } = ctx;
  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const parsed = CreateBodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid body" }, { status: 400 });
  }
  const title = parsed.data.name?.trim() || "Untitled Space";

  const project = await prisma.$transaction(async (tx) => {
    const coverHue = Math.floor(Math.random() * 360);
    const p = await tx.project.create({
      data: {
        userId,
        title,
        description: "",
        room: "Studio",
        roomType: null,
        coverHue,
        budgetCents: 0,
        status: "planning" as ProjectStatus,
        members: { create: { userId, role: "owner" } },
      },
    });
    await tx.projectWorkflowEvent.create({
      data: {
        projectId: p.id,
        fromStage: null,
        toStage: WORKFLOW_STAGE_ORDER[0] as DesignWorkflowStage,
        reason: "Project created from Studio",
        trigger: "system",
      },
    });
    await recordProjectEvent(tx, {
      projectId: p.id,
      actorUserId: userId,
      eventType: ProjectEventType.project_created,
      label: `Project created: ${title}`,
      metadata: { room: p.room, roomType: p.roomType },
    });
    return p;
  });

  return Response.json({
    project: prismaRowToStudioProject(project),
  });
});
