import { describe, expect, it } from "vitest";
import {
  createGenerationSchema,
  parseAllowedSizes,
  promptSummary,
  sanitizePrompt,
} from "./image-generation-schema";

describe("image generation schema", () => {
  it("accepts a valid prompt and size", () => {
    const parsed = createGenerationSchema.safeParse({
      prompt: "warm oak living room",
      width: 1024,
      height: 1024,
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects short prompts", () => {
    const parsed = createGenerationSchema.safeParse({
      prompt: "ab",
      width: 1024,
      height: 1024,
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects disallowed sizes", () => {
    const parsed = createGenerationSchema.safeParse({
      prompt: "warm oak living room",
      width: 111,
      height: 111,
    });
    expect(parsed.success).toBe(false);
  });

  it("sanitizes and summarizes prompts", () => {
    expect(sanitizePrompt("  soft   linen  ")).toBe("soft linen");
    expect(promptSummary("a".repeat(100), 20).endsWith("…")).toBe(true);
  });

  it("parses allowed sizes from env-like strings", () => {
    expect(parseAllowedSizes("768x768,1024x1024")).toHaveLength(2);
  });
});
