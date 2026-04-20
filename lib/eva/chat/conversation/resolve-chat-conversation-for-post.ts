import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/eva/db";
import { apiError, ErrorCodes } from "@/lib/eva/api/error";
import { logSecurityEvent } from "@/lib/eva/core/security-logger";
import { checkCostLimit } from "@/lib/eva/core/cost-tracker";
import {
  getSessionUserId,
  requireConversationAccess,
} from "@/lib/eva/auth/helpers";
import {
  buildGuestSessionSetCookie,
  newGuestSessionId,
  parseGuestSessionFromCookieHeader,
} from "@/lib/auth/guest-session";
import {
  getAssistantById,
  normalizeAssistantId,
} from "@/lib/eva/assistants/catalog";
import { log } from "@/lib/eva/core/logger";
import type { ParsedChatPostBody } from "@/lib/eva/chat/request/parse-chat-request";
import type { ChatAttachmentPayload } from "@/lib/eva/api/chat-attachment";
import type { ChatGenerationLogContext } from "@/lib/eva/server/chat-generation-log";
import type { ChatConversationResolution } from "@/lib/eva/chat/post/chat-post-types";

export type ResolveChatConversationParameters = {
  req: Request;
  clientIp: string;
  payload: {
    parsed: ParsedChatPostBody;
    attachmentList: ChatAttachmentPayload[];
    chatRequestId: string;
    traceId: string | null;
    requestedAssistantId: string;
  };
};

/**
 * Loads or creates the conversation, enforces access and cost limits, persists the user message.
 */
export async function resolveChatConversationForPost(
  parameters: ResolveChatConversationParameters,
): Promise<ChatConversationResolution> {
  const { req, clientIp, payload } = parameters;
  const {
    parsed,
    attachmentList,
    chatRequestId,
    traceId,
    requestedAssistantId,
  } = payload;
  const {
    conversationId,
    message,
    preferences,
    projectId: bodyProjectId,
    messageSource: clientMessageSource,
    skipExtraction: clientSkipExtraction,
    clientAttemptId,
    priorChatRequestId,
  } = parsed;

  const userId = await getSessionUserId();

  let setCookieHeader: string | undefined;
  let convoId = conversationId;
  if (convoId) {
    const { error, status } = await requireConversationAccess(convoId, req);
    if (error) {
      return {
        outcome: "reject",
        response: apiError(
          status === 404 ? ErrorCodes.NOT_FOUND : ErrorCodes.FORBIDDEN,
          error,
          status,
        ),
      };
    }
  } else if (userId) {
    let newProjectId: string | undefined;
    if (bodyProjectId) {
      const owned = await prisma.project.findFirst({
        where: { id: bodyProjectId, userId },
        select: { id: true },
      });
      if (owned) newProjectId = owned.id;
    }
    const convo = await prisma.conversation.create({
      data: {
        userId,
        assistantId: requestedAssistantId,
        ...(newProjectId ? { projectId: newProjectId } : {}),
      },
    });
    convoId = convo.id;
    if (newProjectId) {
      await prisma.project.updateMany({
        where: { id: newProjectId, activeConversationId: null },
        data: { activeConversationId: convo.id },
      });
    }
  } else {
    let guestId =
      parseGuestSessionFromCookieHeader(req.headers.get("cookie")) ?? undefined;
    if (!guestId) {
      guestId = newGuestSessionId();
      setCookieHeader = buildGuestSessionSetCookie(guestId);
    }
    const convo = await prisma.conversation.create({
      data: { guestSessionId: guestId, assistantId: requestedAssistantId },
    });
    convoId = convo.id;
  }

  const convoRow = await prisma.conversation.findUnique({
    where: { id: convoId! },
    select: { assistantId: true },
  });
  let effectiveAssistantId = requestedAssistantId;
  if (convoRow?.assistantId) {
    effectiveAssistantId = normalizeAssistantId(convoRow.assistantId);
  } else {
    await prisma.conversation.update({
      where: { id: convoId! },
      data: { assistantId: effectiveAssistantId },
    });
  }
  const assistantForPrompt = getAssistantById(effectiveAssistantId);

  let costWarning = false;
  if (convoId) {
    const costCheck = await checkCostLimit(convoId);
    if (!costCheck.allowed) {
      logSecurityEvent({
        type: "cost_limit_hit",
        clientIp,
        conversationId: convoId,
      });
      return {
        outcome: "reject",
        response: apiError(
          ErrorCodes.RATE_LIMITED,
          `This conversation has reached its usage limit ($${costCheck.limit}). Please start a new conversation.`,
          429,
        ),
      };
    }
    costWarning = costCheck.warning;
  }

  const userMessage = await prisma.message.create({
    data: {
      conversationId: convoId,
      role: "user",
      content: message,
      extractions:
        attachmentList.length > 0
          ? ({
              attachments: attachmentList,
            } as Prisma.InputJsonValue)
          : undefined,
    },
  });

  if (clientMessageSource != null || clientSkipExtraction === true) {
    log({
      level: "info",
      event: "chat_user_message_client_meta",
      conversationId: convoId,
      userMessageId: userMessage.id,
      messageSource: clientMessageSource ?? null,
      skipExtraction: clientSkipExtraction ?? null,
    });
  }

  const convoForProject = await prisma.conversation.findUnique({
    where: { id: convoId! },
    select: { projectId: true },
  });

  const chatGenLogCtx: ChatGenerationLogContext = {
    chatRequestId,
    traceId,
    conversationId: convoId ?? null,
    projectId: convoForProject?.projectId ?? null,
    assistantId: effectiveAssistantId,
    clientAttemptId: clientAttemptId ?? null,
    priorChatRequestId: priorChatRequestId ?? null,
  };

  void preferences;

  return {
    outcome: "ok",
    value: {
      convoId: convoId!,
      setCookieHeader,
      userMessage,
      effectiveAssistantId,
      assistantForPrompt,
      costWarning,
      chatGenLogCtx,
    },
  };
}
