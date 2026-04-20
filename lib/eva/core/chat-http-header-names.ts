/**
 * Chat API HTTP header names and fixed values — shared by server routes and browser clients.
 * Do not duplicate these strings elsewhere.
 */

export const CHAT_ROUTE_HEADER = {
  GROUNDING_STUDIO: "X-Chat-Grounding-Studio",
  /** strong | weak | none | unavailable */
  RETRIEVAL_STRENGTH: "X-Chat-Retrieval-Strength",
  /** none | metadata_only | partial | unavailable | analyzing_skipped */
  ATTACHMENT_GROUNDING: "X-Chat-Attachment-Grounding",
} as const;

/**
 * Names and fixed values for headers returned on chat HTTP responses
 * (streaming reply and policy short-circuit).
 */
export const CHAT_OUTBOUND_HTTP = {
  CONTENT_TYPE: "Content-Type",
  CONTENT_TYPE_TEXT_PLAIN_UTF8: "text/plain; charset=utf-8",
  CONVERSATION_ID: "X-Conversation-Id",
  USER_MESSAGE_ID: "X-User-Message-Id",
  COST_WARNING: "X-Cost-Warning",
  COST_WARNING_APPROACHING: "approaching-limit",
  SET_COOKIE: "Set-Cookie",
} as const;
