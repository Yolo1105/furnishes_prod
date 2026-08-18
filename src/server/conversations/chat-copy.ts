/** Shared user-facing copy for chat generation failures. */

export const CHAT_FAILURE_ALL_MODELS_FAILED =
  "I couldn’t finish that reply just now—try again in a moment, or resend your message.";

export const CHAT_FAILURE_SANITIZATION_EMPTIED =
  "That reply was filtered for safety and came back empty. Try rephrasing, or send again in a moment.";

export const CHAT_FAILURE_AI_TEMPORARILY_UNAVAILABLE =
  "I’m having trouble reaching the AI service—try again in a moment.";

export const CHAT_FAILURE_REQUEST_TIMEOUT =
  "That reply took longer than expected—try again in a moment.";

export const CHAT_FAILURE_MODERATION_REJECTED =
  "That message couldn’t be processed. Please rephrase and try again.";

export const CHAT_FAILURE_EMPTY_REPLY =
  "I couldn’t generate a reply this time. Please try again in a moment.";

export const CHAT_FAILURE_COST_LIMIT =
  "This conversation has reached its AI usage limit for now. Start a new chat, or try again later.";
