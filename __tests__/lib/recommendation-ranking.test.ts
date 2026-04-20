import { describe, expect, it } from "vitest";
import {
  rankRecommendationsWithProjectContext,
  scoreRecommendationAgainstContext,
} from "@/lib/eva/intelligence/recommendation-ranking";
import type { ProjectIntelligenceContext } from "@/lib/eva/intelligence/project-intelligence-context";
import type { NormalizedRecommendationItem } from "@/lib/eva-dashboard/conversation-output-types";
import type { WorkflowEvaluation } from "@/lib/eva/design-workflow/evaluate";

function baseItem(
  partial: Partial<NormalizedRecommendationItem>,
): NormalizedRecommendationItem {
  return {
    id: "x",
    title: "Item",
    summary: null,
    reasonWhyItFits: "Because",
    category: "seating",
    relatedPreferences: [],
    estimatedPrice: null,
    rank: 1,
    imageUrl: null,
    discussionPrompt: "Discuss",
    ...partial,
  };
}

function minimalContext(
  partial: Partial<ProjectIntelligenceContext>,
): ProjectIntelligenceContext {
  return {
    projectId: "p1",
    title: "T",
    room: "Living",
    goalExcerpt: "Goals",
    workflowStage: "recommendation_generation",
    budgetCents: 0,
    currency: "SGD",
    decisionNotes: null,
    preferredDirectionLabel: null,
    preferredPathNotes: null,
    preferredPathItemTitles: [],
    acceptedConstraints: [],
    supplementaryOpenItems: [],
    comparisonPathCount: 0,
    favoriteArtifactIds: [],
    briefLines: [],
    highlightedArtifacts: [],
    recommendationsSnapshotSummary: {
      capturedAt: null,
      conversationId: null,
      topItemTitles: [],
    },
    shortlistProductNames: [],
    shortlistPrimaryNames: [],
    recentConversationExcerpt: null,
    workflowEvaluation: {} as unknown as WorkflowEvaluation,
    builtAt: new Date().toISOString(),
    ...partial,
  };
}

describe("scoreRecommendationAgainstContext", () => {
  it("boosts items overlapping preferred path titles", () => {
    const ctx = minimalContext({
      preferredPathItemTitles: ["Walnut credenza"],
    });
    const low = scoreRecommendationAgainstContext(
      baseItem({ title: "Generic lamp", reasonWhyItFits: "Nice light" }),
      ctx,
    );
    const high = scoreRecommendationAgainstContext(
      baseItem({
        title: "Walnut credenza option",
        reasonWhyItFits: "Matches wood tone",
      }),
      ctx,
    );
    expect(high.score).toBeGreaterThan(low.score);
  });

  it("penalizes near-duplicate shortlist titles", () => {
    const ctx = minimalContext({
      shortlistProductNames: ["Velvet sofa classic"],
    });
    const s = scoreRecommendationAgainstContext(
      baseItem({
        title: "Velvet sofa classic",
        category: "seating",
        reasonWhyItFits: "Soft seating",
      }),
      ctx,
    );
    expect(s.score).toBeLessThan(0);
    expect(s.factors.some((f) => /shortlist/i.test(f))).toBe(true);
  });
});

describe("rankRecommendationsWithProjectContext", () => {
  it("reorders by score when project context is present", () => {
    const ctx = minimalContext({
      acceptedConstraints: ["Must be pet-friendly durable fabric"],
    });
    const a = baseItem({
      id: "a",
      title: "Glass coffee table",
      reasonWhyItFits: "Minimal look",
    });
    const b = baseItem({
      id: "b",
      title: "Performance fabric sectional",
      reasonWhyItFits: "Durable and pet-friendly weave",
    });
    const { items } = rankRecommendationsWithProjectContext([a, b], ctx);
    expect(items[0].title).toBe("Performance fabric sectional");
    expect(items[0].rank).toBe(1);
    expect(items[1].rank).toBe(2);
    expect(items[0].fitScore).toBeDefined();
    expect(items[0].fitScore).toBe(1);
    expect(items[0].explanationFactors?.length).toBeGreaterThan(0);
  });
});
