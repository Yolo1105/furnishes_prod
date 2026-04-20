import { prisma } from "@/lib/eva/db";
import { embedText } from "@/lib/eva/rag/embeddings";
import { cosineSimilarity } from "@/lib/eva/rag/cosine-similarity";
import {
  RAG_COSINE_RELATIVE_TO_FLOOR,
  RAG_DEFAULT_TOP_K,
  RAG_RELEVANCE_FLOOR,
  RAG_RERANK_CANDIDATE_POOL,
} from "@/lib/eva/rag/rag-retrieval-constants";
import {
  combinedRetrievalScore,
  lexicalOverlapScore,
} from "@/lib/eva/rag/rerank";
import { classifyRetrievalQuality } from "@/lib/eva/rag/retrieval-quality";
import type {
  RagDocumentHit,
  RetrieveForChatResult,
} from "@/lib/eva/rag/retrieval-types";

type DesignDocRow = {
  id: string;
  source: string;
  chunkIndex: number;
  content: string;
  embedding: number[];
  metadata: unknown;
};

/** Cached design doc rows to avoid full table scan on every request. */
let cachedRows: DesignDocRow[] | null = null;

/** Call after re-seeding design docs so the next retrieveRelevant uses fresh data. */
export function invalidateRagCache(): void {
  cachedRows = null;
}

const DESIGN_DOC_METADATA_CATEGORY_KEYS = ["category", "topic"] as const;

function parseMetadata(raw: unknown): {
  record: Record<string, unknown> | null;
  category?: string;
} {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) {
    return { record: null };
  }
  const record = raw as Record<string, unknown>;
  let category: string | undefined;
  for (const key of DESIGN_DOC_METADATA_CATEGORY_KEYS) {
    const value = record[key];
    if (typeof value === "string") {
      category = value;
      break;
    }
  }
  return { record, category };
}

async function getDesignDocRows(): Promise<DesignDocRow[]> {
  if (cachedRows) return cachedRows;
  const rows = await prisma.designDoc.findMany({
    select: {
      id: true,
      source: true,
      chunkIndex: true,
      content: true,
      embedding: true,
      metadata: true,
    },
  });
  const withEmbedding = rows
    .filter(
      (row): row is typeof row & { embedding: number[] } =>
        row.embedding != null,
    )
    .map((row) => ({
      id: row.id,
      source: row.source,
      chunkIndex: row.chunkIndex,
      content: row.content,
      embedding: row.embedding as number[],
      metadata: row.metadata,
    }));
  cachedRows = withEmbedding;
  return withEmbedding;
}

/**
 * Retrieve design doc chunks with cosine pre-rank, lexical rerank, and provenance.
 */
export async function retrieveRelevant(
  query: string,
  topK: number = RAG_DEFAULT_TOP_K,
  minSimilarity: number = RAG_RELEVANCE_FLOOR,
): Promise<RetrieveForChatResult> {
  const rows = await getDesignDocRows();
  if (rows.length === 0) {
    return {
      hits: [],
      topCosineBelowThreshold: 0,
      quality: "none",
      embeddingUnavailable: false,
    };
  }

  let queryEmbedding: number[];
  try {
    queryEmbedding = await embedText(query);
  } catch {
    return {
      hits: [],
      topCosineBelowThreshold: 0,
      quality: "unavailable",
      embeddingUnavailable: true,
    };
  }

  const cosineRanked = rows
    .map((row) => ({
      row,
      similarityScore: cosineSimilarity(queryEmbedding, row.embedding),
    }))
    .sort((a, b) => b.similarityScore - a.similarityScore);

  const bestCosine = cosineRanked[0]?.similarityScore ?? 0;
  const pool = cosineRanked.slice(
    0,
    Math.min(RAG_RERANK_CANDIDATE_POOL, cosineRanked.length),
  );

  const reranked: RagDocumentHit[] = pool.map(({ row, similarityScore }) => {
    const lexicalScore = lexicalOverlapScore(query, row.content);
    const combinedScore = combinedRetrievalScore(similarityScore, lexicalScore);
    const { record, category } = parseMetadata(row.metadata);
    return {
      documentId: row.id,
      source: row.source,
      chunkIndex: row.chunkIndex,
      content: row.content,
      similarityScore,
      lexicalScore,
      combinedScore,
      passedSimilarityThreshold: similarityScore >= minSimilarity,
      metadata: record,
      category,
    };
  });

  reranked.sort((a, b) => b.combinedScore - a.combinedScore);

  const cosineGate = minSimilarity * RAG_COSINE_RELATIVE_TO_FLOOR;
  const aboveFloor = reranked.filter(
    (hit) =>
      hit.combinedScore >= minSimilarity && hit.similarityScore >= cosineGate,
  );
  const chosen = aboveFloor.slice(0, topK);

  const topCosineBelowThreshold = bestCosine < minSimilarity ? bestCosine : 0;

  const quality = classifyRetrievalQuality({
    hits: chosen,
    embeddingUnavailable: false,
    bestCosineOverall: bestCosine,
  });

  return {
    hits: chosen,
    topCosineBelowThreshold,
    quality,
    embeddingUnavailable: false,
  };
}
