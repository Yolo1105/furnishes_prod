/**
 * Operational chat telemetry — never logs message/prompt/preference text.
 */

type ChatOperationalEvent = {
  event:
    | "chat_send_ok"
    | "chat_send_failed"
    | "chat_rate_limited"
    | "chat_daily_limit"
    | "chat_cost_limit"
    | "chat_rag_retrieval"
    | "chat_attachment_grounding"
    | "extraction_shadow"
    | "extraction_persist_skipped"
    | "recommendation_explain_retry";
  userId: string;
  conversationId?: string;
  provider?: string;
  model?: string | null;
  latencyMs?: number;
  outcome?: string;
  errorCategory?: string;
  promptTokens?: number | null;
  completionTokens?: number | null;
  costUsd?: number | null;
  proposalCount?: number;
  shadowCandidateCount?: number;
  heuristicCandidateCount?: number;
  /** Count of recommendation items that failed EXPLAIN citation before retry. */
  retryItemCount?: number;
};

export function logChatOperationalEvent(event: ChatOperationalEvent): void {
  console.info(
    "[chat-ops]",
    JSON.stringify({
      ...event,
      at: new Date().toISOString(),
    }),
  );
}
