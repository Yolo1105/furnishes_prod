import type { DesignWorkflowStage, Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/eva/db";
import { getPreferencesAsRecord } from "@/lib/eva/api/helpers";
import { evaluateProjectWorkflow } from "@/lib/eva/design-workflow/evaluate";
import {
  nextStage,
  type WorkflowStageId,
  WORKFLOW_STAGE_ORDER,
} from "@/lib/eva/design-workflow/stages";
import { parseWorkflowSatisfied } from "@/lib/eva/design-workflow/workflow-satisfied-json";

function mergeSatisfied(
  existing: unknown,
  patch: Record<string, boolean>,
): Prisma.InputJsonValue {
  return { ...parseWorkflowSatisfied(existing), ...patch };
}

/**
 * Auto-advance project workflow after a chat turn using the central evaluator.
 * Persists `workflowSatisfied` patches and optionally advances stage + audit row.
 */
export async function maybeAutoAdvanceProjectWorkflow(
  db: PrismaClient,
  projectId: string,
  opts: {
    messageCount: number;
    userMessage: string;
    preferences: Record<string, string>;
  },
): Promise<WorkflowStageId | null> {
  const project = await db.project.findUnique({
    where: { id: projectId },
    select: {
      workflowStage: true,
      workflowSatisfied: true,
      title: true,
      room: true,
      description: true,
      budgetCents: true,
      briefSnapshot: true,
    },
  });
  if (!project) return null;

  const stage = project.workflowStage as WorkflowStageId;
  if (!WORKFLOW_STAGE_ORDER.includes(stage)) return null;

  const evaluation = evaluateProjectWorkflow({
    workflowStage: stage,
    project: {
      title: project.title,
      room: project.room,
      description: project.description,
      budgetCents: project.budgetCents,
      briefSnapshot: project.briefSnapshot,
      workflowSatisfied: project.workflowSatisfied,
    },
    preferences: opts.preferences,
    messageCount: opts.messageCount,
    userMessage: opts.userMessage,
  });

  const merged = mergeSatisfied(
    project.workflowSatisfied,
    evaluation.workflowSatisfiedPatch,
  );

  const next = evaluation.suggestedNextStage;
  if (evaluation.canAutoAdvance && next && next !== stage) {
    const prismaStage = next as DesignWorkflowStage;
    await db.$transaction([
      db.project.update({
        where: { id: projectId },
        data: {
          workflowStage: prismaStage,
          workflowSatisfied: merged,
          playbookUpdatedAt: new Date(),
        },
      }),
      db.projectWorkflowEvent.create({
        data: {
          projectId,
          fromStage: stage as DesignWorkflowStage,
          toStage: prismaStage,
          reason: evaluation.autoAdvanceReason,
          trigger: "auto",
        },
      }),
    ]);
    return next;
  }

  await db.project.update({
    where: { id: projectId },
    data: {
      workflowSatisfied: merged,
      playbookUpdatedAt: new Date(),
    },
  });

  return null;
}

export type ManualWorkflowTransitionResult =
  | { ok: true }
  | {
      ok: false;
      error: "invalid_stage" | "not_forward" | "blocked";
      message: string;
    };

/**
 * Manual advance (UI). Prefer completing current stage; use `force` to override gates.
 */
export async function transitionProjectWorkflow(
  projectId: string,
  toStage: WorkflowStageId,
  reason: string | undefined,
  trigger: "manual" | "system",
  opts?: { force?: boolean },
): Promise<ManualWorkflowTransitionResult> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      workflowStage: true,
      workflowSatisfied: true,
      title: true,
      room: true,
      description: true,
      budgetCents: true,
      briefSnapshot: true,
      activeConversationId: true,
    },
  });
  if (!project) throw new Error("Project not found");
  const current = project.workflowStage as WorkflowStageId;
  if (current === toStage) return { ok: true };

  let prefs: Record<string, string> = {};
  let messageCount = 0;
  if (project.activeConversationId) {
    prefs = await getPreferencesAsRecord(prisma, project.activeConversationId);
    messageCount = await prisma.message.count({
      where: { conversationId: project.activeConversationId },
    });
  }

  const evaluation = evaluateProjectWorkflow({
    workflowStage: current,
    project: {
      title: project.title,
      room: project.room,
      description: project.description,
      budgetCents: project.budgetCents,
      briefSnapshot: project.briefSnapshot,
      workflowSatisfied: project.workflowSatisfied,
    },
    preferences: prefs,
    messageCount,
    userMessage: "",
  });

  const curIdx = WORKFLOW_STAGE_ORDER.indexOf(current);
  const toIdx = WORKFLOW_STAGE_ORDER.indexOf(toStage);
  const forwardOk = toIdx > curIdx;

  if (!forwardOk) {
    return {
      ok: false,
      error: "not_forward",
      message: "Workflow can only move forward to a later stage.",
    };
  }

  const linearNext = nextStage(current);
  const allowed =
    opts?.force === true ||
    toStage === evaluation.suggestedNextStage ||
    (evaluation.stageComplete && linearNext === toStage);

  if (!allowed) {
    return {
      ok: false,
      error: "blocked",
      message:
        "Complete the open checklist items for this stage first, or resend with force=true.",
    };
  }

  const prismaTo = toStage as DesignWorkflowStage;

  await prisma.$transaction([
    prisma.project.update({
      where: { id: projectId },
      data: {
        workflowStage: prismaTo,
        playbookUpdatedAt: new Date(),
      },
    }),
    prisma.projectWorkflowEvent.create({
      data: {
        projectId,
        fromStage: current as DesignWorkflowStage,
        toStage: prismaTo,
        reason: reason ?? null,
        trigger,
      },
    }),
  ]);

  return { ok: true };
}
