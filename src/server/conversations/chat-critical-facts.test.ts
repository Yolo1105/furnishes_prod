import { describe, expect, it } from "vitest";
import {
  criticalFactsToPromptBlock,
  extractCriticalTurnFacts,
  hasCriticalTurnFacts,
} from "./chat-critical-facts";

describe("extractCriticalTurnFacts", () => {
  it("captures budget phrasing in the same turn", () => {
    const facts = extractCriticalTurnFacts(
      "I need ideas under $5000 for the sofa.",
    );
    expect(facts.explicitBudget).toBeTruthy();
    expect(criticalFactsToPromptBlock(facts)).toContain("Budget");
  });

  it("captures avoid / exclusion language", () => {
    const facts = extractCriticalTurnFacts(
      "Please avoid dark wood and high gloss.",
    );
    expect(facts.exclusions.length).toBeGreaterThan(0);
    expect(criticalFactsToPromptBlock(facts)).toMatch(/dark wood|gloss/i);
  });

  it("captures room type hints", () => {
    const facts = extractCriticalTurnFacts(
      "For my living room, what rug size?",
    );
    expect(facts.roomTypeHint).toMatch(/living room/i);
  });

  it("captures imperial room dimensions", () => {
    const facts = extractCriticalTurnFacts("The room is 12x14 feet.");
    expect(facts.widthFeet).toBe(12);
    expect(facts.lengthFeet).toBe(14);
    expect(criticalFactsToPromptBlock(facts)).toMatch(/12\.0 ft/);
  });

  it("captures 12 by 14 feet phrasing", () => {
    const facts = extractCriticalTurnFacts("Layout for 12 by 14 feet space.");
    expect(facts.widthFeet).toBe(12);
    expect(facts.lengthFeet).toBe(14);
  });

  it("captures metric dimensions as feet", () => {
    const facts = extractCriticalTurnFacts("Room is 4 m by 5 m roughly.");
    expect(facts.widthFeet).not.toBeNull();
    expect(facts.lengthFeet).not.toBeNull();
    expect(facts.widthFeet!).toBeCloseTo(4 * 3.28084, 1);
    expect(facts.lengthFeet!).toBeCloseTo(5 * 3.28084, 1);
  });

  it("captures seat and household counts", () => {
    const seats = extractCriticalTurnFacts("Need a dining table that seats 6.");
    expect(seats.seatCount).toBe(6);
    const family = extractCriticalTurnFacts("Planning for a family of 4.");
    expect(family.householdCount).toBe(4);
  });

  it("captures hard constraints", () => {
    const facts = extractCriticalTurnFacts(
      "The sofa must fit the alcove and no more than 84 inches wide.",
    );
    expect(facts.hardConstraints.length).toBeGreaterThan(0);
    expect(criticalFactsToPromptBlock(facts)).toMatch(/must fit|no more than/i);
  });

  it("reports empty facts as not injectable", () => {
    const facts = extractCriticalTurnFacts("Thanks!");
    expect(hasCriticalTurnFacts(facts)).toBe(false);
  });
});
