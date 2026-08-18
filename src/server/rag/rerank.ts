/**
 * Deterministic lexical overlap + score blending for RAG candidates.
 * Re-derived from legacy `lib/eva/rag/rerank.ts`.
 */

import {
  RAG_LEXICAL_TOKEN_MIN_CHARS,
  RAG_RERANK_COSINE_WEIGHT,
  RAG_RERANK_LEXICAL_WEIGHT,
} from "./constants";

const TOKEN_SPLIT = /[^a-z0-9]+/i;

function tokenizeForOverlap(text: string): Set<string> {
  const tokens = text
    .toLowerCase()
    .split(TOKEN_SPLIT)
    .map((t) => t.trim())
    .filter((t) => t.length > RAG_LEXICAL_TOKEN_MIN_CHARS);
  return new Set(tokens);
}

/**
 * Normalized overlap score in [0, 1] — higher when query terms appear in content.
 */
export function lexicalOverlapScore(query: string, content: string): number {
  const queryTokens = tokenizeForOverlap(query);
  const contentTokens = tokenizeForOverlap(content);
  if (queryTokens.size === 0 || contentTokens.size === 0) return 0;
  let intersection = 0;
  for (const token of queryTokens) {
    if (contentTokens.has(token)) intersection += 1;
  }
  const union = queryTokens.size + contentTokens.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export function combinedRetrievalScore(
  cosine: number,
  lexical: number,
): number {
  return (
    RAG_RERANK_COSINE_WEIGHT * cosine + RAG_RERANK_LEXICAL_WEIGHT * lexical
  );
}
