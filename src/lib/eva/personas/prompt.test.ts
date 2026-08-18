import { describe, expect, it } from "vitest";
import { getAssistantPersonaById } from "./catalog";
import { buildAssistantPersonaPromptOverlay } from "./prompt";

describe("assistant persona prompt overlay", () => {
  it("includes the expected lens fields", () => {
    const persona = getAssistantPersonaById("eva-style")!;
    const overlay = buildAssistantPersonaPromptOverlay(persona);
    expect(overlay).toContain("[ASSISTANT: Eva · Style]");
    expect(overlay).toContain(persona.primaryGoal);
    expect(overlay).toContain(persona.replyStyle);
    expect(overlay).toContain(persona.priorityRules[0]);
    expect(overlay).toContain(persona.suggestionStyle);
    expect(overlay).not.toContain("playbook");
    expect(overlay).not.toContain("Product recommendation");
  });
});
