import { describe, it, expect } from "vitest";
import {
  expandVocabulary,
  expandMessageVocabulary,
  normalizeForMatching,
} from "@/lib/eva/extraction/vocabulary";

describe("vocabulary", () => {
  describe("expandVocabulary", () => {
    it("expands mcm to mid-century modern", () => {
      expect(expandVocabulary("mcm")).toBe("mid-century modern");
    });
    it("expands scandi to scandinavian", () => {
      expect(expandVocabulary("scandi")).toBe("scandinavian");
    });
    it("expands japandi to japandi (canonical term)", () => {
      expect(expandVocabulary("japandi")).toBe("japandi");
    });
    it("returns original term when not in map", () => {
      expect(expandVocabulary("modern")).toBe("modern");
    });
    it("is case-insensitive for lookup", () => {
      expect(expandVocabulary("MCM")).toBe("mid-century modern");
    });
  });

  describe("expandMessageVocabulary (phrase-first)", () => {
    it("expands multi-word phrase mid century to mid-century modern", () => {
      expect(expandMessageVocabulary("I love mid century furniture")).toBe(
        "I love mid-century modern furniture",
      );
    });
    it("expands art deco as phrase", () => {
      expect(expandMessageVocabulary("Looking for art deco style")).toBe(
        "Looking for art deco style",
      );
    });
    it("expands sage green and accent chair", () => {
      expect(
        expandMessageVocabulary("sage green walls and an accent chair"),
      ).toBe("sage green walls and an accent chair");
    });
    it("expands single words in message", () => {
      expect(expandMessageVocabulary("mcm and scandi")).toBe(
        "mid-century modern and scandinavian",
      );
    });
  });

  describe("normalizeForMatching", () => {
    it("expands then lowercases and trims", () => {
      expect(normalizeForMatching("  MCM  ")).toBe("mid-century modern");
    });
    it("returns empty string for empty input", () => {
      expect(normalizeForMatching("")).toBe("");
    });
  });
});
