import { computeCost } from "@/lib/eva/core/openai";
import { recordCost } from "@/lib/eva/core/cost-logger";
import {
  logChatGeneration,
  type ChatGenerationLogContext,
} from "@/lib/eva/server/chat-generation-log";
import type { ChatPromptCoreGeneration } from "@/lib/eva/chat/post/chat-post-types";

/**
 * Builds the `streamText` / `generateText` spread (minus `model`) including usage logging.
 */
export function createChatOpenAiStreamOptionBuilder(parameters: {
  coreGeneration: ChatPromptCoreGeneration;
  chatGenLogCtx: ChatGenerationLogContext;
  conversationId: string | null;
}) {
  const { coreGeneration, chatGenLogCtx, conversationId } = parameters;

  return function buildStreamOptions(model: string) {
    return {
      ...coreGeneration,
      onError: ({ error }: { error: unknown }) => {
        logChatGeneration(
          "error",
          "chat_stream_provider_error",
          chatGenLogCtx,
          {
            model,
            detail: String(error),
          },
        );
      },
      onFinish: (event: {
        text: string;
        finishReason: string;
        rawFinishReason?: string;
        usage: {
          promptTokens?: number;
          completionTokens?: number;
          totalTokens?: number;
        };
        warnings?: unknown;
      }) => {
        if (!event.text?.trim()) {
          logChatGeneration("warn", "chat_empty_model_text", chatGenLogCtx, {
            model,
            finishReason: event.finishReason,
            rawFinishReason: event.rawFinishReason,
            warnings: event.warnings,
          });
        }
        const usage = event.usage;
        if (usage && conversationId) {
          const promptTokens = usage.promptTokens ?? 0;
          const completionTokens = usage.completionTokens ?? 0;
          const costUsd = computeCost(usage, model);
          logChatGeneration("info", "llm_usage", chatGenLogCtx, {
            conversationId,
            promptTokens,
            completionTokens,
            totalTokens: usage.totalTokens ?? 0,
            model,
            costUsd: Math.round(costUsd * 1e6) / 1e6,
          });
          void recordCost(
            conversationId,
            model,
            promptTokens,
            completionTokens,
            costUsd,
          );
        }
      },
    };
  };
}
