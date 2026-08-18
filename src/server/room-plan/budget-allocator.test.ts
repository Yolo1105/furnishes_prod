import { describe, expect, it } from "vitest";
import { allocate } from "./budget-allocator";

describe("allocate", () => {
  it("fills living-room mid-band suggestions for empty budgets", () => {
    const result = allocate("living room", 10_000_00, [
      { id: "1", category: "sofa", priority: "core", budgetCents: null },
      { id: "2", category: "rug", priority: "secondary", budgetCents: null },
      { id: "3", category: "lighting", priority: "accent", budgetCents: null },
    ]);
    expect(result.suggestions).toEqual(
      expect.arrayContaining([
        { id: "1", budgetCents: 3_500_00 },
        { id: "2", budgetCents: 1_000_00 },
        { id: "3", budgetCents: 900_00 },
      ]),
    );
    expect(result.warnings.some((w) => /exceed/i.test(w))).toBe(false);
  });

  it("leaves existing budgets alone", () => {
    const result = allocate("bedroom", 8_000_00, [
      { id: "1", category: "bed", priority: "core", budgetCents: 4_000_00 },
    ]);
    expect(result.suggestions).toEqual([]);
  });

  it("warns when cap is zero", () => {
    const result = allocate("dining", 0, [
      { id: "1", category: "table", priority: "core", budgetCents: null },
    ]);
    expect(result.suggestions).toEqual([]);
    expect(result.warnings[0]).toMatch(/cap/i);
  });

  it("warns when living allocations exceed cap", () => {
    const over = allocate("living", 1_000_00, [
      { id: "1", category: "sofa", priority: "core", budgetCents: 950_00 },
      { id: "2", category: "rug", priority: "secondary", budgetCents: null },
    ]);
    expect(over.warnings.some((w) => /exceed/i.test(w))).toBe(true);
  });
});
