/**
 * Format retrieval hits into a delimited system-prompt appendix.
 */

import type { RetrieveForChatResult } from "./types";

const REFERENCE_KNOWLEDGE_HEADER = "Reference knowledge" as const;

/**
 * Build a "Reference knowledge" block with source names. Empty string when
 * there is nothing useful to inject (keeps flag-off prompts identical).
 */
export function formatReferenceKnowledgeBlock(
  result: RetrieveForChatResult,
): string {
  if (result.embeddingUnavailable) {
    return `${REFERENCE_KNOWLEDGE_HEADER}\nRetrieval was unavailable. Answer from general knowledge only; do not claim internal design-library citations.`;
  }
  if (result.hits.length === 0) {
    return "";
  }
  const lines = result.hits.map((hit, index) => {
    const body = hit.content.trim().slice(0, 1200);
    return `[${index + 1}] source=${hit.source}\n${body}`;
  });
  return `${REFERENCE_KNOWLEDGE_HEADER}\nUse these design-library snippets when relevant; prefer the user's constraints when they conflict.\n\n${lines.join("\n\n---\n\n")}`;
}

export function isChatRagEnabled(): boolean {
  return process.env.CHAT_RAG_ENABLED === "1";
}
