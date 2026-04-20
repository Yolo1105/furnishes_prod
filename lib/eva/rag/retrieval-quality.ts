import {
  RAG_STRONG_COMBINED_MIN_SCORE,
  RAG_STRONG_LEXICAL_MIN_SCORE,
  RAG_STRONG_SIMILARITY_MIN_SCORE,
} from "@/lib/eva/rag/rag-retrieval-constants";
import type {
  RagDocumentHit,
  RetrievalQualityLevel,
} from "@/lib/eva/rag/retrieval-types";

/**
 * Classify overall retrieval confidence from ranked hits.
 */
export function classifyRetrievalQuality(args: {
  hits: RagDocumentHit[];
  embeddingUnavailable: boolean;
  /** Best cosine among all chunks (even if nothing was included after thresholds). */
  bestCosineOverall: number;
}): RetrievalQualityLevel {
  if (args.embeddingUnavailable) return "unavailable";
  const best = args.hits[0];
  if (best) {
    const strongLike =
      best.combinedScore >= RAG_STRONG_COMBINED_MIN_SCORE &&
      best.similarityScore >= RAG_STRONG_SIMILARITY_MIN_SCORE &&
      best.lexicalScore >= RAG_STRONG_LEXICAL_MIN_SCORE;
    if (strongLike) return "strong";
    return "weak";
  }
  if (args.bestCosineOverall > 0) {
    return "weak";
  }
  return "none";
}
