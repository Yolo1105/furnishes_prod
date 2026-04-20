import { describe, expect, it } from "vitest";
import { stableRecommendationItemId } from "@/lib/eva/recommendations/stable-recommendation-id";

describe("stableRecommendationItemId", () => {
  it("is stable for same conversation, title, and category", () => {
    const a = stableRecommendationItemId("conv-1", "Oak bench", "seating");
    const b = stableRecommendationItemId("conv-1", "Oak bench", "seating");
    expect(a).toBe(b);
  });

  it("changes when title or category changes", () => {
    const a = stableRecommendationItemId("conv-1", "Oak bench", "seating");
    const b = stableRecommendationItemId("conv-1", "Oak bench", "storage");
    expect(a).not.toBe(b);
  });

  it("changes when conversation changes", () => {
    const a = stableRecommendationItemId("conv-1", "Oak bench", "seating");
    const b = stableRecommendationItemId("conv-2", "Oak bench", "seating");
    expect(a).not.toBe(b);
  });
});
