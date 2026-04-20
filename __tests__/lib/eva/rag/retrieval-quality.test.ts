import { describe, expect, it } from "vitest";
import { classifyRetrievalQuality } from "@/lib/eva/rag/retrieval-quality";
import type { RagDocumentHit } from "@/lib/eva/rag/retrieval-types";
import {
  RAG_STRONG_COMBINED_MIN_SCORE,
  RAG_STRONG_LEXICAL_MIN_SCORE,
  RAG_STRONG_SIMILARITY_MIN_SCORE,
} from "@/lib/eva/rag/rag-retrieval-constants";

function hit(overrides: Partial<RagDocumentHit>): RagDocumentHit {
  return {
    documentId: "d1",
    source: "seed",
    chunkIndex: 0,
    content: "test content about sofas",
    similarityScore: RAG_STRONG_SIMILARITY_MIN_SCORE,
    lexicalScore: RAG_STRONG_LEXICAL_MIN_SCORE,
    combinedScore: RAG_STRONG_COMBINED_MIN_SCORE,
    passedSimilarityThreshold: true,
    metadata: null,
    ...overrides,
  };
}

describe("classifyRetrievalQuality", () => {
  it("returns unavailable when embedding failed", () => {
    expect(
      classifyRetrievalQuality({
        hits: [],
        embeddingUnavailable: true,
        bestCosineOverall: 0.9,
      }),
    ).toBe("unavailable");
  });

  it("returns strong when the top hit clears all gates", () => {
    expect(
      classifyRetrievalQuality({
        hits: [hit({})],
        embeddingUnavailable: false,
        bestCosineOverall: 0.5,
      }),
    ).toBe("strong");
  });

  it("returns weak when hits exist but gates fail", () => {
    expect(
      classifyRetrievalQuality({
        hits: [
          hit({
            combinedScore: 0.1,
            similarityScore: 0.1,
            lexicalScore: 0.01,
          }),
        ],
        embeddingUnavailable: false,
        bestCosineOverall: 0.2,
      }),
    ).toBe("weak");
  });

  it("returns weak when nothing included but cosine signal exists", () => {
    expect(
      classifyRetrievalQuality({
        hits: [],
        embeddingUnavailable: false,
        bestCosineOverall: 0.31,
      }),
    ).toBe("weak");
  });

  it("returns none when there is no signal", () => {
    expect(
      classifyRetrievalQuality({
        hits: [],
        embeddingUnavailable: false,
        bestCosineOverall: 0,
      }),
    ).toBe("none");
  });
});
