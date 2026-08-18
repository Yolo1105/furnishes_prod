/**
 * Shared Phase 8 prompt extras + send-turn caps for non-stream and stream paths.
 */

import type { ChatProviderMessage } from "./chat-provider";
import {
  buildHistoryWindow,
  isChatSummaryEnabled,
} from "./chat-context-summary";
import {
  buildProjectMemoryContext,
  isChatProjectMemoryEnabled,
} from "@/server/projects/project-memory";
import { formatProjectMemoryPrompt } from "@/server/projects/project-memory-prompt";
import {
  resolveRoomPlanForConversation,
  roomPlanPromptBlockFromDto,
  type RoomPlanDto,
} from "@/server/room-plan/service";
import { assertChatSendAllowed } from "./chat-rate-limit";
import { checkCostAllowance } from "@/server/ops/cost-guard";
import { CHAT_FAILURE_COST_LIMIT } from "./chat-copy";
import { err, ok, type ServiceResult } from "@/server/result";
import { logChatOperationalEvent } from "./chat-ops";

const HISTORY_FALLBACK_TAKE = 40;
/** When summarization is on, load enough turns for refresh + window. */
const HISTORY_SUMMARY_TAKE = 500;

export function chatHistoryMessageTake(): number {
  return isChatSummaryEnabled() ? HISTORY_SUMMARY_TAKE : HISTORY_FALLBACK_TAKE;
}

/**
 * Message quotas + CostLog spend caps before claiming a generation.
 * First slice of prepareSendTurn — transport layers still own claim/SSE shaping.
 */
export async function assertSendTurnCaps(input: {
  userId: string;
  conversationId: string;
}): Promise<
  ServiceResult<
    { costWarning: boolean },
    "rate_limited" | "daily_limit" | "cost_limit"
  >
> {
  const quota = await assertChatSendAllowed({ userId: input.userId });
  if (!quota.ok) {
    logChatOperationalEvent({
      event:
        quota.error === "daily_limit"
          ? "chat_daily_limit"
          : "chat_rate_limited",
      userId: input.userId,
      conversationId: input.conversationId,
      errorCategory: quota.error,
    });
    return err(quota.error, quota.message ?? "Rate limit exceeded.");
  }

  const costAllowance = await checkCostAllowance({
    userId: input.userId,
    conversationId: input.conversationId,
  });
  if (!costAllowance.allowed) {
    logChatOperationalEvent({
      event: "chat_cost_limit",
      userId: input.userId,
      conversationId: input.conversationId,
      errorCategory: "cost_limit",
      costUsd: costAllowance.sessionCostUsd,
    });
    return err("cost_limit", CHAT_FAILURE_COST_LIMIT);
  }

  return ok({ costWarning: costAllowance.warning });
}

export async function resolveChatSendPromptExtras(input: {
  userId: string;
  conversationId: string;
  projectId: string | null;
  priorMessages: Array<{ role: string; content: string }>;
  contextSummary: string | null;
  newUserContent: string;
}): Promise<{
  history: ChatProviderMessage[];
  contextSummaryBlock?: string;
  projectMemoryBlock?: string;
  roomPlanBlock?: string;
  roomPlan: RoomPlanDto | null;
  messagesForSummaryRefresh: Array<{ role: string; content: string }>;
}> {
  const withCurrent = [
    ...input.priorMessages,
    { role: "user", content: input.newUserContent },
  ];

  const window = buildHistoryWindow({
    messages: withCurrent,
    summary: input.contextSummary,
  });

  const history: ChatProviderMessage[] = window.recentMessages.map(
    (message) => ({
      role: (message.role === "assistant" ? "assistant" : "user") as
        "assistant" | "user",
      content: message.content,
    }),
  );

  let projectMemoryBlock: string | undefined;
  if (isChatProjectMemoryEnabled() && input.projectId) {
    const memory = await buildProjectMemoryContext({
      projectId: input.projectId,
      userId: input.userId,
      excludeConversationId: input.conversationId,
    });
    if (memory) {
      projectMemoryBlock = formatProjectMemoryPrompt(memory, "chat");
    }
  }

  const roomPlan = await resolveRoomPlanForConversation({
    userId: input.userId,
    projectId: input.projectId,
  });
  const roomPlanBlock = roomPlan
    ? roomPlanPromptBlockFromDto(roomPlan)
    : undefined;

  return {
    history,
    ...(window.summaryBlock
      ? { contextSummaryBlock: window.summaryBlock }
      : {}),
    ...(projectMemoryBlock ? { projectMemoryBlock } : {}),
    ...(roomPlanBlock ? { roomPlanBlock } : {}),
    roomPlan,
    messagesForSummaryRefresh: withCurrent,
  };
}
