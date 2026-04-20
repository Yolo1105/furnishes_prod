import { generateText, streamText } from "ai";
import { openai } from "@/lib/eva/core/openai";
import { prisma } from "@/lib/eva/db";
import { log } from "@/lib/eva/core/logger";
import { getDomainConfig } from "@/lib/eva/domain/config";
import { buildContext } from "@/lib/eva/core/context-builder";
import { getPreferencesAsRecord } from "@/lib/eva/api/helpers";
import {
  OPENAI_PRIMARY_MODEL,
  OPENAI_FALLBACK_MODEL,
  buildChatRecoveryGenerateTextModelQueue,
  computeCost,
  toUsageLike,
} from "@/lib/eva/core/openai";
import {
  CHAT_FAILURE_ALL_RECOVERY_EXHAUSTED,
  CHAT_FAILURE_SANITIZATION_EMPTIED,
} from "@/lib/eva/core/chat-copy";
import {
  CHAT_GENERATION_FAILURE,
  CHAT_GENERATION_TELEMETRY,
  CHAT_RESPONSE_HEADER,
  type ChatGenerationFailureCategory,
} from "@/lib/eva/core/chat-generation-failure";
import {
  logChatGeneration,
  logChatGenerationFailure,
} from "@/lib/eva/server/chat-generation-log";
import { finalizeChatModelOutput } from "@/lib/eva/chat/generation/finalize-chat-output";
import { createChatOpenAiStreamOptionBuilder } from "@/lib/eva/chat/generation/build-chat-openai-stream-options";
import { runChatPrimaryFallbackStreamText } from "@/lib/eva/chat/generation/run-chat-primary-fallback-stream-text";
import { persistChatAssistantMessage } from "@/lib/eva/chat/persistence/persist-chat-assistant-message";
import {
  CHAT_STREAM_FALLBACK_MAX_RETRIES,
  CHAT_STREAM_RECOVERY_GENERATE_TEXT_MAX_RETRIES,
  CHAT_STREAM_RECOVERY_GENERATE_TEXT_TEMPERATURE,
  CHAT_STREAM_RECOVERY_GENERATE_TEXT_TIMEOUT_MS,
} from "@/lib/eva/chat/generation/chat-stream-recovery-constants";
import { runPlaybookPostResponseTransition } from "@/lib/eva/chat/post/run-playbook-post-response-transition";
import { recordCost } from "@/lib/eva/core/cost-logger";
import { checkPolicy } from "@/lib/eva/policy/enforcement";
import {
  getActiveNode,
  evaluateTransitions,
  transitionTo,
} from "@/lib/eva/playbook/runtime";
import { clientIdentityFromRequest } from "@/lib/api/identity";
import { maybeAutoAdvanceProjectWorkflow } from "@/lib/eva/design-workflow/transition";
import type { WorkflowStageId } from "@/lib/eva/design-workflow/stages";
import { buildProjectIntelligenceContext } from "@/lib/eva/intelligence/project-intelligence-context";
import { buildChatGroundingLayers } from "@/lib/eva/chat/grounding/build-chat-grounding-layers";
import { buildChatSystemPromptStack } from "@/lib/eva/chat/prompt/build-chat-system-prompt-stack";
import { mapChatGenerationFailureToSurface } from "@/lib/eva/chat/failure/map-chat-generation-failure-to-surface";
import { CHAT_OUTBOUND_HTTP } from "@/lib/eva/core/chat-http-header-names";
import { buildChatStreamResponseHeaders } from "@/lib/eva/chat/post/build-chat-stream-response-headers";
import { validateChatPostRequestStage } from "@/lib/eva/chat/post/validate-chat-post-request-stage";
import { resolveChatConversationForPost } from "@/lib/eva/chat/conversation/resolve-chat-conversation-for-post";

/**
 * Full chat POST pipeline: validation → conversation → playbook/policy →
 * `buildChatGroundingLayers` → `buildChatSystemPromptStack` → primary/fallback stream →
 * finalize → `persistChatAssistantMessage` → `runPlaybookPostResponseTransition`.
 */

export async function runChatPostPipeline(req: Request): Promise<Response> {
  const start = Date.now();
  const clientIdentity = clientIdentityFromRequest(req);
  const clientIp = clientIdentity.replace(/^ip:/, "");

  const validatedStage = await validateChatPostRequestStage(req);
  if (validatedStage.outcome !== "ok") {
    return validatedStage.response;
  }

  const {
    parsed,
    studioSnapshotPayload,
    attachmentList,
    chatRequestId,
    traceId,
    requestedAssistantId,
  } = validatedStage.payload;

  const conversationStage = await resolveChatConversationForPost({
    req,
    clientIp,
    payload: {
      parsed,
      attachmentList,
      chatRequestId,
      traceId,
      requestedAssistantId,
    },
  });
  if (conversationStage.outcome !== "ok") {
    return conversationStage.response;
  }

  const {
    convoId,
    setCookieHeader,
    userMessage,
    assistantForPrompt,
    costWarning,
    chatGenLogCtx,
  } = conversationStage.value;

  const { message, preferences, conversationId, clientAttemptId } = parsed;

  const domainConfig = getDomainConfig();
  const convCfg = (domainConfig.conversation ?? {}) as {
    max_history?: number;
    summarize_after?: number;
    max_context_tokens?: number;
  };
  const maxHistory = convCfg.max_history ?? 50;

  const historyRows = await prisma.message.findMany({
    where: { conversationId: convoId },
    orderBy: { createdAt: "asc" },
    take: maxHistory,
  });
  const messagesForContext = historyRows.map(
    (m: { role: string; content: string }) => ({
      role: m.role,
      content: m.content,
    }),
  );

  let prefRecord: Record<string, string> = preferences ?? {};
  if (Object.keys(prefRecord).length === 0) {
    prefRecord = await getPreferencesAsRecord(prisma, convoId!);
  }

  const convoForProject = await prisma.conversation.findUnique({
    where: { id: convoId! },
    select: { projectId: true },
  });
  let designWorkflowStage: WorkflowStageId | null = null;
  let projectIntel: Awaited<
    ReturnType<typeof buildProjectIntelligenceContext>
  > | null = null;
  if (convoForProject?.projectId) {
    await maybeAutoAdvanceProjectWorkflow(prisma, convoForProject.projectId, {
      messageCount: historyRows.length,
      preferences: prefRecord,
      userMessage: message,
    });
    projectIntel = await buildProjectIntelligenceContext(
      prisma,
      convoForProject.projectId,
      {
        userMessage: message,
        messageCount: historyRows.length,
        preferences: prefRecord,
      },
    );
    designWorkflowStage = projectIntel?.workflowStage ?? null;
  }

  if (process.env.DEBUG_CHAT_TRACE === "1") {
    logChatGeneration("info", "chat_debug_trace_request", chatGenLogCtx, {
      messageLength: message.length,
      hasConversationId: Boolean(conversationId),
    });
  }

  // ── Playbook: resolve active node ───────────────────────────────
  const playbook = await getActiveNode(convoId!);
  let nodeConfig = { ...playbook.config };
  let activeNode = playbook.node;

  // If this is the first message and the playbook has a start node, ensure we're on it
  const messageCount = historyRows.length;
  let firstMessageTransitioned = false;
  if (
    activeNode &&
    playbook.graph &&
    messageCount <= 1 &&
    !activeNode.config?.requiredFields?.length
  ) {
    // Evaluate "first_message" transitions from start node
    const firstTransition = evaluateTransitions(
      playbook.graph,
      activeNode,
      prefRecord,
      message,
      messageCount,
      null,
    );
    if (firstTransition.shouldTransition && firstTransition.nextNode) {
      await transitionTo(
        convoId!,
        activeNode.id,
        firstTransition.nextNode.id,
        firstTransition.firedEdge?.id ?? null,
        firstTransition.reason,
      );
      // Update references to the new node
      activeNode = firstTransition.nextNode;
      nodeConfig = { ...playbook.config, ...firstTransition.nextNode.config };
      firstMessageTransitioned = true;
    }
  }

  const policy = checkPolicy(message, prefRecord, nodeConfig.requiredFields);
  if (policy.blocked && policy.clarificationMessage) {
    await persistChatAssistantMessage({
      conversationId: convoId!,
      content: policy.clarificationMessage,
    });
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          new TextEncoder().encode(policy.clarificationMessage!),
        );
        controller.close();
      },
    });
    return new Response(stream, {
      headers: {
        [CHAT_OUTBOUND_HTTP.CONTENT_TYPE]:
          CHAT_OUTBOUND_HTTP.CONTENT_TYPE_TEXT_PLAIN_UTF8,
        [CHAT_RESPONSE_HEADER.REQUEST_ID]: chatRequestId,
        ...(clientAttemptId
          ? { [CHAT_RESPONSE_HEADER.CLIENT_ATTEMPT_ID]: clientAttemptId }
          : {}),
        ...(convoId ? { [CHAT_OUTBOUND_HTTP.CONVERSATION_ID]: convoId } : {}),
        [CHAT_OUTBOUND_HTTP.USER_MESSAGE_ID]: userMessage.id,
      },
    });
  }

  const { systemSuffix, messages } = await buildContext(
    messagesForContext,
    prefRecord,
    {
      maxContextTokens: convCfg.max_context_tokens,
      summarizeAfter: convCfg.summarize_after,
    },
  );

  const grounding = await buildChatGroundingLayers({
    attachmentList,
    chatGenLogCtx,
    abortSignal: req.signal,
    message,
    prefRecord,
    nodeConfig,
  });

  const { systemPrompt, modelMessages } = buildChatSystemPromptStack(
    {
      domainConfig,
      systemSuffix,
      message,
      studioSnapshotPayload,
      assistantForPrompt,
      designWorkflowStage,
      projectIntel,
      playbookNodeConfig: nodeConfig,
      grounding,
    },
    messages,
  );

  const retrievalQuality = grounding.retrievalQuality;
  const attachmentGrounding = grounding.attachmentGrounding;

  const coreGeneration = {
    system: systemPrompt,
    messages: modelMessages,
    abortSignal: req.signal,
  };

  const buildStreamOptions = createChatOpenAiStreamOptionBuilder({
    coreGeneration,
    chatGenLogCtx,
    conversationId: convoId,
  });

  const streamInit = await runChatPrimaryFallbackStreamText({
    buildStreamOptions,
    chatGenLogCtx,
    chatRequestId,
    clientAttemptId,
  });
  if (streamInit.outcome === "error") {
    return streamInit.response;
  }

  const { result, primaryStreamAttempted, fallbackStreamAttempted } =
    streamInit;
  let streamModelUsed = streamInit.streamModelUsed;

  const responseHeaders = buildChatStreamResponseHeaders({
    chatRequestId,
    clientAttemptId,
    conversationId: convoId,
    userMessageId: userMessage.id,
    costWarning,
    setCookieHeader,
    retrievalQuality,
    studioSnapshotPayload,
    attachmentGrounding,
  });

  const recoveryModelIds = buildChatRecoveryGenerateTextModelQueue();

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      let acc = "";
      let accIsTerminalFailureCopy = false;
      let usedFallbackStream = false;

      async function pumpTextStream(
        textStream: AsyncIterable<string>,
      ): Promise<void> {
        for await (const delta of textStream) {
          acc += delta;
          controller.enqueue(encoder.encode(delta));
        }
      }

      async function recoverFromAggregatedTextIfNeeded(
        streamResult: { text: PromiseLike<string> },
        modelId: string,
        phase?: string,
      ): Promise<void> {
        if (acc.trim()) return;
        try {
          const aggregated = await streamResult.text;
          const aggTrim = (aggregated ?? "").trim();
          if (!aggTrim) return;
          acc = aggTrim;
          controller.enqueue(encoder.encode(aggTrim));
          log({
            level: "info",
            event: "chat_stream_recovered_from_aggregated_text",
            conversationId: convoId,
            model: modelId,
            length: aggTrim.length,
            ...(phase ? { phase } : {}),
          });
        } catch (aggErr) {
          log({
            level: "warn",
            event: "chat_aggregated_text_unavailable",
            conversationId: convoId,
            model: modelId,
            error: String(aggErr),
          });
        }
      }

      let recoveryLoopEntered = false;
      try {
        try {
          await pumpTextStream(result.textStream);
        } catch (streamErr: unknown) {
          const aborted =
            req.signal.aborted ||
            (streamErr instanceof Error && streamErr.name === "AbortError");
          if (aborted) {
            logChatGenerationFailure(
              "warn",
              CHAT_GENERATION_TELEMETRY.CLIENT_ABORT,
              chatGenLogCtx,
              CHAT_GENERATION_FAILURE.CLIENT_ABORT,
              {
                model: streamModelUsed,
                partialStreamLength: acc.length,
              },
            );
          } else {
            logChatGenerationFailure(
              "error",
              CHAT_GENERATION_TELEMETRY.STREAM_INTERRUPTED,
              chatGenLogCtx,
              CHAT_GENERATION_FAILURE.STREAM_INTERRUPTED,
              {
                model: streamModelUsed,
                partialStreamLength: acc.length,
                error: String(streamErr),
              },
            );
          }
          throw streamErr;
        }

        await recoverFromAggregatedTextIfNeeded(result, streamModelUsed);

        if (!acc.trim() && streamModelUsed === OPENAI_PRIMARY_MODEL) {
          logChatGenerationFailure(
            "warn",
            CHAT_GENERATION_TELEMETRY.PRIMARY_STREAM_EMPTY,
            chatGenLogCtx,
            CHAT_GENERATION_FAILURE.PRIMARY_STREAM_EMPTY,
            {
              model: streamModelUsed,
              streamRawLength: 0,
              primaryStreamAttempted,
            },
          );
          logChatGeneration(
            "info",
            CHAT_GENERATION_TELEMETRY.FALLBACK_STREAM_STARTED,
            chatGenLogCtx,
            {
              reason: "empty_primary_body",
              model: OPENAI_FALLBACK_MODEL,
            },
          );
          try {
            const fbResult = await streamText({
              model: openai(OPENAI_FALLBACK_MODEL),
              ...buildStreamOptions(OPENAI_FALLBACK_MODEL),
              maxRetries: CHAT_STREAM_FALLBACK_MAX_RETRIES,
            });
            streamModelUsed = OPENAI_FALLBACK_MODEL;
            usedFallbackStream = true;
            await pumpTextStream(fbResult.textStream);
            await recoverFromAggregatedTextIfNeeded(
              fbResult,
              OPENAI_FALLBACK_MODEL,
              "after_fallback_stream",
            );
          } catch (fbErr) {
            logChatGenerationFailure(
              "warn",
              CHAT_GENERATION_TELEMETRY.FALLBACK_STREAM_FAILED,
              chatGenLogCtx,
              CHAT_GENERATION_FAILURE.FALLBACK_STREAM_EXCEPTION,
              { error: String(fbErr), model: OPENAI_FALLBACK_MODEL },
            );
          }
          if (acc.trim()) {
            logChatGeneration(
              "info",
              "chat_empty_stream_fallback_recovered",
              chatGenLogCtx,
              {
                streamRawLength: acc.length,
                model: OPENAI_FALLBACK_MODEL,
              },
            );
          } else {
            logChatGenerationFailure(
              "warn",
              CHAT_GENERATION_TELEMETRY.FALLBACK_STREAM_EMPTY,
              chatGenLogCtx,
              CHAT_GENERATION_FAILURE.FALLBACK_STREAM_EMPTY,
              {
                streamRawLength: 0,
                model: OPENAI_FALLBACK_MODEL,
                usedFallbackStream: true,
              },
            );
          }
        } else if (!acc.trim()) {
          logChatGenerationFailure(
            "warn",
            CHAT_GENERATION_TELEMETRY.FALLBACK_STREAM_EMPTY,
            chatGenLogCtx,
            CHAT_GENERATION_FAILURE.FALLBACK_STREAM_EMPTY,
            {
              streamRawLength: 0,
              model: streamModelUsed,
              note: "started_on_fallback_or_primary_empty",
            },
          );
        }

        if (!acc.trim()) {
          recoveryLoopEntered = true;
          logChatGeneration(
            "warn",
            "chat_empty_stream_attempt_generateText_recovery",
            chatGenLogCtx,
            {
              streamModelUsed,
              recoveryModelsQueued: recoveryModelIds.length,
            },
          );
          const recoveryDeadline =
            Date.now() + CHAT_STREAM_RECOVERY_GENERATE_TEXT_TIMEOUT_MS;
          let recoveredText: string | null = null;
          let recoveredModel: string | null = null;
          let recoveredUsage: ReturnType<typeof toUsageLike> | null = null;

          for (const modelId of recoveryModelIds) {
            if (req.signal.aborted) {
              logChatGenerationFailure(
                "warn",
                CHAT_GENERATION_TELEMETRY.CLIENT_ABORT,
                chatGenLogCtx,
                CHAT_GENERATION_FAILURE.CLIENT_ABORT,
                { phase: "recovery_loop", model: modelId },
              );
              break;
            }
            if (Date.now() >= recoveryDeadline) {
              logChatGeneration(
                "warn",
                "chat_recovery_timeout",
                chatGenLogCtx,
                {
                  elapsedMs: CHAT_STREAM_RECOVERY_GENERATE_TEXT_TIMEOUT_MS,
                },
              );
              break;
            }

            logChatGeneration(
              "info",
              CHAT_GENERATION_TELEMETRY.RECOVERY_GENERATE_TEXT_ATTEMPT,
              chatGenLogCtx,
              { model: modelId },
            );

            try {
              const gt = await generateText({
                model: openai(modelId),
                ...coreGeneration,
                maxRetries: CHAT_STREAM_RECOVERY_GENERATE_TEXT_MAX_RETRIES,
                temperature: CHAT_STREAM_RECOVERY_GENERATE_TEXT_TEMPERATURE,
                abortSignal: req.signal,
              });
              const raw = gt.text ?? "";
              const fin = finalizeChatModelOutput(raw);
              logChatGeneration(
                "info",
                "chat_recovery_generateText_result",
                chatGenLogCtx,
                {
                  model: modelId,
                  rawTextLength: fin.rawLength,
                  finalizedTextLength: fin.finalizedLength,
                  strictSanitizationCollapsed: fin.strictSanitizationCollapsed,
                  usedLenientFallback: fin.usedLenientFallback,
                  sanitizeCollapsedToEmpty: fin.sanitizeCollapsedToEmpty,
                },
              );

              if (fin.text.trim()) {
                recoveredText = fin.text;
                recoveredModel = modelId;
                recoveredUsage = gt.usage ? toUsageLike(gt.usage) : null;
                if (fin.usedLenientFallback) {
                  logChatGenerationFailure(
                    "warn",
                    CHAT_GENERATION_TELEMETRY.SANITIZATION_COLLAPSED_OUTPUT,
                    chatGenLogCtx,
                    CHAT_GENERATION_FAILURE.SANITIZATION_COLLAPSED_OUTPUT,
                    {
                      model: modelId,
                      phase: "generateText_recovery",
                      rawTextLength: fin.rawLength,
                    },
                  );
                }
                logChatGeneration(
                  "info",
                  CHAT_GENERATION_TELEMETRY.RECOVERY_GENERATE_TEXT_SUCCESS,
                  chatGenLogCtx,
                  { model: modelId },
                );
                break;
              }

              logChatGenerationFailure(
                "warn",
                CHAT_GENERATION_TELEMETRY.RECOVERY_GENERATE_TEXT_BLANK,
                chatGenLogCtx,
                CHAT_GENERATION_FAILURE.RECOVERY_GENERATE_TEXT_BLANK,
                { model: modelId, rawTextLength: fin.rawLength },
              );
            } catch (attemptErr) {
              if (req.signal.aborted) break;
              logChatGenerationFailure(
                "warn",
                "chat_recovery_generateText_exception",
                chatGenLogCtx,
                CHAT_GENERATION_FAILURE.RECOVERY_GENERATE_TEXT_EXCEPTION,
                { model: modelId, error: String(attemptErr) },
              );
            }
          }

          if (recoveredText) {
            acc = recoveredText;
            controller.enqueue(encoder.encode(recoveredText));
            logChatGeneration(
              "info",
              "chat_empty_stream_recovered_generateText",
              chatGenLogCtx,
              {
                model: recoveredModel,
              },
            );
            if (convoId && recoveredUsage && recoveredModel) {
              const costUsd = computeCost(recoveredUsage, recoveredModel);
              void recordCost(
                convoId,
                recoveredModel,
                recoveredUsage.promptTokens ?? 0,
                recoveredUsage.completionTokens ?? 0,
                costUsd,
              );
            }
          } else {
            acc = CHAT_FAILURE_ALL_RECOVERY_EXHAUSTED;
            accIsTerminalFailureCopy = true;
            controller.enqueue(encoder.encode(acc));
            logChatGenerationFailure(
              "error",
              CHAT_GENERATION_TELEMETRY.FINAL_FAILURE_RETRYABLE,
              chatGenLogCtx,
              CHAT_GENERATION_FAILURE.FINAL_EMPTY_REPLY,
              {
                streamModelUsed,
                usedFallbackStream,
                recoveryModelsTried: recoveryModelIds.length,
                recoveryLoopEntered,
                userFacingCopy: "CHAT_FAILURE_ALL_RECOVERY_EXHAUSTED",
              },
            );
          }
        }

        let persisted: string;
        let persistFailureCategory: ChatGenerationFailureCategory | undefined;
        if (accIsTerminalFailureCopy) {
          persisted = CHAT_FAILURE_ALL_RECOVERY_EXHAUSTED;
          persistFailureCategory = CHAT_GENERATION_FAILURE.FINAL_EMPTY_REPLY;
        } else {
          const fin = finalizeChatModelOutput(acc);
          if (fin.text.trim()) {
            persisted = fin.text;
            if (fin.usedLenientFallback) {
              logChatGenerationFailure(
                "warn",
                CHAT_GENERATION_TELEMETRY.SANITIZATION_COLLAPSED_OUTPUT,
                chatGenLogCtx,
                CHAT_GENERATION_FAILURE.SANITIZATION_COLLAPSED_OUTPUT,
                {
                  phase: "persist_final",
                  streamRawLength: acc.length,
                  persistedLength: persisted.length,
                  sanitizeCollapsedToEmpty: fin.sanitizeCollapsedToEmpty,
                },
              );
            }
          } else if (acc.trim()) {
            logChatGenerationFailure(
              "warn",
              CHAT_GENERATION_TELEMETRY.SANITIZATION_COLLAPSED_OUTPUT,
              chatGenLogCtx,
              CHAT_GENERATION_FAILURE.SANITIZATION_COLLAPSED_OUTPUT,
              {
                phase: "persist_final_no_rescue",
                streamRawLength: acc.length,
              },
            );
            persisted = CHAT_FAILURE_SANITIZATION_EMPTIED;
            persistFailureCategory =
              CHAT_GENERATION_FAILURE.SANITIZATION_COLLAPSED_OUTPUT;
          } else {
            persisted = CHAT_FAILURE_ALL_RECOVERY_EXHAUSTED;
            persistFailureCategory = CHAT_GENERATION_FAILURE.FINAL_EMPTY_REPLY;
          }
        }

        await persistChatAssistantMessage({
          conversationId: convoId!,
          content: persisted,
        });
        logChatGeneration("info", "chat_response", chatGenLogCtx, {
          latencyMs: Date.now() - start,
          rawAggregateCharsBeforeFinalize: acc.length,
          persistedLength: persisted.length,
          sanitizeToEmpty:
            !accIsTerminalFailureCopy &&
            acc.trim().length > 0 &&
            persisted === CHAT_FAILURE_SANITIZATION_EMPTIED,
          accIsTerminalFailureCopy,
          persistFailureCategory,
          primaryStreamAttempted,
          fallbackStreamAttempted,
          recoveryLoopEntered,
          streamModelUsed,
          retrievalQuality,
          retrievalUnavailable: retrievalQuality === "unavailable",
          attachmentGroundingHeader: attachmentGrounding.responseHeaderValue,
          attachmentGroundingUnavailable:
            attachmentGrounding.responseHeaderValue === "unavailable",
          attachmentHasUsableSummaryText:
            attachmentGrounding.hasUsableGrounding,
          ...(persistFailureCategory
            ? {
                failureSurface: mapChatGenerationFailureToSurface(
                  persistFailureCategory,
                ),
              }
            : {}),
        });

        await runPlaybookPostResponseTransition({
          conversationId: convoId!,
          activeNode,
          playbookGraph: playbook.graph,
          userMessage: message,
          messageCount,
          firstMessageTransitioned,
        });
      } catch (err) {
        logChatGenerationFailure(
          "error",
          "chat_stream_pipeline_error",
          chatGenLogCtx,
          CHAT_GENERATION_FAILURE.UNKNOWN_CHAT_FAILURE,
          {
            error: String(err),
            phase: "stream_start_to_persist",
          },
        );
        controller.error(err instanceof Error ? err : new Error(String(err)));
        return;
      }
      controller.close();
    },
  });

  /** Raw stream to the browser; client applies {@link sanitizeAssistantStreamDisplay} while reading. */
  return new Response(stream, { headers: responseHeaders });
}
