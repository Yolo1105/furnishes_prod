import { describe, expect, it } from "vitest";
import {
  combinedRetrievalScore,
  lexicalOverlapScore,
} from "@/lib/eva/rag/rerank";

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
