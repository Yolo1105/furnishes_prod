import { describe, expect, it } from "vitest";
import {
  criticalTurnFactsToPromptBlock,
  extractCriticalTurnFacts,
} from "@/lib/eva/core/critical-turn-extraction";

describe("extractCriticalTurnFacts", () => {
  it("captures budget phrasing in the same turn", () => {
    const facts = extractCriticalTurnFacts(
      "I need ideas under $5000 for the sofa.",
    );
    expect(facts.explicitBudget).toBeTruthy();
    expect(criticalTurnFactsToPromptBlock(facts)).toContain("Budget");
  });

  it("captures avoid / exclusion language", () => {
    const facts = extractCriticalTurnFacts(
      "Please avoid dark wood and high gloss.",
    );
    expect(facts.exclusions.length).toBeGreaterThan(0);
    expect(criticalTurnFactsToPromptBlock(facts)).toMatch(/dark wood|gloss/i);
  });

  it("captures room type hints", () => {
    const facts = extractCriticalTurnFacts(
      "For my living room, what rug size?",
    );
    expect(facts.roomTypeHint).toMatch(/living room/i);
  });
});
