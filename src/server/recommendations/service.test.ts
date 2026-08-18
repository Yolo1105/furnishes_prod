import { beforeEach, describe, expect, it, vi } from "vitest";
import { CHAT_FAILURE_COST_LIMIT } from "@/server/conversations/chat-copy";

vi.mock("@/server/db", () => ({
  prisma: {
    conversation: {
      findFirst: vi.fn(),
    },
    inspirationItem: {
      findMany: vi.fn(async () => []),
    },
  },
}));

vi.mock("@/server/preferences/preference-service", () => ({
  getConfirmedPreferenceMap: vi.fn(async () => ({
    room: "living room",
    budget: "$5k",
    style: "japandi",
    color: null,
    furniture: null,
  })),
}));

vi.mock("./ranking", () => ({
  rankRecommendationsWithProjectContext: vi.fn((items: unknown[]) => ({
    items,
  })),
}));

vi.mock("./rubric", () => ({
  gradeRecommendationItems: vi.fn(
    async (items: Array<{ why_it_fits: string }>) =>
      items.map((item) => ({ why_it_fits: item.why_it_fits })),
  ),
}));

vi.mock("./stable-recommendation-id", () => ({
  stableRecommendationItemId: vi.fn(() => "rec-1"),
}));

vi.mock("./repository", () => ({
  listActiveRecommendations: vi.fn(async () => []),
  upsertRecommendationRows: vi.fn(async () => undefined),
  markRecommendationSaved: vi.fn(),
  findRecommendationForUser: vi.fn(),
}));

vi.mock("@/server/projects/project-memory", () => ({
  isChatProjectMemoryEnabled: vi.fn(() => false),
  buildProjectMemoryContext: vi.fn(),
}));

vi.mock("@/server/projects/project-memory-prompt", () => ({
  formatProjectMemoryPrompt: vi.fn(),
}));

const generateStructured = vi.fn();

vi.mock("@/server/structured-output/generate-structured", () => {
  class CostLimitError extends Error {
    code = "cost_limit" as const;
    constructor(message = "Cost limit exceeded") {
      super(message);
      this.name = "CostLimitError";
    }
  }
  return {
    CostLimitError,
    generateStructured: (...args: unknown[]) => generateStructured(...args),
  };
});

vi.mock("@/server/conversations/chat-ops", () => ({
  logChatOperationalEvent: vi.fn(),
}));

import { prisma } from "@/server/db";
import { CostLimitError } from "@/server/structured-output/generate-structured";
import { logChatOperationalEvent } from "@/server/conversations/chat-ops";
import { regenerateConversationRecommendations } from "./service";

const sampleItems = {
  items: [
    {
      title: "Walnut media console",
      summary: "Low storage",
      category: "storage",
      reasonWhyItFits: "A nice console for any home.",
      relatedPreferences: [],
      estimatedPrice: 1200,
      priceBandUsd: { min: 800, max: 1600 },
      specs: ["walnut"],
      alternatives: [],
      discussionPrompt: null,
    },
  ],
};

const citedItems = {
  items: [
    {
      ...sampleItems.items[0]!,
      reasonWhyItFits:
        "Low walnut console supports your japandi living room inside the $5k band.",
    },
  ],
};

describe("recommendations cost caps", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CHAT_SIDE_FEATURES_ENABLED = "1";
    vi.mocked(prisma.conversation.findFirst).mockResolvedValue({
      id: "c1",
      projectId: null,
      messages: [
        { role: "user", content: "Hello" },
        { role: "assistant", content: "Hi" },
      ],
    } as never);
  });

  it("surfaces cost_limit when structured generation is over cap", async () => {
    generateStructured.mockRejectedValueOnce(new CostLimitError());
    const result = await regenerateConversationRecommendations({
      userId: "u1",
      conversationId: "c1",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("cost_limit");
      expect(result.message).toBe(CHAT_FAILURE_COST_LIMIT);
    }
  });

  it("retries once when EXPLAIN citation is missing", async () => {
    generateStructured
      .mockResolvedValueOnce(sampleItems)
      .mockResolvedValueOnce(citedItems);

    const result = await regenerateConversationRecommendations({
      userId: "u1",
      conversationId: "c1",
    });

    expect(result.ok).toBe(true);
    expect(generateStructured).toHaveBeenCalledTimes(2);
    expect(logChatOperationalEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "recommendation_explain_retry",
        retryItemCount: 1,
      }),
    );
  });
});
