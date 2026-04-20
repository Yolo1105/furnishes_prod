import { describe, expect, it } from "vitest";
import { cosineSimilarity } from "@/lib/eva/rag/cosine-similarity";

describe("RAG cosine scoring (unit)", () => {
  it("returns 1 for identical embeddings", () => {
    const v = [0.6, 0.8, 0];
    expect(cosineSimilarity(v, v)).toBeCloseTo(1, 5);
  });

  it("returns 0 for orthogonal vectors", () => {
    expect(cosineSimilarity([1, 0, 0], [0, 1, 0])).toBe(0);
  });
});
