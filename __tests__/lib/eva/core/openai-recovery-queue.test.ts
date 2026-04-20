import { describe, expect, it } from "vitest";
import {
  buildChatRecoveryGenerateTextModelQueue,
  OPENAI_FALLBACK_MODEL,
  OPENAI_PRIMARY_MODEL,
} from "@/lib/eva/core/openai";

describe("buildChatRecoveryGenerateTextModelQueue", () => {
  it("includes env extra, route models, and legacy slugs without duplicates", () => {
    const queue = buildChatRecoveryGenerateTextModelQueue();
    expect(queue.length).toBeGreaterThanOrEqual(3);
    const firstFallbackIndex = queue.indexOf(OPENAI_FALLBACK_MODEL);
    const firstPrimaryIndex = queue.indexOf(OPENAI_PRIMARY_MODEL);
    expect(firstFallbackIndex).toBeGreaterThanOrEqual(0);
    expect(firstPrimaryIndex).toBeGreaterThan(firstFallbackIndex);
    expect(new Set(queue).size).toBe(queue.length);
  });
});
