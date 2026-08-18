/**
 * Shared send-turn orchestration for JSON (`service`) and SSE (`chat-stream-service`).
 * Transports own response shaping; this module owns prepare/finish order of operations.
 */

import {
  getAssistantPersonaById,
  normalizeAssistantPersonaId,
} from "@/lib/eva/personas/catalog";
import type { AssistantPersonaDefinition } from "@/lib/eva/personas/persona-types";
import {
  needsGeneratedTitle,
  summarizeConversationTitle,
} from "@/lib/conversations/conversation-title";
import { prisma } from "@/server/db";
import {
  getDesignBrief,
  isDesignBriefChatIntent,
  isDesignBriefEnabled,
} from "@/server/design-brief/build-design-brief";
import { getConfirmedPreferenceState } from "@/server/preferences/preference-service";
import {
  emptyPreferenceMap,
  isChatMessageSource,
  type ChatMessageSource,
  type ChatPreferenceCategory,
} from "@/server/preferences/preference-types";
import type { ProfileContext } from "@/server/preferences/preference-prompt-context";
import {
  resolveRoomPlanForConversation,
  roomPlanWorkflowStats,
} from "@/server/room-plan/service";
import { maybeAdvance } from "@/server/workflow/transition";
import {
  getWorkflowStage,
  isChatWorkflowEnabled,
  workflowPromptOverlay,
} from "@/server/workflow/stages";
import {
  isChatAttachmentsEnabled,
  resolveAndGroundChatAttachments,
} from "./chat-attachment-grounding";
import {
  CHAT_FAILURE_AI_TEMPORARILY_UNAVAILABLE,
  CHAT_FAILURE_COST_LIMIT,
  CHAT_FAILURE_MODERATION_REJECTED,
} from "./chat-copy";
import { scheduleContextSummaryRefresh } from "./chat-context-summary";
import { isChatProviderError } from "./chat-failure";
import { checkChatModeration, validateChatInput } from "./chat-guardrails";
import {
  CHAT_GENERATION_STATUS,
  findUserMessageByClientId,
  isValidClientMessageId,
} from "./chat-idempotency";
import {
  buildModePromptExtras,
  maybeLogToolShadow,
  resolvePageContext,
  resolveRequestedChatMode,
  shouldExecuteChatTools,
} from "./chat-mode";
import {
  buildPolicyPreferenceRecord,
  checkPolicy,
  isChatPolicyGatingEnabled,
} from "./chat-policy";
import { getChatProviderForUser } from "./chat-provider-factory";
import type { ChatProvider, ChatProviderInput } from "./chat-provider";
import {
  assertSendTurnCaps,
  chatHistoryMessageTake,
  resolveChatSendPromptExtras,
} from "./chat-send-context";
import { scheduleShadowPreferenceExtraction } from "./chat-shadow-extraction";

export type TurnPageContext = {
  surface: "design" | "explore";
  snapshot?: Record<string, unknown>;
};

type PrepareTurnInput = {
  userId: string;
  conversationId: string;
  content: string;
  messageSourceRaw?: string;
  clientMessageIdRaw: string;
  attachmentUploadIds?: string[];
  mode?: "full" | "copilot";
  pageContext?: TurnPageContext;
  userEmail?: string | null;
};

type TurnUserMessage = {
  id: string;
  content: string;
  status: string;
  createdAt: Date;
};

type TurnAssistantMessage = {
  id: string;
  content: string;
  status: string;
  createdAt: Date;
};

type PrepareTurnError =
  | {
      kind: "error";
      error:
        | "validation"
        | "moderation_rejected"
        | "not_found"
        | "forbidden"
        | "rate_limited"
        | "daily_limit"
        | "cost_limit"
        | "provider_unavailable"
        | "generation_in_progress";
      message: string;
      details?: Record<string, string>;
    }
  | {
      kind: "existing";
      userMessageId: string;
      persona: AssistantPersonaDefinition;
    }
  | {
      kind: "short_circuit";
      reason: "design_brief" | "policy";
      userMessage: TurnUserMessage;
      assistantMessage: TurnAssistantMessage;
      persona: AssistantPersonaDefinition;
      startedAt: number;
      briefOk?: boolean;
      briefError?: string;
    };

type PreparedTurn = {
  kind: "ready";
  userId: string;
  conversationId: string;
  trimmed: string;
  messageSource: ChatMessageSource;
  persona: AssistantPersonaDefinition;
  providerName: string;
  provider: ChatProvider;
  userMessage: TurnUserMessage;
  generationId: string;
  startedAt: number;
  costWarning: boolean;
  memoryEnabled: boolean;
  confirmedPreferences: Record<ChatPreferenceCategory, string | null>;
  confirmedPreferenceSources: Partial<
    Record<ChatPreferenceCategory, string | null>
  >;
  conversationTitle: string;
  profileContext: ProfileContext;
  providerInput: ChatProviderInput;
  messagesForSummaryRefresh: Array<{ role: string; content: string }>;
};

type PrepareTurnResult = PrepareTurnError | PreparedTurn;

type ClaimResult =
  | { kind: "busy" }
  | { kind: "existing"; userMessageId: string }
  | {
      kind: "claimed";
      userMessage: TurnUserMessage;
      generationId: string;
    };

/**
 * Persist assistant message + complete/fail generation + bump conversation title.
 * Shared by short-circuits and both transports' post-generate paths.
 */
export async function persistGenerationAssistant(input: {
  conversationId: string;
  conversationTitle: string;
  trimmedUserContent: string;
  generationId: string;
  userMessageId: string;
  assistantId: string;
  content: string;
  status: "complete" | "failed" | "stopped";
  errorCode?: string | null;
  generation: {
    status: string;
    errorCode?: string | null;
    model?: string | null;
    promptTokens?: number | null;
    completionTokens?: number | null;
    costUsd?: number | null;
    requestId?: string | null;
  };
  /** When false, skip conversation title/updatedAt update (stream provider-error path). */
  touchConversation?: boolean;
}): Promise<TurnAssistantMessage> {
  const touchConversation = input.touchConversation !== false;
  return prisma.$transaction(async (tx) => {
    const assistant = await tx.message.create({
      data: {
        conversationId: input.conversationId,
        role: "assistant",
        content: input.content,
        status: input.status,
        ...(input.errorCode ? { errorCode: input.errorCode } : {}),
        assistantId: input.assistantId,
        inReplyToId: input.userMessageId,
      },
    });
    await tx.chatGeneration.update({
      where: { id: input.generationId },
      data: {
        status: input.generation.status,
        ...(input.generation.errorCode
          ? { errorCode: input.generation.errorCode }
          : {}),
        assistantMessageId: assistant.id,
        completedAt: new Date(),
        ...(input.generation.model !== undefined
          ? { model: input.generation.model }
          : {}),
        ...(input.generation.promptTokens !== undefined
          ? { promptTokens: input.generation.promptTokens }
          : {}),
        ...(input.generation.completionTokens !== undefined
          ? { completionTokens: input.generation.completionTokens }
          : {}),
        ...(input.generation.costUsd !== undefined
          ? { costUsd: input.generation.costUsd }
          : {}),
        ...(input.generation.requestId !== undefined
          ? { requestId: input.generation.requestId }
          : {}),
      },
    });
    if (touchConversation) {
      await tx.conversation.update({
        where: { id: input.conversationId },
        data: {
          updatedAt: new Date(),
          title: needsGeneratedTitle(
            input.conversationTitle,
            input.trimmedUserContent,
          )
            ? summarizeConversationTitle(input.trimmedUserContent)
            : input.conversationTitle,
        },
      });
    }
    return {
      id: assistant.id,
      content: assistant.content,
      status: assistant.status,
      createdAt: assistant.createdAt,
    };
  });
}

/**
 * Assemble ChatProviderInput identically for JSON and SSE paths.
 * `signal` is the only transport-specific field.
 */
export function assembleTurnProviderInput(input: {
  persona: AssistantPersonaDefinition;
  messages: ChatProviderInput["messages"];
  memoryEnabled: boolean;
  confirmedPreferences: Record<ChatPreferenceCategory, string | null>;
  confirmedPreferenceSources: Partial<
    Record<ChatPreferenceCategory, string | null>
  >;
  profileContext: ProfileContext;
  userId: string;
  conversationId: string;
  workflowOverlay: ChatProviderInput["workflow"];
  attachmentGroundingBlock?: string;
  contextSummaryBlock?: string;
  projectMemoryBlock?: string;
  roomPlanBlock?: string;
  mode?: "full" | "copilot";
  pageContext?: TurnPageContext;
  userEmail?: string | null;
  userMessageForTools: string;
  signal?: AbortSignal;
}): ChatProviderInput {
  const modeExtras = buildModePromptExtras({
    mode: resolveRequestedChatMode(input.mode),
    pageContext: resolvePageContext(input.pageContext),
  });
  maybeLogToolShadow({
    userId: input.userId,
    conversationId: input.conversationId,
    message: input.userMessageForTools,
  });

  return {
    persona: input.persona,
    messages: input.messages,
    memoryEnabled: input.memoryEnabled,
    confirmedPreferences: input.confirmedPreferences,
    confirmedPreferenceSources: input.confirmedPreferenceSources,
    profileContext: input.profileContext,
    userId: input.userId,
    conversationId: input.conversationId,
    ...(input.signal ? { signal: input.signal } : {}),
    ...(input.workflowOverlay ? { workflow: input.workflowOverlay } : {}),
    ...(input.attachmentGroundingBlock
      ? { attachmentGroundingBlock: input.attachmentGroundingBlock }
      : {}),
    ...(input.contextSummaryBlock
      ? { contextSummaryBlock: input.contextSummaryBlock }
      : {}),
    ...(input.projectMemoryBlock
      ? { projectMemoryBlock: input.projectMemoryBlock }
      : {}),
    ...(input.roomPlanBlock ? { roomPlanBlock: input.roomPlanBlock } : {}),
    ...(modeExtras.pageContextBlock
      ? { pageContextBlock: modeExtras.pageContextBlock }
      : {}),
    ...(modeExtras.responseLengthOverride
      ? { responseLengthOverride: modeExtras.responseLengthOverride }
      : {}),
    tools: {
      mode: modeExtras.mode,
      execute: shouldExecuteChatTools({
        userId: input.userId,
        ...(input.userEmail !== undefined ? { email: input.userEmail } : {}),
      }),
    },
  };
}

/**
 * Post-generation side effects shared by both transports.
 * Call with `shadow` after extraction settles; with `summary` after assistant persist.
 * Workflow advance remains in prepareTurn (pre-generate); there is no post-advance today.
 */
export function finishTurn(input: {
  shadow?: {
    userId: string;
    conversationId: string;
    content: string;
    currentPreferences: Record<ChatPreferenceCategory, string | null>;
    heuristicCandidateCount: number;
  };
  summary?: {
    userId: string;
    conversationId: string;
    messagesForSummaryRefresh: Array<{ role: string; content: string }>;
    assistantContent: string;
  };
}): void {
  if (input.shadow) {
    scheduleShadowPreferenceExtraction(input.shadow);
  }
  if (input.summary) {
    scheduleContextSummaryRefresh({
      userId: input.summary.userId,
      conversationId: input.summary.conversationId,
      messages: [
        ...input.summary.messagesForSummaryRefresh,
        { role: "assistant", content: input.summary.assistantContent },
      ],
    });
  }
}

async function claimChatGeneration(input: {
  userId: string;
  conversationId: string;
  clientMessageId: string;
  trimmed: string;
  providerName: string;
}): Promise<ClaimResult> {
  try {
    return await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`
        SELECT id FROM "Conversation"
        WHERE id = ${input.conversationId} AND "userId" = ${input.userId}
        FOR UPDATE
      `;

      const existing = await tx.message.findFirst({
        where: {
          conversationId: input.conversationId,
          clientMessageId: input.clientMessageId,
          role: "user",
        },
        select: { id: true },
      });
      if (existing) {
        return { kind: "existing" as const, userMessageId: existing.id };
      }

      const active = await tx.chatGeneration.findFirst({
        where: {
          conversationId: input.conversationId,
          status: CHAT_GENERATION_STATUS.pending,
        },
        select: { id: true },
      });
      if (active) {
        return { kind: "busy" as const };
      }

      const userMessage = await tx.message.create({
        data: {
          conversationId: input.conversationId,
          role: "user",
          content: input.trimmed,
          status: "complete",
          clientMessageId: input.clientMessageId,
        },
      });

      const generation = await tx.chatGeneration.create({
        data: {
          conversationId: input.conversationId,
          userMessageId: userMessage.id,
          provider: input.providerName,
          status: CHAT_GENERATION_STATUS.pending,
        },
      });

      return {
        kind: "claimed" as const,
        userMessage: {
          id: userMessage.id,
          content: userMessage.content,
          status: userMessage.status,
          createdAt: userMessage.createdAt,
        },
        generationId: generation.id,
      };
    });
  } catch (error: unknown) {
    const code =
      typeof error === "object" &&
      error &&
      "code" in error &&
      typeof (error as { code?: unknown }).code === "string"
        ? (error as { code: string }).code
        : null;
    if (code === "P2002") {
      const raced = await findUserMessageByClientId(
        input.conversationId,
        input.clientMessageId,
      );
      if (raced) {
        return { kind: "existing", userMessageId: raced.id };
      }
    }
    throw error;
  }
}

/**
 * Shared pre-generate orchestration: validate → load → caps → claim → workflow →
 * short-circuits → prompt extras → provider input.
 */
export async function prepareTurn(
  input: PrepareTurnInput,
): Promise<PrepareTurnResult> {
  const trimmed = input.content.trim();
  const inputCheck = validateChatInput(trimmed);
  if (!inputCheck.valid) {
    const reason = inputCheck.reason ?? "Invalid message";
    const isInjection = reason.toLowerCase().includes("injection");
    return {
      kind: "error",
      error: isInjection ? "moderation_rejected" : "validation",
      message: isInjection ? CHAT_FAILURE_MODERATION_REJECTED : reason,
      details: { content: reason },
    };
  }

  const clientMessageId = input.clientMessageIdRaw.trim();
  if (!isValidClientMessageId(clientMessageId)) {
    return {
      kind: "error",
      error: "validation",
      message: "A valid clientMessageId is required.",
      details: {
        clientMessageId: "Provide a non-empty client message id (max 128).",
      },
    };
  }

  const moderation = await checkChatModeration(trimmed);
  if (!moderation.safe) {
    return {
      kind: "error",
      error: "moderation_rejected",
      message: CHAT_FAILURE_MODERATION_REJECTED,
      details: {
        content: moderation.reason ?? CHAT_FAILURE_MODERATION_REJECTED,
      },
    };
  }

  const messageSource: ChatMessageSource = isChatMessageSource(
    input.messageSourceRaw ?? "typed",
  )
    ? ((input.messageSourceRaw ?? "typed") as ChatMessageSource)
    : "typed";

  const [conversation, user] = await Promise.all([
    prisma.conversation.findFirst({
      where: { id: input.conversationId, userId: input.userId },
      select: {
        id: true,
        title: true,
        projectId: true,
        workflowStage: true,
        contextSummary: true,
        project: { select: { name: true, summary: true } },
        messages: {
          orderBy: { createdAt: "asc" },
          take: chatHistoryMessageTake(),
          select: { role: true, content: true },
        },
      },
    }),
    prisma.user.findUnique({
      where: { id: input.userId },
      select: {
        email: true,
        activeAssistantId: true,
        memoryEnabled: true,
        styleProfile: { select: { styleWords: true, roomDimensions: true } },
        budget: {
          select: { minimum: true, maximum: true, currency: true },
        },
      },
    }),
  ]);
  if (!conversation) {
    return {
      kind: "error",
      error: "not_found",
      message: "Conversation not found.",
    };
  }
  if (!user) {
    return { kind: "error", error: "not_found", message: "User not found." };
  }

  let attachmentGroundingBlock: string | undefined;
  if (
    isChatAttachmentsEnabled() &&
    (input.attachmentUploadIds?.length ?? 0) > 0
  ) {
    const grounded = await resolveAndGroundChatAttachments({
      userId: input.userId,
      conversationId: input.conversationId,
      ...(input.attachmentUploadIds
        ? { attachmentUploadIds: input.attachmentUploadIds }
        : {}),
    });
    if (!grounded.ok) {
      return {
        kind: "error",
        error: grounded.error,
        message: grounded.message ?? "Invalid attachments.",
      };
    }
    if (grounded.value.promptBlock) {
      attachmentGroundingBlock = grounded.value.promptBlock;
    }
  }

  const caps = await assertSendTurnCaps({
    userId: input.userId,
    conversationId: input.conversationId,
  });
  if (!caps.ok) {
    return {
      kind: "error",
      error: caps.error,
      message: caps.message ?? "Request refused.",
    };
  }

  const persona = getAssistantPersonaById(
    normalizeAssistantPersonaId(user.activeAssistantId),
  )!;
  const preferenceState = user.memoryEnabled
    ? await getConfirmedPreferenceState(input.userId)
    : { values: emptyPreferenceMap(), sources: {} };
  const confirmedPreferences = preferenceState.values;
  const confirmedPreferenceSources = preferenceState.sources;

  let providerName: string;
  let provider: ChatProvider;
  try {
    const resolved = getChatProviderForUser({
      userId: input.userId,
      email: user.email,
    });
    providerName = resolved.name;
    provider = resolved.provider;
  } catch (error) {
    if (
      isChatProviderError(error) &&
      error.surface === "provider_unavailable"
    ) {
      return {
        kind: "error",
        error: "provider_unavailable",
        message: CHAT_FAILURE_AI_TEMPORARILY_UNAVAILABLE,
      };
    }
    throw error;
  }

  const claim = await claimChatGeneration({
    userId: input.userId,
    conversationId: input.conversationId,
    clientMessageId,
    trimmed,
    providerName,
  });

  if (claim.kind === "busy") {
    return {
      kind: "error",
      error: "generation_in_progress",
      message:
        "Eva is still replying to this conversation. Try again in a moment.",
    };
  }

  if (claim.kind === "existing") {
    return {
      kind: "existing",
      userMessageId: claim.userMessageId,
      persona,
    };
  }

  const { userMessage, generationId } = claim;
  const startedAt = Date.now();

  let workflowStage = conversation.workflowStage;
  if (isChatWorkflowEnabled()) {
    const roomPlan = await resolveRoomPlanForConversation({
      userId: input.userId,
      projectId: conversation.projectId,
    });
    const planStats = roomPlanWorkflowStats(roomPlan);
    const advanced = await maybeAdvance({
      conversationId: input.conversationId,
      messageCount: conversation.messages.length + 1,
      confirmedPreferences,
      userMessage: trimmed,
      roomDimensions: user.styleProfile?.roomDimensions,
      ...(planStats
        ? {
            roomPlan: {
              coreItemCount: planStats.coreItemCount,
              decidedCount: planStats.decidedCount,
            },
          }
        : { roomPlan: null }),
    });
    if (advanced) workflowStage = advanced;
  }
  const workflowOverlay = isChatWorkflowEnabled()
    ? workflowPromptOverlay(workflowStage)
    : null;
  const workflowRequiredCategories = isChatWorkflowEnabled()
    ? getWorkflowStage(workflowStage).requiredCategories
    : null;

  if (isDesignBriefEnabled() && isDesignBriefChatIntent(trimmed)) {
    const briefResult = await getDesignBrief({
      userId: input.userId,
      conversationId: input.conversationId,
    });
    const briefContent = briefResult.ok
      ? briefResult.value.narrative
      : briefResult.error === "cost_limit"
        ? briefResult.message || CHAT_FAILURE_COST_LIMIT
        : briefResult.error === "disabled"
          ? "Design brief is not available right now."
          : "I couldn't build your design brief just now — try again in a moment.";

    const assistantMessage = await persistGenerationAssistant({
      conversationId: input.conversationId,
      conversationTitle: conversation.title,
      trimmedUserContent: trimmed,
      generationId,
      userMessageId: userMessage.id,
      assistantId: persona.id,
      content: briefContent,
      status: briefResult.ok ? "complete" : "failed",
      ...(briefResult.ok ? {} : { errorCode: briefResult.error }),
      generation: {
        status: briefResult.ok
          ? CHAT_GENERATION_STATUS.complete
          : CHAT_GENERATION_STATUS.failed,
        ...(briefResult.ok ? {} : { errorCode: briefResult.error }),
        model: "design_brief",
      },
    });

    return {
      kind: "short_circuit",
      reason: "design_brief",
      userMessage,
      assistantMessage,
      persona,
      startedAt,
      briefOk: briefResult.ok,
      ...(briefResult.ok ? {} : { briefError: briefResult.error }),
    };
  }

  if (isChatPolicyGatingEnabled()) {
    const policyPrefs = buildPolicyPreferenceRecord({
      confirmed: confirmedPreferences,
      roomDimensions: user.styleProfile?.roomDimensions,
    });
    const policy = checkPolicy(
      trimmed,
      policyPrefs,
      workflowRequiredCategories,
    );
    if (policy.blocked && policy.clarificationMessage) {
      const assistantMessage = await persistGenerationAssistant({
        conversationId: input.conversationId,
        conversationTitle: conversation.title,
        trimmedUserContent: trimmed,
        generationId,
        userMessageId: userMessage.id,
        assistantId: persona.id,
        content: policy.clarificationMessage,
        status: "complete",
        generation: {
          status: CHAT_GENERATION_STATUS.complete,
          model: "policy",
        },
      });
      return {
        kind: "short_circuit",
        reason: "policy",
        userMessage,
        assistantMessage,
        persona,
        startedAt,
      };
    }
  }

  const promptExtras = await resolveChatSendPromptExtras({
    userId: input.userId,
    conversationId: input.conversationId,
    projectId: conversation.projectId,
    priorMessages: conversation.messages,
    contextSummary: conversation.contextSummary,
    newUserContent: trimmed,
  });

  const profileContext: ProfileContext = {
    styleWords: user.styleProfile?.styleWords ?? null,
    budgetMinimum: user.budget?.minimum ?? null,
    budgetMaximum: user.budget?.maximum ?? null,
    budgetCurrency: user.budget?.currency ?? null,
    projectName: conversation.project?.name ?? null,
    projectSummary: conversation.project?.summary ?? null,
  };

  const providerInput = assembleTurnProviderInput({
    persona,
    messages: promptExtras.history,
    memoryEnabled: user.memoryEnabled,
    confirmedPreferences,
    confirmedPreferenceSources,
    profileContext,
    userId: input.userId,
    conversationId: input.conversationId,
    workflowOverlay,
    ...(attachmentGroundingBlock ? { attachmentGroundingBlock } : {}),
    ...(promptExtras.contextSummaryBlock
      ? { contextSummaryBlock: promptExtras.contextSummaryBlock }
      : {}),
    ...(promptExtras.projectMemoryBlock
      ? { projectMemoryBlock: promptExtras.projectMemoryBlock }
      : {}),
    ...(promptExtras.roomPlanBlock
      ? { roomPlanBlock: promptExtras.roomPlanBlock }
      : {}),
    ...(input.mode !== undefined ? { mode: input.mode } : {}),
    ...(input.pageContext !== undefined
      ? { pageContext: input.pageContext }
      : {}),
    ...(input.userEmail !== undefined ? { userEmail: input.userEmail } : {}),
    userMessageForTools: trimmed,
  });

  return {
    kind: "ready",
    userId: input.userId,
    conversationId: input.conversationId,
    trimmed,
    messageSource,
    persona,
    providerName,
    provider,
    userMessage,
    generationId,
    startedAt,
    costWarning: caps.value.costWarning,
    memoryEnabled: user.memoryEnabled,
    confirmedPreferences,
    confirmedPreferenceSources,
    conversationTitle: conversation.title,
    profileContext,
    providerInput,
    messagesForSummaryRefresh: promptExtras.messagesForSummaryRefresh,
  };
}
