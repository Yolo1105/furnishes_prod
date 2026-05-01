import {
  ProjectEventType,
  type DesignWorkflowStage,
  type ProjectStatus,
} from "@prisma/client";
import { prisma } from "@/lib/eva/db";
import { WORKFLOW_STAGE_ORDER } from "@/lib/eva/design-workflow/stages";
import { recordProjectEvent } from "@/lib/eva/projects/project-events";
import { prismaRowToStudioProject } from "@/lib/studio/projects/map-prisma-project";
import { PLAYGROUND_DEMO_PROJECT_TITLE } from "@/lib/studio/projects/playground-demo-constants";
import { withStudioAuth } from "@/lib/studio/server/auth";
import { accessibleProjectsWhereClause } from "@/lib/studio/server/studio-project-scope";

export const dynamic = "force-dynamic";

export const POST = withStudioAuth(
  "studio:projects:ensure-starter",
  async (_req, ctx) => {
    const { userId } = ctx;
    const where = accessibleProjectsWhereClause(userId);

    const result = await prisma.$transaction(async (tx) => {
      const existingDemo = await tx.project.findFirst({
        where: { ...where, title: PLAYGROUND_DEMO_PROJECT_TITLE },
        orderBy: { createdAt: "asc" },
      });
      if (existingDemo) {
        return existingDemo;
      }

      const coverHue = Math.floor(Math.random() * 360);
      const project = await tx.project.create({
        data: {
          userId,
          title: PLAYGROUND_DEMO_PROJECT_TITLE,
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
          projectId: project.id,
          fromStage: null,
          toStage: WORKFLOW_STAGE_ORDER[0] as DesignWorkflowStage,
          reason: "Studio playground demo project",
          trigger: "system",
        },
      });
      await recordProjectEvent(tx, {
        projectId: project.id,
        actorUserId: userId,
        eventType: ProjectEventType.project_created,
        label: `Project created: ${project.title}`,
        metadata: { room: project.room, roomType: project.roomType },
      });
      return project;
    });

    return Response.json({
      project: prismaRowToStudioProject(result),
    });
  },
);
