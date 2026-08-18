/**
 * Generation failure taxonomy for OpenAI primary/fallback (non-streaming).
 */

export const CHAT_GENERATION_FAILURE = {
  PRIMARY_EMPTY: "primary_empty",
  FALLBACK_EMPTY: "fallback_empty",
  PRIMARY_EXCEPTION: "primary_exception",
  FALLBACK_EXCEPTION: "fallback_exception",
  ALL_MODELS_FAILED: "all_models_failed",
  SANITIZATION_COLLAPSED_OUTPUT: "sanitization_collapsed_output",
  FINAL_EMPTY_REPLY: "final_empty_reply",
  PROVIDER_TIMEOUT: "provider_timeout",
  PROVIDER_UNAVAILABLE: "provider_unavailable",
  UNKNOWN: "unknown_chat_failure",
} as const;

type ChatGenerationFailureCategory =
  (typeof CHAT_GENERATION_FAILURE)[keyof typeof CHAT_GENERATION_FAILURE];

type ChatFailureSurface =
  | "provider_unavailable"
  | "provider_failed"
  | "empty_generation"
  | "sanitize_to_empty"
  | "timeout"
  | "unknown";

export function mapChatGenerationFailureToSurface(
  category: ChatGenerationFailureCategory | string | null | undefined,
): ChatFailureSurface {
  switch (category) {
    case CHAT_GENERATION_FAILURE.PROVIDER_UNAVAILABLE:
    case CHAT_GENERATION_FAILURE.ALL_MODELS_FAILED:
      return "provider_unavailable";
    case CHAT_GENERATION_FAILURE.PROVIDER_TIMEOUT:
      return "timeout";
    case CHAT_GENERATION_FAILURE.PRIMARY_EMPTY:
    case CHAT_GENERATION_FAILURE.FALLBACK_EMPTY:
    case CHAT_GENERATION_FAILURE.FINAL_EMPTY_REPLY:
      return "empty_generation";
    case CHAT_GENERATION_FAILURE.SANITIZATION_COLLAPSED_OUTPUT:
      return "sanitize_to_empty";
    case CHAT_GENERATION_FAILURE.PRIMARY_EXCEPTION:
    case CHAT_GENERATION_FAILURE.FALLBACK_EXCEPTION:
      return "provider_failed";
    default:
      return "unknown";
  }
}

export class ChatProviderError extends Error {
  readonly category: ChatGenerationFailureCategory;
  readonly surface: ChatFailureSurface;

  constructor(
    category: ChatGenerationFailureCategory,
    message: string,
    options?: { cause?: unknown },
  ) {
    super(message, options?.cause ? { cause: options.cause } : undefined);
    this.name = "ChatProviderError";
    this.category = category;
    this.surface = mapChatGenerationFailureToSurface(category);
  }
}

export function isChatProviderError(
  error: unknown,
): error is ChatProviderError {
  return error instanceof ChatProviderError;
}
