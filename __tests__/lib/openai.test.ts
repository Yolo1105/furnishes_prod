import { describe, it, expect } from "vitest";
import { computeCost, withFallback } from "@/lib/eva/core/openai";

describe("openai", () => {
  describe("computeCost", () => {
    it("computes cost for gpt-4o-mini", () => {
      const usage = { promptTokens: 1_000_000, completionTokens: 500_000 };
      const cost = computeCost(usage, "gpt-4o-mini");
      expect(cost).toBeCloseTo(0.15 + 0.3, 4);
    });

    it("computes cost for gpt-3.5-turbo", () => {
      const usage = { promptTokens: 100_000, completionTokens: 50_000 };
      const cost = computeCost(usage, "gpt-3.5-turbo");
      expect(cost).toBeCloseTo(0.05 + 0.075, 4);
    });

    it("returns 0 for unknown model", () => {
      expect(
        computeCost({ promptTokens: 1000, completionTokens: 500 }, "unknown"),
      ).toBe(0);
    });

    it("handles missing token counts", () => {
      expect(computeCost({}, "gpt-4o-mini")).toBe(0);
    });
  });

  describe("withFallback", () => {
    it("returns primary result when primary succeeds", async () => {
      const result = await withFallback(
        () => Promise.resolve("primary"),
        () => Promise.resolve("fallback"),
      );
      expect(result).toBe("primary");
    });

    it("returns fallback result when primary fails", async () => {
      const result = await withFallback(
        () => Promise.reject(new Error("fail")),
        () => Promise.resolve("fallback"),
      );
      expect(result).toBe("fallback");
    });

    it("throws when both fail", async () => {
      await expect(
        withFallback(
          () => Promise.reject(new Error("primary fail")),
          () => Promise.reject(new Error("fallback fail")),
        ),
      ).rejects.toThrow("fallback fail");
    });
  });
});
