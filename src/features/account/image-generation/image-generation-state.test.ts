import { describe, expect, it } from "vitest";
import {
  altTextFromPrompt,
  errorCopyForCode,
  nextPollDelayMs,
  shouldPoll,
} from "./image-generation-state";

describe("shouldPoll", () => {
  it("polls active statuses while the tab is visible", () => {
    expect(shouldPoll("queued", false)).toBe(true);
    expect(shouldPoll("generating", false)).toBe(true);
  });

  it("does not poll terminal statuses", () => {
    expect(shouldPoll("ready", false)).toBe(false);
    expect(shouldPoll("failed", false)).toBe(false);
    expect(shouldPoll("canceled", false)).toBe(false);
  });

  it("pauses polling while the document is hidden", () => {
    expect(shouldPoll("generating", true)).toBe(false);
  });
});

describe("nextPollDelayMs", () => {
  it("grows with each attempt", () => {
    const first = nextPollDelayMs(0);
    const second = nextPollDelayMs(1);
    const third = nextPollDelayMs(2);
    expect(second).toBeGreaterThan(first);
    expect(third).toBeGreaterThan(second);
  });

  it("caps the delay so it never grows unbounded", () => {
    const capped = nextPollDelayMs(50);
    expect(capped).toBeLessThanOrEqual(20000);
    expect(nextPollDelayMs(1000)).toBe(capped);
  });

  it("treats negative attempts as the first attempt", () => {
    expect(nextPollDelayMs(-3)).toBe(nextPollDelayMs(0));
  });
});

describe("altTextFromPrompt", () => {
  it("trims whitespace and control characters", () => {
    expect(altTextFromPrompt("  a cozy   living\troom  ")).toBe(
      "a cozy living room",
    );
  });

  it("falls back for empty prompts", () => {
    expect(altTextFromPrompt("   ")).toBe("Generated room image");
  });

  it("truncates long prompts with an ellipsis", () => {
    const long = "a".repeat(200);
    const result = altTextFromPrompt(long, 20);
    expect(result.length).toBe(20);
    expect(result.endsWith("…")).toBe(true);
  });
});

describe("errorCopyForCode", () => {
  it("maps known provider error codes to friendly copy", () => {
    expect(errorCopyForCode("provider_unavailable", "fallback")).toMatch(
      /configured/,
    );
    expect(errorCopyForCode("rate_limited", "fallback")).toMatch(/limit/);
    expect(errorCopyForCode("concurrency_limit", "fallback")).toMatch(
      /in-progress/,
    );
  });

  it("falls back to the provided message for unknown codes", () => {
    expect(errorCopyForCode("provider_failed", "fallback")).toBe("fallback");
    expect(errorCopyForCode(null, "fallback")).toBe("fallback");
  });
});
