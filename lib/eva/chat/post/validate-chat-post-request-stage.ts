import { validateInput, checkModeration } from "@/lib/eva/core/guardrails";
import {
  strictRateLimit,
  rateLimitError,
  EVA_CHAT_LIMITS,
} from "@/lib/rate-limit";
import { logSecurityEvent } from "@/lib/eva/core/security-logger";
import {
  getOpenAIKey,
  OPENAI_KEY_MISSING_MESSAGE,
} from "@/lib/eva/core/openai";
import { checkGlobalDailyCostLimit } from "@/lib/eva/core/cost-tracker";
import { apiError, ErrorCodes } from "@/lib/eva/api/error";
import { clientIdentityFromRequest } from "@/lib/api/identity";
import { normalizeAssistantId } from "@/lib/eva/assistants/catalog";
import { buildChatPostBodySchema } from "@/lib/eva/chat/request/parse-chat-request";
import { normalizeChatStudioSnapshotForPost } from "@/lib/eva/chat/studio/normalize-chat-studio-snapshot";
import { getMaxMessageLength } from "@/lib/eva/chat/post/chat-route-headers";
import type { ChatPostValidatedRequest } from "@/lib/eva/chat/post/chat-post-types";

/**
 * Rate limits, API availability, JSON body, Zod validation, Studio snapshot, message guards, moderation, global cost.
 */
export async function validateChatPostRequestStage(
  req: Request,
): Promise<ChatPostValidatedRequest> {
  const clientIdentity = clientIdentityFromRequest(req);
  const clientIp = clientIdentity.replace(/^ip:/, "");

  const chatLimit = await strictRateLimit(clientIdentity, EVA_CHAT_LIMITS);
  if (!chatLimit.success) {
    logSecurityEvent({
      type: "rate_limit",
      clientIp,
    });
    const err = rateLimitError(chatLimit);
    return {
      outcome: "reject",
      response: apiError(ErrorCodes.RATE_LIMITED, err.message, 429),
    };
  }

  if (!getOpenAIKey()) {
    return {
      outcome: "reject",
      response: apiError(
        ErrorCodes.LLM_UNAVAILABLE,
        OPENAI_KEY_MISSING_MESSAGE,
        503,
      ),
    };
  }

  const body: unknown = await req.json();
  const maxLen = getMaxMessageLength();
  const parsed = buildChatPostBodySchema(maxLen).safeParse(body);
  if (!parsed.success) {
    return {
      outcome: "reject",
      response: apiError(
        ErrorCodes.VALIDATION_ERROR,
        String(parsed.error.flatten()),
        400,
      ),
    };
  }

  const studioStage = normalizeChatStudioSnapshotForPost({
    rawStudioSnapshot: parsed.data.studioSnapshot,
    clientSurface: parsed.data.clientSurface,
  });
  if (!studioStage.ok) {
    return { outcome: "reject", response: studioStage.response };
  }

  const attachmentList = parsed.data.attachments ?? [];

  const chatRequestId = crypto.randomUUID();
  const traceId =
    req.headers.get("x-vercel-id") ??
    req.headers.get("x-request-id") ??
    req.headers.get("cf-ray") ??
    null;

  const requestedAssistantId = normalizeAssistantId(parsed.data.assistantId);

  const validation = validateInput(parsed.data.message);
  if (!validation.valid) {
    if (validation.reason?.toLowerCase().includes("injection")) {
      logSecurityEvent({
        type: "injection_detected",
        clientIp,
        details: validation.reason,
      });
    }
    return {
      outcome: "reject",
      response: apiError(
        ErrorCodes.VALIDATION_ERROR,
        validation.reason ?? "Validation failed",
        400,
      ),
    };
  }

  const moderation = await checkModeration(parsed.data.message);
  if (!moderation.safe) {
    logSecurityEvent({
      type: "moderation_flagged",
      clientIp,
      details: moderation.reason,
    });
    return {
      outcome: "reject",
      response: apiError(
        ErrorCodes.MODERATION_FLAGGED,
        moderation.reason ?? "Moderation flagged",
        400,
      ),
    };
  }

  const globalCost = await checkGlobalDailyCostLimit();
  if (!globalCost.allowed) {
    logSecurityEvent({
      type: "global_cost_limit_hit",
      clientIp,
      currentCost: globalCost.currentCost,
      limit: globalCost.limit,
    });
    return {
      outcome: "reject",
      response: apiError(
        ErrorCodes.RATE_LIMITED,
        "Daily usage limit reached. Please try again later.",
        429,
      ),
    };
  }

  return {
    outcome: "ok",
    payload: {
      parsed: parsed.data,
      studioSnapshotPayload: studioStage.studioSnapshotPayload,
      attachmentList,
      chatRequestId,
      traceId,
      requestedAssistantId,
    },
  };
}
