import { prisma } from "@/lib/eva/db";
import { getPreferencesAsRecord } from "@/lib/eva/api/helpers";
import { evaluateTransitions, transitionTo } from "@/lib/eva/playbook/runtime";
import type { PlaybookGraph, PlaybookNode } from "@/lib/eva/playbook/types";
import { log } from "@/lib/eva/core/logger";

/**
 * Non-blocking playbook graph advance after the assistant reply is persisted.
 */
export async function runPlaybookPostResponseTransition(parameters: {
  conversationId: string;
  activeNode: PlaybookNode | null;
  playbookGraph: PlaybookGraph | null;
  userMessage: string;
  messageCount: number;
  firstMessageTransitioned: boolean;
}): Promise<void> {
  const {
    conversationId,
    activeNode,
    playbookGraph,
    userMessage,
    messageCount,
    firstMessageTransitioned,
  } = parameters;

  if (!activeNode || !playbookGraph || firstMessageTransitioned) {
    return;
  }

  try {
    const freshPrefs = await getPreferencesAsRecord(prisma, conversationId);
    const transition = evaluateTransitions(
      playbookGraph,
      activeNode,
      freshPrefs,
      userMessage,
      messageCount,
      null,
    );
    if (transition.shouldTransition && transition.nextNode) {
      await transitionTo(
        conversationId,
        activeNode.id,
        transition.nextNode.id,
        transition.firedEdge?.id ?? null,
        transition.reason,
      );
    }
  } catch (transErr) {
    log({
      level: "warn",
      event: "playbook_transition_eval_failed",
      conversationId,
      error: String(transErr),
    });
  }
}
