import { assistantPersonaSummary } from "@/lib/eva/personas/catalog";
import { prisma } from "@/server/db";
import {
  extractPreferenceCandidates,
  persistPendingProposalsFromCandidates,
} from "@/server/preferences/preference-service";
import type { PreferenceProposalDto } from "@/server/preferences/preference-types";
import { toPreferenceProposalDto } from "@/server/preferences/preference-repository";
import { recordCostAndRecheck } from "@/server/ops/cost-guard";
import { scheduleImplicitSignalDetection } from "@/server/preferences/implicit-signals";
import { isChatProviderError } from "./chat-failure";
import { CHAT_GENERATION_STATUS } from "./chat-idempotency";
import { logChatOperationalEvent } from "./chat-ops";
import { streamChatProvider } from "./chat-provider";
import { canPersistPreferenceExtractions } from "./chat-rate-limit";
import { finalizeChatModelOutput } from "./chat-output-sanitize";
import {
  createSseResponse,
  encodeSseEvent,
  type ChatSseEvent,
} from "./chat-sse";
import { shouldPersistPreferenceProposals } from "./chat-message-pipeline";
import {
  finishTurn,
  persistGenerationAssistant,
  prepareTurn,
} from "./chat-turn-pipeline";

function sseChunk(event: ChatSseEvent): Uint8Array {
  return new TextEncoder().encode(encodeSseEvent(event));
}

function sseErrorResponse(error: string, message: string): Response {
  return createSseResponse(
    new ReadableStream({
      start(controller) {
        controller.enqueue(sseChunk({ type: "error", error, message }));
        controller.close();
      },
    }),
  );
}

/**
 * SSE message send: prepareTurn → stream deltas → persist → finishTurn.
 * Client Stop aborts `request.signal`; partial text is kept as status=stopped.
 */
export async function streamConversationMessageResponse(input: {
  userId: string;
  conversationId: string;
  content: string;
  messageSourceRaw?: string;
  clientMessageIdRaw: string;
  signal: AbortSignal;
  attachmentUploadIds?: string[];
  mode?: "full" | "copilot";
  pageContext?: {
    surface: "design" | "explore";
    snapshot?: Record<string, unknown>;
  };
  userEmail?: string | null;
}): Promise<Response> {
  const prepared = await prepareTurn({
    userId: input.userId,
    conversationId: input.conversationId,
    content: input.content,
    ...(input.messageSourceRaw !== undefined
      ? { messageSourceRaw: input.messageSourceRaw }
      : {}),
    clientMessageIdRaw: input.clientMessageIdRaw,
    ...(input.attachmentUploadIds
      ? { attachmentUploadIds: input.attachmentUploadIds }
      : {}),
    ...(input.mode ? { mode: input.mode } : {}),
    ...(input.pageContext ? { pageContext: input.pageContext } : {}),
    ...(input.userEmail !== undefined ? { userEmail: input.userEmail } : {}),
  });

  if (prepared.kind === "error") {
    return sseErrorResponse(prepared.error, prepared.message);
  }

  if (prepared.kind === "existing") {
    const persona = prepared.persona;
    const userMessage = await prisma.message.findUnique({
      where: { id: prepared.userMessageId },
      include: {
        generationAsUserMessage: { include: { assistantMessage: true } },
      },
    });
    const assistant = userMessage?.generationAsUserMessage?.assistantMessage;
    if (!userMessage || !assistant) {
      return sseErrorResponse(
        "generation_in_progress",
        "Eva is still replying to this conversation. Try again in a moment.",
      );
    }
    const proposals = await prisma.preferenceProposal.findMany({
      where: { sourceMessageId: userMessage.id },
      orderBy: { createdAt: "desc" },
    });
    return createSseResponse(
      new ReadableStream({
        start(controller) {
          controller.enqueue(
            sseChunk({
              type: "user",
              message: {
                id: userMessage.id,
                role: "user",
                content: userMessage.content,
                status: userMessage.status,
                createdAt: userMessage.createdAt.toISOString(),
              },
            }),
          );
          controller.enqueue(
            sseChunk({
              type: "done",
              userMessage: {
                id: userMessage.id,
                role: "user",
                content: userMessage.content,
                status: userMessage.status,
                createdAt: userMessage.createdAt.toISOString(),
              },
              assistantMessage: {
                id: assistant.id,
                role: "assistant",
                content: assistant.content,
                status: assistant.status,
                assistantId: assistant.assistantId,
                createdAt: assistant.createdAt.toISOString(),
              },
              assistantPersona: assistantPersonaSummary(persona),
              preferenceProposals: proposals.map(toPreferenceProposalDto),
            }),
          );
          controller.close();
        },
      }),
    );
  }

  if (prepared.kind === "short_circuit") {
    const { userMessage, assistantMessage, persona } = prepared;
    return createSseResponse(
      new ReadableStream({
        start(controller) {
          controller.enqueue(
            sseChunk({
              type: "user",
              message: {
                id: userMessage.id,
                role: "user",
                content: userMessage.content,
                status: userMessage.status,
                createdAt: userMessage.createdAt.toISOString(),
              },
            }),
          );
          controller.enqueue(
            sseChunk({
              type: "done",
              userMessage: {
                id: userMessage.id,
                role: "user",
                content: userMessage.content,
                status: userMessage.status,
                createdAt: userMessage.createdAt.toISOString(),
              },
              assistantMessage: {
                id: assistantMessage.id,
                role: "assistant",
                content: assistantMessage.content,
                status: assistantMessage.status,
                assistantId: persona.id,
                createdAt: assistantMessage.createdAt.toISOString(),
              },
              assistantPersona: assistantPersonaSummary(persona),
              preferenceProposals: [],
            }),
          );
          controller.close();
        },
      }),
    );
  }

  const {
    trimmed,
    messageSource,
    persona,
    providerName,
    provider,
    userMessage,
    generationId,
    startedAt,
    costWarning,
    memoryEnabled,
    confirmedPreferences,
    conversationTitle,
    providerInput: baseProviderInput,
    messagesForSummaryRefresh,
  } = prepared;

  const extractPromise = extractPreferenceCandidates({
    memoryEnabled,
    messageSource,
    content: trimmed,
    currentPreferences: confirmedPreferences,
    userId: input.userId,
    conversationId: input.conversationId,
  }).catch(() => [] as Awaited<ReturnType<typeof extractPreferenceCandidates>>);

  scheduleImplicitSignalDetection({
    userId: input.userId,
    conversationId: input.conversationId,
    message: trimmed,
    confirmedPreferences,
  });

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const push = (event: ChatSseEvent) => {
        controller.enqueue(sseChunk(event));
      };

      push({
        type: "user",
        message: {
          id: userMessage.id,
          role: "user",
          content: userMessage.content,
          status: userMessage.status,
          createdAt: userMessage.createdAt.toISOString(),
        },
      });

      if (costWarning) {
        push({ type: "meta", costWarning: true });
      }

      let assembled = "";
      let model: string | null = null;
      let promptTokens: number | null = null;
      let completionTokens: number | null = null;
      let costUsd: number | null = null;
      let requestId: string | null = null;
      let aborted = false;

      const providerInput = {
        ...baseProviderInput,
        signal: input.signal,
      };

      try {
        for await (const chunk of streamChatProvider(provider, providerInput)) {
          if (input.signal.aborted) {
            aborted = true;
            break;
          }
          if (chunk.toolActivity) {
            push({
              type: "tool_activity",
              tool: chunk.toolActivity.tool,
              status: chunk.toolActivity.status,
            });
          }
          if (chunk.text) {
            assembled += chunk.text;
            push({ type: "delta", text: chunk.text });
          }
          if (chunk.model) model = chunk.model;
          if (chunk.promptTokens != null) promptTokens = chunk.promptTokens;
          if (chunk.completionTokens != null) {
            completionTokens = chunk.completionTokens;
          }
          if (chunk.costUsd != null) costUsd = chunk.costUsd;
          if (chunk.requestId) requestId = chunk.requestId;
          if (chunk.done) break;
        }
      } catch (error) {
        if (input.signal.aborted) {
          aborted = true;
        } else {
          const message = isChatProviderError(error)
            ? error.message
            : "I could not generate a reply just now. Your message was saved — please try again.";
          const failed = await persistGenerationAssistant({
            conversationId: input.conversationId,
            conversationTitle,
            trimmedUserContent: trimmed,
            generationId,
            userMessageId: userMessage.id,
            assistantId: persona.id,
            content: message,
            status: "failed",
            errorCode: isChatProviderError(error)
              ? error.category
              : "provider_failed",
            generation: {
              status: CHAT_GENERATION_STATUS.failed,
              errorCode: isChatProviderError(error)
                ? error.category
                : "provider_failed",
            },
            touchConversation: false,
          });
          push({
            type: "error",
            error: "provider_failed",
            message: failed.content,
          });
          controller.close();
          return;
        }
      }

      const extracted = await extractPromise;
      finishTurn({
        shadow: {
          userId: input.userId,
          conversationId: input.conversationId,
          content: trimmed,
          currentPreferences: confirmedPreferences,
          heuristicCandidateCount: extracted.length,
        },
      });

      if (aborted || input.signal.aborted) {
        const partial =
          assembled.trim() ||
          "Generation stopped. Send another message to continue.";
        const stopped = await persistGenerationAssistant({
          conversationId: input.conversationId,
          conversationTitle,
          trimmedUserContent: trimmed,
          generationId,
          userMessageId: userMessage.id,
          assistantId: persona.id,
          content: partial,
          status: "stopped",
          errorCode: "client_aborted",
          generation: {
            status: CHAT_GENERATION_STATUS.failed,
            errorCode: "client_aborted",
            model,
            promptTokens,
            completionTokens,
            costUsd,
            requestId,
          },
        });
        logChatOperationalEvent({
          event: "chat_send_failed",
          userId: input.userId,
          conversationId: input.conversationId,
          provider: providerName,
          latencyMs: Date.now() - startedAt,
          errorCategory: "client_aborted",
          outcome: "stopped",
        });
        push({
          type: "stopped",
          assistantMessage: {
            id: stopped.id,
            role: "assistant",
            content: stopped.content,
            status: stopped.status,
            assistantId: persona.id,
            createdAt: stopped.createdAt.toISOString(),
          },
        });
        controller.close();
        return;
      }

      const finalized = finalizeChatModelOutput(assembled);
      const replyContent = finalized.text.trim();
      if (!replyContent) {
        push({
          type: "error",
          error: "provider_failed",
          message: "Empty reply after streaming.",
        });
        await prisma.chatGeneration.update({
          where: { id: generationId },
          data: {
            status: CHAT_GENERATION_STATUS.failed,
            errorCode: "final_empty_reply",
            completedAt: new Date(),
          },
        });
        controller.close();
        return;
      }

      const assistantMessage = await persistGenerationAssistant({
        conversationId: input.conversationId,
        conversationTitle,
        trimmedUserContent: trimmed,
        generationId,
        userMessageId: userMessage.id,
        assistantId: persona.id,
        content: replyContent,
        status: "complete",
        generation: {
          status: CHAT_GENERATION_STATUS.complete,
          model,
          promptTokens,
          completionTokens,
          costUsd,
          requestId,
        },
      });

      finishTurn({
        summary: {
          userId: input.userId,
          conversationId: input.conversationId,
          messagesForSummaryRefresh,
          assistantContent: replyContent,
        },
      });

      if (
        model &&
        ((promptTokens ?? 0) > 0 ||
          (completionTokens ?? 0) > 0 ||
          (costUsd ?? 0) > 0)
      ) {
        await recordCostAndRecheck({
          userId: input.userId,
          conversationId: input.conversationId,
          model,
          kind: "chat",
          usage: {
            promptTokens: promptTokens ?? 0,
            completionTokens: completionTokens ?? 0,
          },
        }).catch(() => {
          /* cost ledger must not fail the reply */
        });
      }

      let proposals: PreferenceProposalDto[] = [];
      if (
        shouldPersistPreferenceProposals({
          chatOk: true,
          replyContent,
          extractionOk: true,
          candidateCount: extracted.length,
        }) &&
        (await canPersistPreferenceExtractions({ userId: input.userId }))
      ) {
        try {
          proposals = await persistPendingProposalsFromCandidates({
            userId: input.userId,
            conversationId: input.conversationId,
            sourceMessageId: userMessage.id,
            displayMessageId: assistantMessage.id,
            candidates: extracted,
            currentPreferences: confirmedPreferences,
          });
        } catch {
          proposals = [];
        }
      }

      logChatOperationalEvent({
        event: "chat_send_ok",
        userId: input.userId,
        conversationId: input.conversationId,
        provider: providerName,
        model,
        latencyMs: Date.now() - startedAt,
        outcome: "complete",
        promptTokens,
        completionTokens,
        costUsd,
        proposalCount: proposals.length,
      });

      push({
        type: "done",
        userMessage: {
          id: userMessage.id,
          role: "user",
          content: userMessage.content,
          status: userMessage.status,
          createdAt: userMessage.createdAt.toISOString(),
        },
        assistantMessage: {
          id: assistantMessage.id,
          role: "assistant",
          content: assistantMessage.content,
          status: assistantMessage.status,
          assistantId: persona.id,
          createdAt: assistantMessage.createdAt.toISOString(),
        },
        assistantPersona: assistantPersonaSummary(persona),
        preferenceProposals: proposals,
      });
      controller.close();
    },
  });

  return createSseResponse(stream);
}
