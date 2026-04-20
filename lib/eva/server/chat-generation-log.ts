import { log } from "@/lib/eva/core/logger";
import type { ChatGenerationFailureCategory } from "@/lib/eva/core/chat-generation-failure";

export type ChatGenerationLogContext = {
  chatRequestId: string;
  traceId?: string | null;
  conversationId?: string | null;
  projectId?: string | null;
  assistantId?: string | null;
  clientAttemptId?: string | null;
  priorChatRequestId?: string | null;
};

type LogLevel = "info" | "warn" | "error";

/**
 * Structured chat generation logging — no message body, no secrets.
 * Prefer `event` matching CHAT_GENERATION_TELEMETRY for operator dashboards.
 */
export function logChatGeneration(
  level: LogLevel,
  event: string,
  ctx: ChatGenerationLogContext,
  extra?: Record<string, unknown>,
): void {
  log({
    level,
    event,
    scope: "chat_generation",
    chatRequestId: ctx.chatRequestId,
    ...(ctx.traceId ? { traceId: ctx.traceId } : {}),
    ...(ctx.conversationId != null
      ? { conversationId: ctx.conversationId }
      : {}),
    ...(ctx.projectId != null ? { projectId: ctx.projectId } : {}),
    ...(ctx.assistantId != null ? { assistantId: ctx.assistantId } : {}),
    ...(ctx.clientAttemptId ? { clientAttemptId: ctx.clientAttemptId } : {}),
    ...(ctx.priorChatRequestId
      ? { priorChatRequestId: ctx.priorChatRequestId }
      : {}),
    ...extra,
  });
}

export function logChatGenerationFailure(
  level: LogLevel,
  event: string,
  ctx: ChatGenerationLogContext,
  failureCategory: ChatGenerationFailureCategory,
  extra?: Record<string, unknown>,
): void {
  logChatGeneration(level, event, ctx, {
    failureCategory,
    ...extra,
  });
}
