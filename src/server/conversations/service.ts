import {
  assistantPersonaSummary,
  getAssistantPersonaById,
  normalizeAssistantPersonaId,
} from "@/lib/eva/personas/catalog";
import type { AssistantPersonaDefinition } from "@/lib/eva/personas/persona-types";
import type { AssistantPersonaSummary } from "@/lib/eva/personas/persona-types";
import { displayConversationTitle } from "@/lib/conversations/conversation-title";
import { prisma } from "@/server/db";
import { err, ok, type ServiceResult } from "@/server/result";
import { assertRowQuota, maxConversationsPerUser } from "@/server/quota";
import { CHAT_GENERATION_STATUS } from "./chat-idempotency";
import {
  CHAT_FAILURE_AI_TEMPORARILY_UNAVAILABLE,
  CHAT_FAILURE_EMPTY_REPLY,
  CHAT_FAILURE_REQUEST_TIMEOUT,
  CHAT_FAILURE_SANITIZATION_EMPTIED,
} from "./chat-copy";
import { CHAT_GENERATION_FAILURE, isChatProviderError } from "./chat-failure";
import {
  extractPreferenceCandidates,
  persistPendingProposalsFromCandidates,
} from "@/server/preferences/preference-service";
import { toPreferenceProposalDto } from "@/server/preferences/preference-repository";
import { type PreferenceProposalDto } from "@/server/preferences/preference-types";
import {
  runParallelChatAndExtraction,
  shouldPersistPreferenceProposals,
} from "./chat-message-pipeline";
import type { ChatProviderResult } from "./chat-provider";
import type { ExtractedPreferenceCandidate } from "@/server/preferences/preference-types";
import { canPersistPreferenceExtractions } from "./chat-rate-limit";
import { logChatOperationalEvent } from "./chat-ops";
import { recordCostAndRecheck } from "@/server/ops/cost-guard";
import { scheduleImplicitSignalDetection } from "@/server/preferences/implicit-signals";
import {
  finishTurn,
  persistGenerationAssistant,
  prepareTurn,
} from "./chat-turn-pipeline";

type ConversationListItem = {
  id: string;
  title: string;
  status: string;
  projectId: string | null;
  projectName: string | null;
  preview: string | null;
  messageCount: number;
  updatedAt: string;
};

type ListConversationsOptions = {
  cursor?: string | null;
  query?: string | null;
  status?: string | null;
  limit?: number;
};

type ListConversationsResult = {
  items: ConversationListItem[];
  nextCursor: string | null;
};

function encodeConversationCursor(updatedAt: Date, id: string): string {
  return Buffer.from(`${updatedAt.toISOString()}|${id}`, "utf8").toString(
    "base64url",
  );
}

function decodeConversationCursor(
  cursor: string,
): { updatedAt: Date; id: string } | null {
  try {
    const raw = Buffer.from(cursor, "base64url").toString("utf8");
    const sep = raw.indexOf("|");
    if (sep <= 0) return null;
    const updatedAt = new Date(raw.slice(0, sep));
    const id = raw.slice(sep + 1);
    if (!id || Number.isNaN(updatedAt.getTime())) return null;
    return { updatedAt, id };
  } catch {
    return null;
  }
}

export async function listConversations(
  userId: string,
  options: ListConversationsOptions = {},
): Promise<ListConversationsResult> {
  const limit = Math.min(Math.max(options.limit ?? 50, 1), 100);
  const query = options.query?.trim() || null;
  const status = options.status?.trim().toLowerCase() || null;
  const cursor = options.cursor
    ? decodeConversationCursor(options.cursor)
    : null;

  const rows = await prisma.conversation.findMany({
    where: {
      userId,
      ...(status ? { status } : {}),
      ...(query
        ? { title: { contains: query, mode: "insensitive" as const } }
        : {}),
      ...(cursor
        ? {
            OR: [
              { updatedAt: { lt: cursor.updatedAt } },
              {
                updatedAt: cursor.updatedAt,
                id: { lt: cursor.id },
              },
            ],
          }
        : {}),
    },
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    take: limit + 1,
    include: {
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { content: true, createdAt: true },
      },
      project: { select: { id: true, name: true } },
      _count: { select: { messages: true } },
    },
  });

  const page = rows.slice(0, limit);
  const hasMore = rows.length > limit;
  const last = page[page.length - 1];

  return {
    items: page.map((row) => ({
      id: row.id,
      title: displayConversationTitle(
        row.title,
        row.messages[0]?.content ?? null,
      ),
      status: row.status,
      projectId: row.projectId,
      projectName: row.project?.name ?? null,
      preview: row.messages[0]?.content ?? null,
      messageCount: row._count.messages,
      updatedAt: row.updatedAt.toISOString(),
    })),
    nextCursor:
      hasMore && last
        ? encodeConversationCursor(last.updatedAt, last.id)
        : null,
  };
}

export async function getConversation(
  userId: string,
  conversationId: string,
): Promise<
  ServiceResult<
    {
      id: string;
      title: string;
      status: string;
      projectId: string | null;
      workflowStage: string;
      messages: Array<{
        id: string;
        role: string;
        content: string;
        status: string;
        errorCode: string | null;
        assistantId: string | null;
        createdAt: string;
        feedback: string | null;
      }>;
    },
    "not_found"
  >
> {
  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, userId },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
        include: { feedback: { select: { rating: true } } },
      },
    },
  });
  if (!conversation) {
    return err("not_found", "Conversation not found.");
  }

  return ok({
    id: conversation.id,
    title: conversation.title,
    status: conversation.status,
    projectId: conversation.projectId,
    workflowStage: conversation.workflowStage,
    messages: conversation.messages.map((message) => ({
      id: message.id,
      role: message.role,
      content: message.content,
      status: message.status,
      errorCode: message.errorCode,
      assistantId: message.assistantId,
      createdAt: message.createdAt.toISOString(),
      feedback: message.feedback?.rating ?? null,
    })),
  });
}

export async function createConversation(
  userId: string,
  title?: string,
): Promise<ServiceResult<{ id: string }, "rate_limited">> {
  const quota = await assertRowQuota(
    () => prisma.conversation.count({ where: { userId } }),
    maxConversationsPerUser(),
    "conversations",
  );
  if (!quota.ok) return quota;
  const conversation = await prisma.conversation.create({
    data: {
      userId,
      title: title?.trim() || "New conversation",
      status: "active",
    },
  });
  return ok({ id: conversation.id });
}

export async function updateConversation(
  userId: string,
  conversationId: string,
  input: { title?: string; projectId?: string | null },
): Promise<
  ServiceResult<
    { id: string; title: string; projectId: string | null },
    "not_found" | "validation"
  >
> {
  const existing = await prisma.conversation.findFirst({
    where: { id: conversationId, userId },
    select: { id: true },
  });
  if (!existing) {
    return err("not_found", "Conversation not found.");
  }

  const data: { title?: string; projectId?: string | null } = {};

  if (input.title !== undefined) {
    const title = input.title.trim();
    if (!title) {
      return err("validation", "Title cannot be empty.", {
        title: "Enter a title.",
      });
    }
    if (title.length > 120) {
      return err("validation", "Title is too long.", {
        title: "Use 120 characters or fewer.",
      });
    }
    data.title = title;
  }

  if (input.projectId !== undefined) {
    if (input.projectId === null) {
      data.projectId = null;
    } else {
      const project = await prisma.project.findFirst({
        where: {
          id: input.projectId,
          OR: [{ ownerId: userId }, { members: { some: { userId } } }],
        },
        select: { id: true },
      });
      if (!project) {
        return err("validation", "Project not found.", {
          projectId: "Choose a valid project.",
        });
      }
      data.projectId = project.id;
    }
  }

  if (Object.keys(data).length === 0) {
    return err("validation", "Nothing to update.");
  }

  const updated = await prisma.conversation.update({
    where: { id: conversationId },
    data,
    select: { id: true, title: true, projectId: true },
  });

  return ok(updated);
}

export async function deleteConversation(
  userId: string,
  conversationId: string,
): Promise<ServiceResult<{ id: string }, "not_found">> {
  const existing = await prisma.conversation.findFirst({
    where: { id: conversationId, userId },
    select: { id: true },
  });
  if (!existing) {
    return err("not_found", "Conversation not found.");
  }

  await prisma.conversation.delete({ where: { id: conversationId } });
  return ok({ id: conversationId });
}

type SendConversationMessageResponse = {
  userMessage: {
    id: string;
    role: "user";
    content: string;
    status: string;
    createdAt: string;
  };
  assistantMessage: {
    id: string;
    role: "assistant";
    content: string;
    status: string;
    assistantId: string;
    createdAt: string;
  };
  assistantPersona: AssistantPersonaSummary;
  preferenceProposals: PreferenceProposalDto[];
};

type SendConversationMessageError =
  | "not_found"
  | "validation"
  | "forbidden"
  | "provider_failed"
  | "generation_in_progress"
  | "rate_limited"
  | "daily_limit"
  | "cost_limit"
  | "provider_unavailable"
  | "moderation_rejected";

async function buildResponseForUserMessage(input: {
  userMessageId: string;
  persona: AssistantPersonaDefinition;
}): Promise<
  ServiceResult<
    SendConversationMessageResponse,
    "generation_in_progress" | "not_found"
  >
> {
  const userMessage = await prisma.message.findUnique({
    where: { id: input.userMessageId },
    include: {
      generationAsUserMessage: {
        include: { assistantMessage: true },
      },
    },
  });
  if (!userMessage) {
    return err("not_found", "Message not found.");
  }

  const generation = userMessage.generationAsUserMessage;
  if (!generation || generation.status === CHAT_GENERATION_STATUS.pending) {
    return err(
      "generation_in_progress",
      "Eva is still replying to this conversation. Try again in a moment.",
    );
  }

  const assistantMessage = generation.assistantMessage;
  if (!assistantMessage) {
    return err(
      "generation_in_progress",
      "Eva is still replying to this conversation. Try again in a moment.",
    );
  }

  const proposals = await prisma.preferenceProposal.findMany({
    where: { sourceMessageId: userMessage.id },
    orderBy: { createdAt: "desc" },
  });

  const persona =
    getAssistantPersonaById(
      normalizeAssistantPersonaId(assistantMessage.assistantId),
    ) ?? input.persona;

  return ok({
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
      assistantId: assistantMessage.assistantId ?? persona.id,
      createdAt: assistantMessage.createdAt.toISOString(),
    },
    assistantPersona: assistantPersonaSummary(persona),
    preferenceProposals: proposals.map(toPreferenceProposalDto),
  });
}

/**
 * JSON send: prepareTurn → generate+extract → persist → finishTurn.
 * Provider calls stay outside long DB txs.
 */
export async function sendConversationMessage(
  userId: string,
  conversationId: string,
  content: string,
  messageSourceRaw: string = "typed",
  clientMessageIdRaw?: string,
  options?: {
    attachmentUploadIds?: string[];
    mode?: "full" | "copilot";
    pageContext?: {
      surface: "design" | "explore";
      snapshot?: Record<string, unknown>;
    };
    userEmail?: string | null;
  },
): Promise<
  ServiceResult<SendConversationMessageResponse, SendConversationMessageError>
> {
  const prepared = await prepareTurn({
    userId,
    conversationId,
    content,
    messageSourceRaw,
    clientMessageIdRaw: clientMessageIdRaw ?? "",
    ...(options?.attachmentUploadIds
      ? { attachmentUploadIds: options.attachmentUploadIds }
      : {}),
    ...(options?.mode ? { mode: options.mode } : {}),
    ...(options?.pageContext ? { pageContext: options.pageContext } : {}),
    ...(options?.userEmail !== undefined
      ? { userEmail: options.userEmail }
      : {}),
  });

  if (prepared.kind === "error") {
    return err(prepared.error, prepared.message, prepared.details);
  }

  if (prepared.kind === "existing") {
    return buildResponseForUserMessage({
      userMessageId: prepared.userMessageId,
      persona: prepared.persona,
    });
  }

  if (prepared.kind === "short_circuit") {
    const { userMessage, assistantMessage, persona, startedAt } = prepared;
    if (prepared.reason === "design_brief") {
      logChatOperationalEvent({
        event: prepared.briefOk ? "chat_send_ok" : "chat_send_failed",
        userId,
        conversationId,
        provider: "design_brief",
        model: "design_brief",
        latencyMs: Date.now() - startedAt,
        outcome: prepared.briefOk
          ? "design_brief"
          : (prepared.briefError ?? "design_brief_failed"),
        proposalCount: 0,
      });
    } else {
      logChatOperationalEvent({
        event: "chat_send_ok",
        userId,
        conversationId,
        provider: "policy",
        model: "policy",
        latencyMs: Date.now() - startedAt,
        outcome: "policy_clarification",
        proposalCount: 0,
      });
    }
    return ok({
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
    });
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
    memoryEnabled,
    confirmedPreferences,
    conversationTitle,
    providerInput,
    messagesForSummaryRefresh,
  } = prepared;

  const parallel = await runParallelChatAndExtraction({
    generate: () => provider.generate(providerInput),
    extract: () =>
      extractPreferenceCandidates({
        memoryEnabled,
        messageSource,
        content: trimmed,
        currentPreferences: confirmedPreferences,
        userId,
        conversationId,
      }),
  });

  if (parallel.extraction.status === "rejected") {
    console.error("[preference-extraction] parallel failed", {
      reason:
        parallel.extraction.reason instanceof Error
          ? parallel.extraction.reason.name
          : "unknown",
    });
  }

  const extractedCandidates: ExtractedPreferenceCandidate[] =
    parallel.extraction.status === "fulfilled" ? parallel.extraction.value : [];

  finishTurn({
    shadow: {
      userId,
      conversationId,
      content: trimmed,
      currentPreferences: confirmedPreferences,
      heuristicCandidateCount: extractedCandidates.length,
    },
  });
  scheduleImplicitSignalDetection({
    userId,
    conversationId,
    message: trimmed,
    confirmedPreferences,
  });

  if (parallel.chat.status === "rejected") {
    const error = parallel.chat.reason;
    const failureCode = isChatProviderError(error)
      ? error.category
      : error instanceof Error && error.message === "chat_timeout"
        ? CHAT_GENERATION_FAILURE.PROVIDER_TIMEOUT
        : error instanceof Error && error.message === "empty_provider_content"
          ? CHAT_GENERATION_FAILURE.FINAL_EMPTY_REPLY
          : "provider_failed";
    const failureContent = isChatProviderError(error)
      ? error.message
      : error instanceof Error && error.message === "chat_timeout"
        ? CHAT_FAILURE_REQUEST_TIMEOUT
        : error instanceof Error && error.message === "empty_provider_content"
          ? CHAT_FAILURE_EMPTY_REPLY
          : "I could not generate a reply just now. Your message was saved — please try again.";

    const failedAssistant = await persistGenerationAssistant({
      conversationId,
      conversationTitle,
      trimmedUserContent: trimmed,
      generationId,
      userMessageId: userMessage.id,
      assistantId: persona.id,
      content: failureContent,
      status: "failed",
      errorCode: failureCode,
      generation: {
        status: CHAT_GENERATION_STATUS.failed,
        errorCode: failureCode,
      },
    });

    let displayContent = failedAssistant.content;
    if (isChatProviderError(error)) {
      if (error.surface === "timeout") {
        displayContent = CHAT_FAILURE_REQUEST_TIMEOUT;
      } else if (
        error.category === CHAT_GENERATION_FAILURE.SANITIZATION_COLLAPSED_OUTPUT
      ) {
        displayContent = CHAT_FAILURE_SANITIZATION_EMPTIED;
      } else if (error.surface === "provider_unavailable") {
        displayContent = CHAT_FAILURE_AI_TEMPORARILY_UNAVAILABLE;
      }
    } else if (error instanceof Error && error.message === "chat_timeout") {
      displayContent = CHAT_FAILURE_REQUEST_TIMEOUT;
    }

    logChatOperationalEvent({
      event: "chat_send_failed",
      userId,
      conversationId,
      provider: providerName,
      latencyMs: Date.now() - startedAt,
      errorCategory: failureCode,
      outcome: "failed",
    });

    return ok({
      userMessage: {
        id: userMessage.id,
        role: "user",
        content: userMessage.content,
        status: userMessage.status,
        createdAt: userMessage.createdAt.toISOString(),
      },
      assistantMessage: {
        id: failedAssistant.id,
        role: "assistant",
        content: displayContent,
        status: failedAssistant.status,
        assistantId: persona.id,
        createdAt: failedAssistant.createdAt.toISOString(),
      },
      assistantPersona: assistantPersonaSummary(persona),
      preferenceProposals: [],
    });
  }

  const generated: ChatProviderResult = parallel.chat.value;
  const replyContent = generated.content.trim();

  if (
    generated.model &&
    ((generated.promptTokens ?? 0) > 0 ||
      (generated.completionTokens ?? 0) > 0 ||
      (generated.costUsd ?? 0) > 0)
  ) {
    await recordCostAndRecheck({
      userId,
      conversationId,
      model: generated.model,
      kind: "chat",
      usage: {
        promptTokens: generated.promptTokens ?? 0,
        completionTokens: generated.completionTokens ?? 0,
      },
    }).catch(() => {
      /* cost ledger must not fail the reply */
    });
  }

  if (!replyContent) {
    const failedAssistant = await persistGenerationAssistant({
      conversationId,
      conversationTitle,
      trimmedUserContent: trimmed,
      generationId,
      userMessageId: userMessage.id,
      assistantId: persona.id,
      content: CHAT_FAILURE_EMPTY_REPLY,
      status: "failed",
      errorCode: CHAT_GENERATION_FAILURE.FINAL_EMPTY_REPLY,
      generation: {
        status: CHAT_GENERATION_STATUS.failed,
        errorCode: CHAT_GENERATION_FAILURE.FINAL_EMPTY_REPLY,
      },
    });
    return ok({
      userMessage: {
        id: userMessage.id,
        role: "user",
        content: userMessage.content,
        status: userMessage.status,
        createdAt: userMessage.createdAt.toISOString(),
      },
      assistantMessage: {
        id: failedAssistant.id,
        role: "assistant",
        content: failedAssistant.content,
        status: failedAssistant.status,
        assistantId: persona.id,
        createdAt: failedAssistant.createdAt.toISOString(),
      },
      assistantPersona: assistantPersonaSummary(persona),
      preferenceProposals: [],
    });
  }

  const assistantMessage = await persistGenerationAssistant({
    conversationId,
    conversationTitle,
    trimmedUserContent: trimmed,
    generationId,
    userMessageId: userMessage.id,
    assistantId: persona.id,
    content: replyContent,
    status: "complete",
    generation: {
      status: CHAT_GENERATION_STATUS.complete,
      model: generated.model ?? null,
      promptTokens: generated.promptTokens ?? null,
      completionTokens: generated.completionTokens ?? null,
      costUsd: generated.costUsd ?? null,
      requestId: generated.requestId ?? null,
    },
  });

  finishTurn({
    summary: {
      userId,
      conversationId,
      messagesForSummaryRefresh,
      assistantContent: replyContent,
    },
  });

  let proposals: PreferenceProposalDto[] = [];
  const mayPersist = shouldPersistPreferenceProposals({
    chatOk: true,
    replyContent,
    extractionOk: parallel.extraction.status === "fulfilled",
    candidateCount: extractedCandidates.length,
  });
  if (mayPersist) {
    const withinExtractionQuota = await canPersistPreferenceExtractions({
      userId,
    });
    if (!withinExtractionQuota) {
      logChatOperationalEvent({
        event: "extraction_persist_skipped",
        userId,
        conversationId,
        proposalCount: extractedCandidates.length,
        errorCategory: "extraction_rate_limited",
      });
    } else {
      try {
        proposals = await persistPendingProposalsFromCandidates({
          userId,
          conversationId,
          sourceMessageId: userMessage.id,
          displayMessageId: assistantMessage.id,
          candidates: extractedCandidates,
          currentPreferences: confirmedPreferences,
        });
      } catch (error) {
        console.error("[preference-extraction] persist failed", {
          reason: error instanceof Error ? error.name : "unknown",
        });
        proposals = [];
      }
    }
  }

  logChatOperationalEvent({
    event: "chat_send_ok",
    userId,
    conversationId,
    provider: providerName,
    model: generated.model ?? null,
    latencyMs: Date.now() - startedAt,
    outcome: "complete",
    promptTokens: generated.promptTokens ?? null,
    completionTokens: generated.completionTokens ?? null,
    costUsd: generated.costUsd ?? null,
    proposalCount: proposals.length,
  });

  return ok({
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
}

export async function setMessageFeedback(
  userId: string,
  messageId: string,
  rating: "up" | "down",
): Promise<ServiceResult<{ rating: string }, "not_found">> {
  const message = await prisma.message.findFirst({
    where: { id: messageId },
    include: { conversation: true },
  });
  if (!message || message.conversation.userId !== userId) {
    return err("not_found", "Message not found.");
  }

  await prisma.messageFeedback.upsert({
    where: { messageId },
    create: { messageId, userId, rating },
    update: { rating },
  });

  return ok({ rating });
}
