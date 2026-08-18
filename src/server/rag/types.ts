export type RetrievalQualityLevel = "strong" | "weak" | "none" | "unavailable";

export type RagDocumentHit = {
  documentId: string;
  source: string;
  chunkIndex: number;
  content: string;
  similarityScore: number;
  lexicalScore: number;
  combinedScore: number;
  passedSimilarityThreshold: boolean;
  metadata: Record<string, unknown> | null;
  category?: string;
};

export type RetrieveForChatResult = {
  hits: RagDocumentHit[];
  topCosineBelowThreshold: number;
  quality: RetrievalQualityLevel;
  embeddingUnavailable: boolean;
};

export type DesignDocRow = {
  id: string;
  source: string;
  chunkIndex: number;
  content: string;
  embedding: number[];
  metadata: unknown;
  createdAt?: Date;
};
