import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { computeTotals } from "./totals";

const KEYS = [
  "COMMERCE_SHIPPING_FLAT_CENTS",
  "COMMERCE_FREE_SHIPPING_THRESHOLD_CENTS",
  "COMMERCE_TAX_PERCENT",
  "COMMERCE_TAX_LABEL",
] as const;

describe("order totals", () => {
  const saved: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const key of KEYS) {
      saved[key] = process.env[key];
      delete process.env[key];
    }
  });

  afterEach(() => {
    for (const key of KEYS) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  });

  it("defaults to no shipping and no tax", () => {
    const totals = computeTotals([{ unitPriceCents: 129900, quantity: 1 }]);
    expect(totals).toMatchObject({
      subtotalCents: 129900,
      shippingCents: 0,
      taxCents: 0,
      totalCents: 129900,
      taxPercent: 0,
    });
  });

  it("charges flat shipping and taxes goods plus shipping", () => {
    process.env.COMMERCE_SHIPPING_FLAT_CENTS = "2000";
    process.env.COMMERCE_TAX_PERCENT = "9";
    process.env.COMMERCE_TAX_LABEL = "GST";

    const totals = computeTotals([{ unitPriceCents: 32900, quantity: 2 }]);
    expect(totals.subtotalCents).toBe(65800);
    expect(totals.shippingCents).toBe(2000);
    // GST applies to the delivered value, not the goods alone.
    expect(totals.taxCents).toBe(6102);
    expect(totals.totalCents).toBe(73902);
    expect(totals.taxLabel).toBe("GST");
  });

  it("waives shipping at the threshold", () => {
    process.env.COMMERCE_SHIPPING_FLAT_CENTS = "2000";
    process.env.COMMERCE_FREE_SHIPPING_THRESHOLD_CENTS = "100000";

    expect(
      computeTotals([{ unitPriceCents: 99999, quantity: 1 }]).shippingCents,
    ).toBe(2000);
    expect(
      computeTotals([{ unitPriceCents: 100000, quantity: 1 }]).shippingCents,
    ).toBe(0);
  });

  it("never charges shipping on an empty cart", () => {
    process.env.COMMERCE_SHIPPING_FLAT_CENTS = "2000";
    expect(computeTotals([])).toMatchObject({
      subtotalCents: 0,
      shippingCents: 0,
      totalCents: 0,
    });
  });

  it("ignores nonsense configuration instead of charging it", () => {
    process.env.COMMERCE_TAX_PERCENT = "not-a-number";
    process.env.COMMERCE_SHIPPING_FLAT_CENTS = "-500";
    const totals = computeTotals([{ unitPriceCents: 1000, quantity: 1 }]);
    expect(totals.taxCents).toBe(0);
    expect(totals.shippingCents).toBe(0);
  });

  it("sums multiple lines by quantity", () => {
    const totals = computeTotals([
      { unitPriceCents: 18900, quantity: 4 },
      { unitPriceCents: 74900, quantity: 1 },
    ]);
    expect(totals.subtotalCents).toBe(150500);
  });
});
