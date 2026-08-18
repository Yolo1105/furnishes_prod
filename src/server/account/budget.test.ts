import { describe, expect, it } from "vitest";
import { SUPPORTED_CURRENCIES as SETTLEMENT_CURRENCIES } from "@/lib/commerce/money";
import { parseBudgetInput, SUPPORTED_CURRENCIES } from "./budget-schema";

describe("budget validation", () => {
  it("accepts optional bounds", () => {
    const parsed = parseBudgetInput({
      minimum: null,
      maximum: null,
      currency: "SGD",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects negative values", () => {
    const parsed = parseBudgetInput({
      minimum: -1,
      maximum: 10,
      currency: "USD",
    });
    expect(parsed.success).toBe(false);
  });

  it("accepts AUD (settlement currency)", () => {
    const parsed = parseBudgetInput({
      minimum: 100,
      maximum: 200,
      currency: "AUD",
    });
    expect(parsed.success).toBe(true);
  });

  it("planning currencies are the settlement set (one list)", () => {
    expect(SUPPORTED_CURRENCIES).toBe(SETTLEMENT_CURRENCIES);
  });

  it("accepts room allocations", () => {
    const parsed = parseBudgetInput({
      minimum: 1000,
      maximum: 5000,
      currency: "SGD",
      allocations: [{ name: "Living room", description: "Sofa", amount: 2000 }],
    });
    expect(parsed.success).toBe(true);
  });
});
