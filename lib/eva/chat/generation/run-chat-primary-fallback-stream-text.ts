import { streamText } from "ai";
import {
  openai,
  OPENAI_FALLBACK_MODEL,
  OPENAI_PRIMARY_MODEL,
} from "@/lib/eva/core/openai";
import { CHAT_FAILURE_AI_TEMPORARILY_UNAVAILABLE } from "@/lib/eva/core/chat-copy";
import {
  CHAT_GENERATION_FAILURE,
  CHAT_GENERATION_TELEMETRY,
  CHAT_RESPONSE_HEADER,
} from "@/lib/eva/core/chat-generation-failure";
import { apiError, ErrorCodes } from "@/lib/eva/api/error";
import {
  logChatGeneration,
  logChatGenerationFailure,
  type ChatGenerationLogContext,
} from "@/lib/eva/server/chat-generation-log";
import type { createChatOpenAiStreamOptionBuilder } from "./build-chat-openai-stream-options";
import {
  CHAT_STREAM_FALLBACK_MAX_RETRIES,
  CHAT_STREAM_PRIMARY_MAX_RETRIES,
} from "./chat-stream-recovery-constants";

type BuildChatOpenAiStreamOptions = ReturnType<
  typeof createChatOpenAiStreamOptionBuilder
>;

export type ChatPrimaryFallbackStreamTextSuccess = {
  outcome: "ok";
  result: Awaited<ReturnType<typeof streamText>>;
  streamModelUsed: string;
  primaryStreamAttempted: boolean;
  fallbackStreamAttempted: boolean;
};

export type ChatPrimaryFallbackStreamTextFailure = {
  outcome: "error";
  response: Response;
};

export type ChatPrimaryFallbackStreamTextResult =
  | ChatPrimaryFallbackStreamTextSuccess
  | ChatPrimaryFallbackStreamTextFailure;

/**
 * Runs OpenAI streaming with primary model, then fallback on provider failure.
 * Does not consume the stream body.
 */
export async function runChatPrimaryFallbackStreamText(parameters: {
  buildStreamOptions: BuildChatOpenAiStreamOptions;
  chatGenLogCtx: ChatGenerationLogContext;
  chatRequestId: string;
  clientAttemptId: string | null | undefined;
}): Promise<ChatPrimaryFallbackStreamTextResult> {
  const { buildStreamOptions, chatGenLogCtx, chatRequestId, clientAttemptId } =
    parameters;

  let result: Awaited<ReturnType<typeof streamText>>;
  let streamModelUsed: string;
  let primaryStreamAttempted = false;
  let fallbackStreamAttempted = false;

  try {
    logChatGeneration(
      "info",
      CHAT_GENERATION_TELEMETRY.PRIMARY_STREAM_STARTED,
      chatGenLogCtx,
      {
        model: OPENAI_PRIMARY_MODEL,
      },
    );
    result = await streamText({
      model: openai(OPENAI_PRIMARY_MODEL),
      ...buildStreamOptions(OPENAI_PRIMARY_MODEL),
      maxRetries: CHAT_STREAM_PRIMARY_MAX_RETRIES,
    });
    primaryStreamAttempted = true;
    streamModelUsed = OPENAI_PRIMARY_MODEL;
  } catch (primaryErr) {
    primaryStreamAttempted = true;
    logChatGenerationFailure(
      "warn",
      CHAT_GENERATION_TELEMETRY.PRIMARY_STREAM_FAILED,
      chatGenLogCtx,
      CHAT_GENERATION_FAILURE.PRIMARY_STREAM_EXCEPTION,
      {
        model: OPENAI_PRIMARY_MODEL,
        error: String(primaryErr),
      },
    );
    logChatGeneration(
      "info",
      CHAT_GENERATION_TELEMETRY.FALLBACK_STREAM_STARTED,
      chatGenLogCtx,
      {
        model: OPENAI_FALLBACK_MODEL,
      },
    );
    try {
      result = await streamText({
        model: openai(OPENAI_FALLBACK_MODEL),
        ...buildStreamOptions(OPENAI_FALLBACK_MODEL),
        maxRetries: CHAT_STREAM_FALLBACK_MAX_RETRIES,
      });
      fallbackStreamAttempted = true;
      streamModelUsed = OPENAI_FALLBACK_MODEL;
    } catch (fallbackErr) {
      fallbackStreamAttempted = true;
      logChatGenerationFailure(
        "error",
        CHAT_GENERATION_TELEMETRY.FALLBACK_STREAM_FAILED,
        chatGenLogCtx,
        CHAT_GENERATION_FAILURE.ALL_MODELS_FAILED,
        {
          primaryError: String(primaryErr),
          fallbackError: String(fallbackErr),
          primaryModel: OPENAI_PRIMARY_MODEL,
          fallbackModel: OPENAI_FALLBACK_MODEL,
        },
      );
      return {
        outcome: "error",
        response: apiError(
          ErrorCodes.LLM_UNAVAILABLE,
          CHAT_FAILURE_AI_TEMPORARILY_UNAVAILABLE,
          503,
          undefined,
          {
            [CHAT_RESPONSE_HEADER.REQUEST_ID]: chatRequestId,
            [CHAT_RESPONSE_HEADER.GENERATION_FAILURE]:
              CHAT_GENERATION_FAILURE.ALL_MODELS_FAILED,
            ...(clientAttemptId
              ? { [CHAT_RESPONSE_HEADER.CLIENT_ATTEMPT_ID]: clientAttemptId }
              : {}),
          },
        ),
      };
    }
  }

  return {
    outcome: "ok",
    result,
    streamModelUsed,
    primaryStreamAttempted,
    fallbackStreamAttempted,
  };
}
