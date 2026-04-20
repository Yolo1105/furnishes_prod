export function apiError(
  code: string,
  message: string,
  status: number,
  details?: unknown,
) {
  return Response.json({ error: { code, message, details } }, { status });
}

export const ErrorCodes = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  NOT_FOUND: "NOT_FOUND",
  FORBIDDEN: "FORBIDDEN",
  RATE_LIMITED: "RATE_LIMITED",
  LLM_UNAVAILABLE: "LLM_UNAVAILABLE",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  MODERATION_FLAGGED: "MODERATION_FLAGGED",
} as const;
