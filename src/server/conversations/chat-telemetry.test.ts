import { describe, expect, it } from "vitest";
import {
  computeCacheHitRatio,
  extractCachedPromptTokens,
  toChatUsageLike,
} from "./chat-telemetry";

describe("chat telemetry cache helpers", () => {
  it("reads cached_tokens from prompt_tokens_details", () => {
    expect(
      extractCachedPromptTokens({
        prompt_tokens: 100,
        completion_tokens: 10,
        prompt_tokens_details: { cached_tokens: 40 },
      }),
    ).toBe(40);
  });

  it("returns null when cache details are absent", () => {
    expect(extractCachedPromptTokens({ prompt_tokens: 10 })).toBeNull();
  });

  it("computes cache hit ratio", () => {
    expect(computeCacheHitRatio(100, 40)).toBe(0.4);
    expect(computeCacheHitRatio(0, 10)).toBeNull();
  });

  it("still parses basic usage", () => {
    expect(toChatUsageLike({ prompt_tokens: 5, completion_tokens: 2 })).toEqual(
      { promptTokens: 5, completionTokens: 2 },
    );
  });
});
