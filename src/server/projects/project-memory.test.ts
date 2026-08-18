import { describe, expect, it } from "vitest";
import { assembleProjectMemoryContext, MEMORY_LIMITS } from "./project-memory";
import { formatProjectMemoryPrompt } from "./project-memory-prompt";

const baseData = {
  project: {
    id: "p1",
    name: "Living room refresh",
    summary: "Warm neutrals and a compact layout.",
  },
  confirmedPreferences: {
    room: "living room",
    budget: "$5000",
    style: "japandi",
    color: "warm beige",
    furniture: "sectional",
  },
  roomDimensions: { widthFeet: 12, lengthFeet: 14 },
  timelineEvents: [
    {
      kind: "created",
      summary: "Project created",
      createdAt: new Date("2026-08-01T12:00:00.000Z"),
    },
    {
      kind: "note",
      summary: "Chose primary layout direction",
      createdAt: new Date("2026-08-02T12:00:00.000Z"),
    },
  ],
  recommendationRows: [
    {
      conversationId: "c1",
      rank: 1,
      payload: { title: "Low profile sectional", category: "seating" },
    },
    {
      conversationId: "c1",
      rank: 2,
      payload: { title: "Arc floor lamp", category: "lighting" },
    },
  ],
  siblingConversations: [
    {
      id: "c1",
      title: "Layout thread",
      workflowStage: "refinement",
      contextSummary:
        "User wants an open layout with a sectional anchored on the west wall.",
    },
    {
      id: "c2",
      title: "Budget thread",
      workflowStage: "preference_capture",
      contextSummary: null,
    },
  ],
};

describe("assembleProjectMemoryContext", () => {
  it("caps timeline, recommendations, and sibling summaries", () => {
    const timeline = Array.from({ length: 8 }, (_, index) => ({
      kind: "note",
      summary: `Event ${index}`,
      createdAt: new Date(`2026-08-0${(index % 9) + 1}T12:00:00.000Z`),
    }));
    const recommendations = Array.from({ length: 8 }, (_, index) => ({
      conversationId: "c1",
      rank: index + 1,
      payload: { title: `Rec ${index}`, category: "general" },
    }));
    const siblings = Array.from({ length: 5 }, (_, index) => ({
      id: `c${index}`,
      title: `Thread ${index}`,
      workflowStage: "intake",
      contextSummary: "x".repeat(500),
    }));

    const ctx = assembleProjectMemoryContext({
      ...baseData,
      timelineEvents: timeline,
      recommendationRows: recommendations,
      siblingConversations: siblings,
    });

    expect(ctx.timelineEvents).toHaveLength(MEMORY_LIMITS.timelineEvents);
    expect(ctx.recommendations).toHaveLength(MEMORY_LIMITS.recommendations);
    expect(ctx.siblingThreads).toHaveLength(MEMORY_LIMITS.siblingSummaries);
    expect(
      ctx.siblingThreads[0]?.contextSummaryExcerpt?.length,
    ).toBeLessThanOrEqual(MEMORY_LIMITS.siblingSummaryMaxChars);
  });

  it("never embeds raw message text fields", () => {
    const ctx = assembleProjectMemoryContext(baseData);
    const serialized = JSON.stringify(ctx);
    expect(serialized).not.toMatch(/"content"\s*:/);
    expect(serialized).not.toMatch(/User:|Assistant:/);
  });

  it("skips sibling threads without a context summary", () => {
    const ctx = assembleProjectMemoryContext(baseData);
    expect(ctx.siblingThreads).toHaveLength(1);
    expect(ctx.siblingThreads[0]?.conversationId).toBe("c1");
    expect(ctx.siblingThreads[0]?.contextSummaryExcerpt).toContain(
      "open layout",
    );
  });
});

describe("formatProjectMemoryPrompt", () => {
  it("formats chat prompt with headline and JSON payload", () => {
    const ctx = assembleProjectMemoryContext(baseData);
    const prompt = formatProjectMemoryPrompt(ctx, "chat");
    expect(prompt).toContain(
      "[PROJECT CONTEXT — ground truth for this thread]",
    );
    expect(prompt).toContain("projectName");
    expect(prompt).toContain("Living room refresh");
    expect(prompt).toContain("do not invent facts");
  });

  it("formats recommendations prompt with ranking instruction", () => {
    const ctx = assembleProjectMemoryContext(baseData);
    const prompt = formatProjectMemoryPrompt(ctx, "recommendations");
    expect(prompt).toContain(
      "[PROJECT CONTEXT — rank and explain recommendations against this]",
    );
    expect(prompt).toMatch(/short contrasts/i);
  });
});

describe("isChatProjectMemoryEnabled", () => {
  it("is off unless CHAT_PROJECT_MEMORY_ENABLED=1", async () => {
    delete process.env.CHAT_PROJECT_MEMORY_ENABLED;
    const { isChatProjectMemoryEnabled } = await import("./project-memory");
    expect(isChatProjectMemoryEnabled()).toBe(false);
    process.env.CHAT_PROJECT_MEMORY_ENABLED = "1";
    expect(isChatProjectMemoryEnabled()).toBe(true);
  });
});
