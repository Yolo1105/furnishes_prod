import {
  CHAT_GENERATION_FAILURE,
  type ChatGenerationFailureCategory,
} from "@/lib/eva/core/chat-generation-failure";

/**
 * Coarse, stable buckets for dashboards — maps the fine-grained server enum.
 */
export type ChatFailureSurface =
  | "provider_stream_failure"
  | "empty_generation"
  | "sanitize_to_empty"
  | "aborted_request"
  | "unknown";

export function mapChatGenerationFailureToSurface(
  category: ChatGenerationFailureCategory,
): ChatFailureSurface {
  switch (category) {
    case CHAT_GENERATION_FAILURE.PRIMARY_STREAM_EXCEPTION:
    case CHAT_GENERATION_FAILURE.FALLBACK_STREAM_EXCEPTION:
    case CHAT_GENERATION_FAILURE.STREAM_INTERRUPTED:
    case CHAT_GENERATION_FAILURE.ALL_MODELS_FAILED:
    case CHAT_GENERATION_FAILURE.LLM_UNAVAILABLE_HTTP:
      return "provider_stream_failure";
    case CHAT_GENERATION_FAILURE.PRIMARY_STREAM_EMPTY:
    case CHAT_GENERATION_FAILURE.FALLBACK_STREAM_EMPTY:
    case CHAT_GENERATION_FAILURE.FINAL_EMPTY_REPLY:
    case CHAT_GENERATION_FAILURE.RECOVERY_GENERATE_TEXT_BLANK:
      return "empty_generation";
    case CHAT_GENERATION_FAILURE.SANITIZATION_COLLAPSED_OUTPUT:
      return "sanitize_to_empty";
    case CHAT_GENERATION_FAILURE.CLIENT_ABORT:
      return "aborted_request";
    case CHAT_GENERATION_FAILURE.RECOVERY_GENERATE_TEXT_EXCEPTION:
    case CHAT_GENERATION_FAILURE.UNKNOWN_CHAT_FAILURE:
    default:
      return "unknown";
  }
}
