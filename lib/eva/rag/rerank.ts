/**
 * Deterministic lexical overlap + score blending for RAG candidates.
 */

import {
  RAG_LEXICAL_TOKEN_MIN_CHARS,
  RAG_RERANK_COSINE_WEIGHT,
  RAG_RERANK_LEXICAL_WEIGHT,
} from "@/lib/eva/rag/rag-retrieval-constants";

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

export const RERANK_COSINE_WEIGHT = RAG_RERANK_COSINE_WEIGHT;
export const RERANK_LEXICAL_WEIGHT = RAG_RERANK_LEXICAL_WEIGHT;

export function combinedRetrievalScore(
  cosineSimilarity: number,
  lexical: number,
): number {
  return (
    RAG_RERANK_COSINE_WEIGHT * cosineSimilarity +
    RAG_RERANK_LEXICAL_WEIGHT * lexical
  );
}
