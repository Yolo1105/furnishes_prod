import { describe, expect, it } from "vitest";
import { shouldSkipLandingLoader } from "./landing-intro";

describe("shouldSkipLandingLoader", () => {
  it("skips after the seen cookie is set", () => {
    expect(
      shouldSkipLandingLoader({
        introQuery: null,
        seenCookie: "1",
      }),
    ).toBe(true);
  });

  it("plays on a first visit", () => {
    expect(
      shouldSkipLandingLoader({
        introQuery: null,
        seenCookie: null,
      }),
    ).toBe(false);
  });

  it("replays with ?intro=1 even when already seen", () => {
    expect(
      shouldSkipLandingLoader({
        introQuery: "1",
        seenCookie: "1",
      }),
    ).toBe(false);
  });

  it("still skips for E2E ?intro=skip", () => {
    expect(
      shouldSkipLandingLoader({
        introQuery: "skip",
        seenCookie: null,
      }),
    ).toBe(true);
  });
});
