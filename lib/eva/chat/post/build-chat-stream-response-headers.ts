import {
  CHAT_OUTBOUND_HTTP,
  CHAT_ROUTE_HEADER,
} from "@/lib/eva/core/chat-http-header-names";
import { CHAT_RESPONSE_HEADER } from "@/lib/eva/core/chat-generation-failure";
import type { AttachmentGroundingSummary } from "@/lib/eva/chat/attachments/attachment-types";
import type { RetrievalQualityLevel } from "@/lib/eva/rag/retrieval-types";
import type { StudioSnapshotPayload } from "@/lib/eva/studio/studio-snapshot-schema";

/**
 * Headers returned with the streamed chat body (grounding + correlation).
 */
export function buildChatStreamResponseHeaders(args: {
  chatRequestId: string;
  clientAttemptId?: string | null;
  conversationId: string | null;
  userMessageId: string;
  costWarning: boolean;
  setCookieHeader?: string;
  retrievalQuality: RetrievalQualityLevel;
  studioSnapshotPayload: StudioSnapshotPayload | null;
  attachmentGrounding: AttachmentGroundingSummary;
}): Record<string, string> {
  const {
    chatRequestId,
    clientAttemptId,
    conversationId,
    userMessageId,
    costWarning,
    setCookieHeader,
    retrievalQuality,
    studioSnapshotPayload,
    attachmentGrounding,
  } = args;

  return {
    [CHAT_OUTBOUND_HTTP.CONTENT_TYPE]:
      CHAT_OUTBOUND_HTTP.CONTENT_TYPE_TEXT_PLAIN_UTF8,
    [CHAT_RESPONSE_HEADER.REQUEST_ID]: chatRequestId,
    ...(clientAttemptId
      ? { [CHAT_RESPONSE_HEADER.CLIENT_ATTEMPT_ID]: clientAttemptId }
      : {}),
    ...(conversationId
      ? { [CHAT_OUTBOUND_HTTP.CONVERSATION_ID]: conversationId }
      : {}),
    [CHAT_OUTBOUND_HTTP.USER_MESSAGE_ID]: userMessageId,
    ...(costWarning
      ? {
          [CHAT_OUTBOUND_HTTP.COST_WARNING]:
            CHAT_OUTBOUND_HTTP.COST_WARNING_APPROACHING,
        }
      : {}),
    ...(setCookieHeader
      ? { [CHAT_OUTBOUND_HTTP.SET_COOKIE]: setCookieHeader }
      : {}),
    [CHAT_ROUTE_HEADER.RETRIEVAL_STRENGTH]: retrievalQuality,
    [CHAT_ROUTE_HEADER.GROUNDING_STUDIO]: studioSnapshotPayload ? "1" : "0",
    [CHAT_ROUTE_HEADER.ATTACHMENT_GROUNDING]:
      attachmentGrounding.responseHeaderValue,
  };
}
