import { describe, expect, it } from "vitest";
import { parsePriceRange } from "./parsePriceRange";

describe("parsePriceRange", () => {
  it('returns null for "All"', () => {
    expect(parsePriceRange("All")).toBeNull();
  });

  it("parses Under $N with plain digits", () => {
    expect(parsePriceRange("Under $100")).toEqual({ min: 0, max: 100 });
  });

  it("parses Under $N with thousands separator", () => {
    expect(parsePriceRange("Under $1,500")).toEqual({ min: 0, max: 1500 });
  });

  it("parses $N+ as open-ended max", () => {
    expect(parsePriceRange("$1000+")).toEqual({ min: 1000, max: Infinity });
    expect(parsePriceRange("$2,500+")).toEqual({ min: 2500, max: Infinity });
  });

  it("parses hyphenated dollar range", () => {
    expect(parsePriceRange("$100 - $500")).toEqual({ min: 100, max: 500 });
    expect(parsePriceRange("$100-$500")).toEqual({ min: 100, max: 500 });
  });

  it("parses en-dash range", () => {
    expect(parsePriceRange("$100 – $500")).toEqual({ min: 100, max: 500 });
  });

  it("parses 'to' range (case-insensitive)", () => {
    expect(parsePriceRange("$50 to $200")).toEqual({ min: 50, max: 200 });
    expect(parsePriceRange("$50 TO $200")).toEqual({ min: 50, max: 200 });
  });

  it("allows second bound without dollar sign", () => {
    expect(parsePriceRange("$100 - 500")).toEqual({ min: 100, max: 500 });
  });

  it("returns null when no pattern matches", () => {
    expect(parsePriceRange("")).toBeNull();
    expect(parsePriceRange("cheap")).toBeNull();
    expect(parsePriceRange("Under")).toBeNull();
  });
});
