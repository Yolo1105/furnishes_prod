/** Primary `streamText` retries before the route-level fallback model. */
export const CHAT_STREAM_PRIMARY_MAX_RETRIES = 3;

/** Fallback `streamText` retries (initial route fallback and empty-stream body retry). */
export const CHAT_STREAM_FALLBACK_MAX_RETRIES = 2;

/** Recovery `generateText` loop when streamed body is empty (bounded wait). */
export const CHAT_STREAM_RECOVERY_GENERATE_TEXT_TIMEOUT_MS = 30_000;

/** Slightly higher temperature so recovery differs from the primary stream attempt. */
export const CHAT_STREAM_RECOVERY_GENERATE_TEXT_TEMPERATURE = 0.85;

export const CHAT_STREAM_RECOVERY_GENERATE_TEXT_MAX_RETRIES = 1;
