/**
 * Design-doc retrieval for chat grounding.
 *
 * Cache policy (deliberate improvement over legacy whole-table module cache):
 * load DesignDoc rows per request through a small in-process TTL cache (60s)
 * keyed by a version stamp of `count + max(createdAt)`. On stamp change or TTL
 * expiry the cache reloads. This is the swap point if pgvector lands later.
 *
 * Re-derived from legacy `lib/eva/rag/retriever.ts`.
 */

import { prisma } from "@/server/db";
import {
  RAG_COSINE_RELATIVE_TO_FLOOR,
  RAG_DEFAULT_TOP_K,
  RAG_DOC_CACHE_TTL_MS,
  RAG_RELEVANCE_FLOOR,
  RAG_RERANK_CANDIDATE_POOL,
} from "./constants";
import { cosineSimilarity } from "./cosine";
import { embedText, type EmbedCostContext } from "./embeddings";
import { classifyRetrievalQuality } from "./retrieval-quality";
import { combinedRetrievalScore, lexicalOverlapScore } from "./rerank";
import type {
  DesignDocRow,
  RagDocumentHit,
  RetrieveForChatResult,
} from "./types";

type CacheEntry = {
  stamp: string;
  expiresAt: number;
  rows: DesignDocRow[];
};

let cache: CacheEntry | null = null;

const DESIGN_DOC_METADATA_CATEGORY_KEYS = ["category", "topic"] as const;

function parseMetadata(raw: unknown): {
  record: Record<string, unknown> | null;
  category?: string;
} {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) {
    return { record: null };
  }
  const record = raw as Record<string, unknown>;
  for (const key of DESIGN_DOC_METADATA_CATEGORY_KEYS) {
    const value = record[key];
    if (typeof value === "string") {
      return { record, category: value };
    }
  }
  return { record };
}

async function readCorpusStamp(): Promise<string> {
  const [count, latest] = await Promise.all([
    prisma.designDoc.count(),
    prisma.designDoc.findFirst({
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
  ]);
  const maxCreated = latest?.createdAt?.toISOString() ?? "none";
  return `${count}:${maxCreated}`;
}

async function loadDesignDocRowsFromDb(): Promise<DesignDocRow[]> {
  const rows = await prisma.designDoc.findMany({
    select: {
      id: true,
      source: true,
      chunkIndex: true,
      content: true,
      embedding: true,
      metadata: true,
      createdAt: true,
    },
  });
  return rows
    .filter((row) => Array.isArray(row.embedding) && row.embedding.length > 0)
    .map((row) => ({
      id: row.id,
      source: row.source,
      chunkIndex: row.chunkIndex,
      content: row.content,
      embedding: row.embedding,
      metadata: row.metadata,
      createdAt: row.createdAt,
    }));
}

/** Test/ops helper — drop the in-process cache immediately. */
export function invalidateRagCache(): void {
  cache = null;
}

type RetrieverDeps = {
  loadRows: () => Promise<DesignDocRow[]>;
  embedQuery: (
    query: string,
    costContext?: EmbedCostContext,
  ) => Promise<number[]>;
  now?: () => number;
};

const defaultDeps: RetrieverDeps = {
  loadRows: async () => {
    const stamp = await readCorpusStamp();
    const now = Date.now();
    if (cache && cache.stamp === stamp && cache.expiresAt > now) {
      return cache.rows;
    }
    const rows = await loadDesignDocRowsFromDb();
    cache = {
      stamp,
      expiresAt: now + RAG_DOC_CACHE_TTL_MS,
      rows,
    };
    return rows;
  },
  embedQuery: embedText,
};

/**
 * Retrieve design doc chunks with cosine pre-rank, lexical rerank, and quality.
 */
export async function retrieveRelevant(
  query: string,
  options: {
    topK?: number;
    minSimilarity?: number;
    costContext?: EmbedCostContext;
  } = {},
  deps: RetrieverDeps = defaultDeps,
): Promise<RetrieveForChatResult> {
  const topK = options.topK ?? RAG_DEFAULT_TOP_K;
  const minSimilarity = options.minSimilarity ?? RAG_RELEVANCE_FLOOR;
  const rows = await deps.loadRows();
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
    queryEmbedding = await deps.embedQuery(query, options.costContext);
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
      ...(category ? { category } : {}),
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
