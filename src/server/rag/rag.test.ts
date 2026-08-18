import { describe, expect, it } from "vitest";
import { cosineSimilarity } from "./cosine";
import { combinedRetrievalScore, lexicalOverlapScore } from "./rerank";
import { classifyRetrievalQuality } from "./retrieval-quality";
import {
  RAG_STRONG_COMBINED_MIN_SCORE,
  RAG_STRONG_LEXICAL_MIN_SCORE,
  RAG_STRONG_SIMILARITY_MIN_SCORE,
} from "./constants";
import type { RagDocumentHit } from "./types";
import { retrieveRelevant } from "./retriever";
import { formatReferenceKnowledgeBlock } from "./prompt-block";
import { chunkText } from "./documents";

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

describe("cosineSimilarity", () => {
  it("returns 1 for identical vectors", () => {
    expect(cosineSimilarity([1, 0], [1, 0])).toBeCloseTo(1);
  });
  it("returns 0 for orthogonal vectors", () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0);
  });
});

describe("lexicalOverlapScore", () => {
  it("is higher when query terms appear in content", () => {
    const a = lexicalOverlapScore(
      "sofa layout small room",
      "sofa layout ideas",
    );
    const b = lexicalOverlapScore("sofa layout small room", "unrelated text");
    expect(a).toBeGreaterThan(b);
  });
});

describe("combinedRetrievalScore", () => {
  it("blends cosine and lexical", () => {
    const s = combinedRetrievalScore(0.5, 0.5);
    expect(s).toBeGreaterThan(0);
    expect(s).toBeLessThanOrEqual(1);
  });
});

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

describe("chunkText", () => {
  it("splits long content into multiple chunks", () => {
    const long = Array.from(
      { length: 20 },
      (_, i) => `Paragraph ${i}. ${"x".repeat(100)}`,
    ).join("\n\n");
    const chunks = chunkText(long, "test.md");
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((c) => c.source === "test.md")).toBe(true);
  });
});

/** Tiny fixture corpus with orthogonal topic axes for golden retrieval. */
function fixtureRows() {
  return [
    {
      id: "space-1",
      source: "space-planning.md",
      chunkIndex: 0,
      content:
        "Main paths need 36 inches typical walkway clearance and 42 inches for major circulation. Keep furniture clearances for traffic flow.",
      embedding: [1, 0, 0],
      metadata: { topic: "space" },
    },
    {
      id: "color-1",
      source: "color-theory.md",
      chunkIndex: 0,
      content:
        "Use the 60-30-10 rule for color balance. Warm palettes feel cozy; cool palettes feel calm in bedrooms.",
      embedding: [0, 1, 0],
      metadata: { topic: "color" },
    },
    {
      id: "materials-1",
      source: "materials-guide.md",
      chunkIndex: 0,
      content:
        "Oak and walnut woods pair with linen and boucle. Performance fabrics resist stains for family rooms.",
      embedding: [0, 0, 1],
      metadata: { topic: "materials" },
    },
  ];
}

function embedForQuery(query: string): number[] {
  const lower = query.toLowerCase();
  if (/walkway|clearance|traffic|path|layout|space/.test(lower)) {
    return [1, 0, 0];
  }
  if (/color|palette|60-30-10|warm|cool/.test(lower)) {
    return [0, 1, 0];
  }
  if (/oak|walnut|fabric|material|linen/.test(lower)) {
    return [0, 0, 1];
  }
  return [0.33, 0.33, 0.33];
}

describe("retrieveRelevant golden fixture", () => {
  const deps = {
    loadRows: async () => fixtureRows(),
    embedQuery: async (query: string) => embedForQuery(query),
  };

  it("retrieves space-planning for walkway questions", async () => {
    const result = await retrieveRelevant(
      "What walkway clearance do I need for traffic flow?",
      { minSimilarity: 0.2 },
      deps,
    );
    expect(result.hits[0]?.source).toBe("space-planning.md");
    expect(formatReferenceKnowledgeBlock(result)).toContain(
      "space-planning.md",
    );
  });

  it("retrieves color-theory for palette questions", async () => {
    const result = await retrieveRelevant(
      "Explain the 60-30-10 color palette rule",
      { minSimilarity: 0.2 },
      deps,
    );
    expect(result.hits[0]?.source).toBe("color-theory.md");
  });

  it("retrieves materials-guide for wood/fabric questions", async () => {
    const result = await retrieveRelevant(
      "Which walnut and linen materials work together?",
      { minSimilarity: 0.2 },
      deps,
    );
    expect(result.hits[0]?.source).toBe("materials-guide.md");
  });
});
