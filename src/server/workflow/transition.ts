/**
 * Persist conversation workflow stage transitions.
 * Re-derived from legacy `lib/eva/design-workflow/transition.ts`
 * (conversation-scoped; no project playbook graph).
 */

import { prisma } from "@/server/db";
import { evaluateAdvance } from "./evaluate";
import {
  isChatWorkflowEnabled,
  isWorkflowStageId,
  type WorkflowStageId,
} from "./stages";

/**
 * Evaluate and optionally advance `Conversation.workflowStage`, writing a
 * `WorkflowEvent` when the stage changes. No-op when `CHAT_WORKFLOW_ENABLED≠1`.
 */
export async function maybeAdvance(input: {
  conversationId: string;
  messageCount: number;
  confirmedPreferences: Record<string, string | null>;
  userMessage: string;
  roomDimensions?: unknown;
  roomPlan?: {
    coreItemCount: number;
    decidedCount: number;
  } | null;
}): Promise<WorkflowStageId | null> {
  if (!isChatWorkflowEnabled()) return null;

  const conversation = await prisma.conversation.findUnique({
    where: { id: input.conversationId },
    select: { id: true, workflowStage: true },
  });
  if (!conversation) return null;

  const stage = isWorkflowStageId(conversation.workflowStage)
    ? conversation.workflowStage
    : "intake";

  const evaluation = evaluateAdvance({
    stage,
    messageCount: input.messageCount,
    confirmedPreferences: input.confirmedPreferences,
    userMessage: input.userMessage,
    roomDimensions: input.roomDimensions,
    ...(input.roomPlan !== undefined ? { roomPlan: input.roomPlan } : {}),
  });

  const next = evaluation.suggestedNextStage;
  if (!evaluation.canAutoAdvance || !next || next === stage) {
    return null;
  }

  await prisma.$transaction([
    prisma.conversation.update({
      where: { id: input.conversationId },
      data: { workflowStage: next },
    }),
    prisma.workflowEvent.create({
      data: {
        conversationId: input.conversationId,
        fromStage: stage,
        toStage: next,
        reason: evaluation.autoAdvanceReason ?? "auto",
      },
    }),
  ]);

  return next;
}
