import { describe, expect, it } from "vitest";
import {
  formatMoney,
  isSupportedCurrency,
  lineTotalCents,
  normalizeCurrency,
  percentOfCents,
  SUPPORTED_CURRENCIES,
} from "./money";

describe("money", () => {
  it("renders every currency with a distinguishable symbol", () => {
    // A bare "$" would be ambiguous on a multi-currency screen.
    const rendered = SUPPORTED_CURRENCIES.map((currency) =>
      formatMoney(132900, currency),
    );
    expect(rendered).toEqual([
      "S$1,329",
      "US$1,329",
      "€1,329",
      "£1,329",
      "A$1,329",
      "RM1,329",
    ]);
    expect(new Set(rendered).size).toBe(SUPPORTED_CURRENCIES.length);
  });

  it("drops decimals only for whole amounts", () => {
    expect(formatMoney(42000, "SGD")).toBe("S$420");
    expect(formatMoney(42050, "SGD")).toBe("S$420.50");
    expect(formatMoney(6102, "SGD")).toBe("S$61.02");
  });

  it("puts the sign before the symbol for refunds", () => {
    expect(formatMoney(-42000, "SGD")).toBe("-S$420");
  });

  it("falls back to the default currency rather than throwing", () => {
    // A stored value we no longer support must not break the cart page.
    expect(formatMoney(1000, "JPY")).toBe("S$10");
    expect(normalizeCurrency("jpy")).toBeNull();
    expect(normalizeCurrency(" sgd ")).toBe("SGD");
    expect(normalizeCurrency(null)).toBeNull();
    expect(isSupportedCurrency("SGD")).toBe(true);
  });

  it("rejects line inputs that would produce a wrong charge", () => {
    expect(lineTotalCents(1299, 3)).toBe(3897);
    expect(() => lineTotalCents(1299.5, 1)).toThrow();
    expect(() => lineTotalCents(-1, 1)).toThrow();
    expect(() => lineTotalCents(100, 0)).toThrow();
    expect(() => lineTotalCents(100, 1.5)).toThrow();
  });

  it("rounds tax half-up to the nearest cent", () => {
    expect(percentOfCents(10000, 9)).toBe(900);
    // 67800 * 9% = 6102 exactly; 61025/2 style halves round up, not down.
    expect(percentOfCents(67800, 9)).toBe(6102);
    expect(percentOfCents(105, 50)).toBe(53);
    expect(percentOfCents(10000, 0)).toBe(0);
  });
});
