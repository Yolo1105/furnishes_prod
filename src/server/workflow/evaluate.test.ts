import { describe, expect, it } from "vitest";
import { evaluateAdvance } from "./evaluate";

/**
 * Translated from legacy `__tests__/lib/design-workflow-evaluate.test.ts`,
 * adapted to conversation-scoped preferences (room/style/budget) instead of
 * project title/room/description/budgetCents.
 */
describe("evaluateAdvance", () => {
  it("starts intake with room & goals when room is confirmed", () => {
    const ev = evaluateAdvance({
      stage: "intake",
      messageCount: 1,
      confirmedPreferences: {
        room: "Living room",
        style: null,
        budget: null,
        color: null,
        furniture: null,
      },
      userMessage: "hello",
    });
    expect(ev.stageId).toBe("intake");
    expect(ev.stageComplete).toBe(true);
    expect(ev.suggestedNextStage).toBe("preference_capture");
    expect(ev.canAutoAdvance).toBe(true);
  });

  it("blocks preference_capture until style and budget signals exist", () => {
    const ev = evaluateAdvance({
      stage: "preference_capture",
      messageCount: 2,
      confirmedPreferences: {
        room: "Living room",
        style: "Scandi",
        budget: null,
        color: null,
        furniture: null,
      },
      userMessage: "I like light wood",
    });
    expect(ev.stageComplete).toBe(false);
    expect(ev.missingFieldList.length).toBeGreaterThan(0);
  });

  it("routes to clarification when layout-heavy goals lack dimensions", () => {
    const ev = evaluateAdvance({
      stage: "preference_capture",
      messageCount: 3,
      confirmedPreferences: {
        room: "Living room",
        style: "modern",
        budget: "flexible",
        color: null,
        furniture: null,
      },
      userMessage: "Help me with the floor plan layout for this room",
    });
    expect(ev.hasRecommendationBlockers).toBe(true);
    expect(ev.suggestedNextStage).toBe("clarification");
  });

  it("skips clarification when no recommendation blockers", () => {
    const ev = evaluateAdvance({
      stage: "preference_capture",
      messageCount: 4,
      confirmedPreferences: {
        room: "Living room",
        style: "modern",
        budget: "5000",
        color: null,
        furniture: null,
      },
      userMessage: "Looking for a sofa",
    });
    expect(ev.hasRecommendationBlockers).toBe(false);
    expect(ev.suggestedNextStage).toBe("recommendation_generation");
  });

  it("advances to refinement when ≥50% core room-plan items are decided", () => {
    const ev = evaluateAdvance({
      stage: "recommendation_generation",
      messageCount: 1,
      confirmedPreferences: {
        room: "Living room",
        style: "modern",
        budget: "5000",
        color: null,
        furniture: null,
      },
      userMessage: "Thanks",
      roomPlan: { coreItemCount: 4, decidedCount: 2 },
    });
    expect(ev.suggestedNextStage).toBe("refinement");
    expect(ev.canAutoAdvance).toBe(true);
  });
});
