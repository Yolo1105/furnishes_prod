/** Minimum cosine similarity to include a chunk (filters noise). */
export const RAG_RELEVANCE_FLOOR = 0.28;

/** At or above this cosine, a hit can contribute to "strong" when combined/lexical agree. */
export const RAG_STRONG_SIMILARITY_MIN_SCORE = 0.38;

/** At or above this blended score (cosine + lexical), retrieval is "strong". */
export const RAG_STRONG_COMBINED_MIN_SCORE = 0.4;

/** Minimum lexical overlap for "strong" — avoids semantically vague cosine matches. */
export const RAG_STRONG_LEXICAL_MIN_SCORE = 0.06;

/** Max design-doc rows to score before lexical rerank (bounds work per query). */
export const RAG_RERANK_CANDIDATE_POOL = 48;

/**
 * A hit must have cosine ≥ floor × this ratio so lexical rerank cannot rescue
 * a semantically unrelated chunk on keyword overlap alone.
 */
export const RAG_COSINE_RELATIVE_TO_FLOOR = 0.85;

/** Default chunk count returned to the chat layer (matches prior behavior). */
export const RAG_DEFAULT_TOP_K = 5;

/** Blended score weights: cosine vs lexical overlap (must sum to 1). */
export const RAG_RERANK_COSINE_WEIGHT = 0.62;
export const RAG_RERANK_LEXICAL_WEIGHT = 0.38;

/**
 * Ignore tokens shorter than this many characters when scoring lexical overlap
 * (exclusive bound in filter: `length > RAG_LEXICAL_TOKEN_MIN_CHARS`).
 */
export const RAG_LEXICAL_TOKEN_MIN_CHARS = 2;
