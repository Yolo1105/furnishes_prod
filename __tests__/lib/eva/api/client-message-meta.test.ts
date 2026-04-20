import { describe, expect, it } from "vitest";
import { shouldSkipExtractionFromClientMeta } from "@/lib/eva/api/client-message-meta";

describe("shouldSkipExtractionFromClientMeta", () => {
  it("skips on quick_suggestion without duplicate skipExtraction flag", () => {
    expect(
      shouldSkipExtractionFromClientMeta("quick_suggestion", undefined),
    ).toBe(true);
  });

  it("skips on explicit skipExtraction", () => {
    expect(shouldSkipExtractionFromClientMeta(undefined, true)).toBe(true);
  });

  it("does not skip typed or absent meta", () => {
    expect(shouldSkipExtractionFromClientMeta("typed", undefined)).toBe(false);
    expect(shouldSkipExtractionFromClientMeta(undefined, undefined)).toBe(
      false,
    );
    expect(shouldSkipExtractionFromClientMeta(undefined, false)).toBe(false);
  });
});
