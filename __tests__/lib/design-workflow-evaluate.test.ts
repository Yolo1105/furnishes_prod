import { describe, expect, it } from "vitest";
import { evaluateProjectWorkflow } from "@/lib/eva/design-workflow/evaluate";

const baseProject = {
  title: "Test home",
  room: "Living room",
  description:
    "We want a cozy modern living room for a young family with two kids.",
  budgetCents: 0,
  briefSnapshot: null,
  workflowSatisfied: {},
};

describe("evaluateProjectWorkflow", () => {
  it("starts intake with room & goals when title, room, and description are sufficient", () => {
    const ev = evaluateProjectWorkflow({
      workflowStage: "intake",
      project: baseProject,
      preferences: {},
      messageCount: 1,
      userMessage: "hello",
    });
    expect(ev.stageId).toBe("intake");
    expect(ev.stageComplete).toBe(true);
    expect(ev.suggestedNextStage).toBe("preference_capture");
    expect(ev.canAutoAdvance).toBe(true);
  });

  it("blocks preference_capture until style and budget signals exist", () => {
    const ev = evaluateProjectWorkflow({
      workflowStage: "preference_capture",
      project: baseProject,
      preferences: { style: "Scandi" },
      messageCount: 2,
      userMessage: "I like light wood",
    });
    expect(ev.stageComplete).toBe(false);
    expect(ev.missingFieldList.length).toBeGreaterThan(0);
  });

  it("routes to clarification when layout-heavy goals lack dimensions", () => {
    const ev = evaluateProjectWorkflow({
      workflowStage: "preference_capture",
      project: baseProject,
      preferences: {
        style: "modern",
        budget: "flexible",
      },
      messageCount: 3,
      userMessage: "Help me with the floor plan layout for this room",
    });
    expect(ev.hasRecommendationBlockers).toBe(true);
    expect(ev.suggestedNextStage).toBe("clarification");
  });

  it("skips clarification when no recommendation blockers", () => {
    const ev = evaluateProjectWorkflow({
      workflowStage: "preference_capture",
      project: { ...baseProject, budgetCents: 500_000 },
      preferences: {
        style: "modern",
        budget: "5000",
      },
      messageCount: 4,
      userMessage: "Looking for a sofa",
    });
    expect(ev.hasRecommendationBlockers).toBe(false);
    expect(ev.suggestedNextStage).toBe("recommendation_generation");
  });
});
