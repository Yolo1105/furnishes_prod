import { describe, expect, it } from "vitest";
import { computeReadiness, coreDecidedRatio } from "./readiness";

describe("computeReadiness", () => {
  it("scores exploring when nothing is decided", () => {
    const result = computeReadiness({
      plan: {
        budgetCapCents: 500_000,
        items: [
          {
            label: "Sofa",
            priority: "core",
            status: "needed",
            budgetCents: 200_000,
            actualCents: null,
          },
          {
            label: "Lamp",
            priority: "secondary",
            status: "needed",
            budgetCents: 40_000,
            actualCents: null,
          },
        ],
      },
      styleConfirmed: false,
      colorConfirmed: false,
    });
    expect(result.label).toBe("exploring");
    expect(result.missingCore).toEqual(["Sofa"]);
    expect(result.score).toBe(10); // budget within cap only
  });

  it("reaches ready to order when all core decided and under budget", () => {
    const result = computeReadiness({
      plan: {
        budgetCapCents: 500_000,
        items: [
          {
            label: "Sofa",
            priority: "core",
            status: "decided",
            budgetCents: 200_000,
            actualCents: null,
          },
          {
            label: "Rug",
            priority: "core",
            status: "purchased",
            budgetCents: 50_000,
            actualCents: 45_000,
          },
          {
            label: "Lamp",
            priority: "secondary",
            status: "decided",
            budgetCents: 40_000,
            actualCents: null,
          },
        ],
      },
      styleConfirmed: true,
      colorConfirmed: true,
    });
    expect(result.overBudget).toBe(false);
    expect(result.missingCore).toEqual([]);
    expect(result.label).toBe("ready to order");
    expect(result.score).toBe(100);
  });

  it("flags overBudget and blocks ready-to-order label", () => {
    const result = computeReadiness({
      plan: {
        budgetCapCents: 100_000,
        items: [
          {
            label: "Sofa",
            priority: "core",
            status: "decided",
            budgetCents: 150_000,
            actualCents: null,
          },
        ],
      },
      styleConfirmed: true,
      colorConfirmed: true,
    });
    expect(result.overBudget).toBe(true);
    expect(result.label).not.toBe("ready to order");
    expect(result.breakdown.budgetScore).toBe(0);
  });
});

describe("coreDecidedRatio", () => {
  it("returns fraction of core decided", () => {
    expect(
      coreDecidedRatio([
        {
          label: "A",
          priority: "core",
          status: "decided",
          budgetCents: null,
          actualCents: null,
        },
        {
          label: "B",
          priority: "core",
          status: "needed",
          budgetCents: null,
          actualCents: null,
        },
        {
          label: "C",
          priority: "secondary",
          status: "needed",
          budgetCents: null,
          actualCents: null,
        },
      ]),
    ).toBe(0.5);
  });
});
