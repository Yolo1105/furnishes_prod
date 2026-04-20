export type RetrievalQualityLevel = "strong" | "weak" | "none" | "unavailable";

export type RagDocumentHit = {
  /** DesignDoc row id */
  documentId: string;
  source: string;
  chunkIndex: number;
  content: string;
  /** Raw cosine similarity vs query embedding */
  similarityScore: number;
  /** Normalized lexical overlap with the user query */
  lexicalScore: number;
  /** Blended score used for ordering */
  combinedScore: number;
  /** Whether `similarityScore` met the configured floor before rerank */
  passedSimilarityThreshold: boolean;
  metadata: Record<string, unknown> | null;
  /** Optional category from doc metadata when present */
  category?: string;
};

export type RetrieveForChatResult = {
  hits: RagDocumentHit[];
  /** Best cosine among all chunks when nothing met the inclusion bar (diagnostics). */
  topCosineBelowThreshold: number;
  quality: RetrievalQualityLevel;
  /** Embedding or datastore failure — do not treat as “no relevant docs”. */
  embeddingUnavailable: boolean;
};
