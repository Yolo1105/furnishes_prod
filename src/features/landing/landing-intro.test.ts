import { describe, expect, it } from "vitest";
import { shouldSkipLandingLoader } from "./landing-intro";

describe("shouldSkipLandingLoader", () => {
  it("plays on a first visit (no query)", () => {
    expect(shouldSkipLandingLoader({ introQuery: null })).toBe(false);
  });

  it("replays with ?intro=1", () => {
    expect(shouldSkipLandingLoader({ introQuery: "1" })).toBe(false);
  });

  it("still skips for E2E ?intro=skip", () => {
    expect(shouldSkipLandingLoader({ introQuery: "skip" })).toBe(true);
    expect(shouldSkipLandingLoader({ introQuery: "SKIP" })).toBe(true);
  });
});
