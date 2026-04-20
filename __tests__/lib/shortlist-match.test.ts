import { describe, expect, it } from "vitest";
import {
  buildShortlistMatchMaps,
  recommendationItemMatchesShortlist,
  shortlistRowIdForRecommendationItem,
} from "@/lib/eva/recommendations/shortlist-match";
import type { ProjectDetailGetResponse } from "@/lib/eva/projects/api-types";
import type { NormalizedRecommendationItem } from "@/lib/eva-dashboard/conversation-output-types";

const row = (
  overrides: Partial<ProjectDetailGetResponse["shortlistItems"][0]>,
): ProjectDetailGetResponse["shortlistItems"][0] => ({
  id: "row-1",
  productId: "rec-old-0",
  productName: "Velvet sofa",
  productCategory: "seating",
  priceCents: 0,
  currency: "SGD",
  coverHue: 0,
  rationale: null,
  summary: null,
  reasonSelected: null,
  notes: null,
  status: "considering",
  externalLifecycle: "proposed",
  sourceConversationId: null,
  sourceRecommendationId: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

const item = (
  partial: Partial<NormalizedRecommendationItem>,
): NormalizedRecommendationItem => ({
  id: "rec-new-stable",
  title: "Velvet sofa",
  summary: null,
  reasonWhyItFits: "x",
  category: "seating",
  relatedPreferences: [],
  estimatedPrice: null,
  rank: 1,
  imageUrl: null,
  discussionPrompt: "d",
  ...partial,
});

describe("buildShortlistMatchMaps", () => {
  it("matches by title when productId differs from current recommendation id", () => {
    const maps = buildShortlistMatchMaps([
      row({ productId: "rec-old-0", productName: "Velvet sofa" }),
    ]);
    expect(
      recommendationItemMatchesShortlist(
        item({ id: "rec-new-stable", title: "Velvet sofa" }),
        maps,
      ),
    ).toBe(true);
    expect(
      shortlistRowIdForRecommendationItem(
        item({ id: "rec-new-stable", title: "Velvet sofa" }),
        maps,
      ),
    ).toBe("row-1");
  });
});
