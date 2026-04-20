import { describe, it, expect } from "vitest";
import { z } from "zod";

/**
 * These schemas mirror lib/actions/support.ts — we re-declare them here
 * rather than importing from the "use server" file (which can't be imported
 * in test env). In a real setup, extract the schemas to a pure module and
 * share them.
 */
const HelpCategory = z.enum(["order", "billing", "access", "other"]);
const FeedbackCategory = z.enum(["bug", "feature", "general"]);
const ReproductionFrequency = z.enum(["always", "often", "sometimes", "once"]);

const CreateHelpSchema = z.object({
  category: HelpCategory,
  title: z.string().trim().min(4).max(200),
  body: z.string().trim().min(10).max(5_000),
});

const CreateFeedbackSchema = z.object({
  category: FeedbackCategory,
  title: z.string().trim().min(4).max(200),
  body: z.string().trim().min(10).max(5_000),
  reproductionFrequency: ReproductionFrequency.optional(),
});

describe("CreateHelpSchema", () => {
  it("accepts a valid help request", () => {
    const result = CreateHelpSchema.safeParse({
      category: "billing",
      title: "Invoice missing",
      body: "My March invoice never showed up in the billing page.",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid category", () => {
    const result = CreateHelpSchema.safeParse({
      category: "bug", // wrong — bug is feedback, not help
      title: "Test subject",
      body: "Test body content here",
    });
    expect(result.success).toBe(false);
  });

  it("rejects too-short title", () => {
    const result = CreateHelpSchema.safeParse({
      category: "billing",
      title: "X",
      body: "Test body content here",
    });
    expect(result.success).toBe(false);
  });

  it("rejects too-short body (< 10 chars)", () => {
    const result = CreateHelpSchema.safeParse({
      category: "billing",
      title: "Valid subject",
      body: "too short",
    });
    expect(result.success).toBe(false);
  });

  it("rejects oversized body (> 5000 chars)", () => {
    const result = CreateHelpSchema.safeParse({
      category: "billing",
      title: "Valid subject",
      body: "x".repeat(5001),
    });
    expect(result.success).toBe(false);
  });

  it("trims whitespace before validating", () => {
    const result = CreateHelpSchema.safeParse({
      category: "billing",
      title: "   Trim me   ",
      body: "   This has enough characters when trimmed   ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe("Trim me");
    }
  });
});

describe("CreateFeedbackSchema", () => {
  it("accepts a valid feedback request without reproduction frequency", () => {
    const result = CreateFeedbackSchema.safeParse({
      category: "feature",
      title: "Feature idea",
      body: "Would love to see a mobile app for furniture browsing.",
    });
    expect(result.success).toBe(true);
  });

  it("accepts a bug with reproduction frequency", () => {
    const result = CreateFeedbackSchema.safeParse({
      category: "bug",
      title: "Crash on login",
      body: "App crashes every time I try to sign in with Google.",
      reproductionFrequency: "always",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid reproduction frequency", () => {
    const result = CreateFeedbackSchema.safeParse({
      category: "bug",
      title: "Crash on login",
      body: "App crashes every time I try to sign in.",
      reproductionFrequency: "occasional", // wrong enum value
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-feedback category", () => {
    const result = CreateFeedbackSchema.safeParse({
      category: "billing", // billing is help, not feedback
      title: "Test title",
      body: "Test body content here",
    });
    expect(result.success).toBe(false);
  });
});
