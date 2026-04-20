export function apiError(
  code: string,
  message: string,
  status: number,
  details?: unknown,
  responseHeaders?: Record<string, string>,
) {
  const prod = process.env.NODE_ENV === "production";
  const hideServerErrorDetails = prod && status >= 500;
  const body: {
    error: { code: string; message: string; details?: unknown };
  } = {
    error: {
      code,
      message: hideServerErrorDetails
        ? "Something went wrong. Try again later."
        : message,
    },
  };
  if (details !== undefined && !hideServerErrorDetails) {
    body.error.details = details;
  }
  return Response.json(body, {
    status,
    ...(responseHeaders && Object.keys(responseHeaders).length > 0
      ? { headers: responseHeaders }
      : {}),
  });
}

export const ErrorCodes = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  NOT_FOUND: "NOT_FOUND",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  RATE_LIMITED: "RATE_LIMITED",
  LLM_UNAVAILABLE: "LLM_UNAVAILABLE",
  DATABASE_UNAVAILABLE: "DATABASE_UNAVAILABLE",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  MODERATION_FLAGGED: "MODERATION_FLAGGED",
} as const;
