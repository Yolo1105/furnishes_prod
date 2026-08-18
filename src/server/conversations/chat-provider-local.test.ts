import { describe, expect, it } from "vitest";
import { getAssistantPersonaById } from "@/lib/eva/personas/catalog";
import { createLocalChatProvider } from "./chat-provider-local";

describe("local chat provider", () => {
  it("varies output by persona", async () => {
    const provider = createLocalChatProvider();
    const base = {
      messages: [{ role: "user" as const, content: "Help with my room" }],
      memoryEnabled: true,
      confirmedPreferences: {
        room: null,
        budget: null,
        style: null,
        color: null,
        furniture: null,
      },
      profileContext: {
        styleWords: null,
        budgetMinimum: null,
        budgetMaximum: null,
        budgetCurrency: null,
        projectName: null,
        projectSummary: null,
      },
    };

    const general = await provider.generate({
      ...base,
      persona: getAssistantPersonaById("eva-general")!,
    });
    const style = await provider.generate({
      ...base,
      persona: getAssistantPersonaById("eva-style")!,
    });
    const plan = await provider.generate({
      ...base,
      persona: getAssistantPersonaById("eva-plan")!,
    });

    expect(general.content).toContain("[local:eva-general]");
    expect(style.content).toContain("[local:eva-style]");
    expect(plan.content).toContain("[local:eva-plan]");
    expect(style.content).not.toEqual(plan.content);
  });
});
