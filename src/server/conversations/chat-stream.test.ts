import { describe, expect, it } from "vitest";
import { encodeSseEvent } from "./chat-sse";
import { createLocalChatProvider } from "./chat-provider-local";
import { streamChatProvider } from "./chat-provider";
import { getAssistantPersonaById } from "@/lib/eva/personas/catalog";
import { emptyPreferenceMap } from "@/server/preferences/preference-types";

describe("chat SSE", () => {
  it("encodes a data frame", () => {
    const frame = encodeSseEvent({ type: "delta", text: "Hello" });
    expect(frame).toBe('data: {"type":"delta","text":"Hello"}\n\n');
  });
});

describe("local chat stream", () => {
  it("emits progressive chunks then done", async () => {
    const persona = getAssistantPersonaById("eva-general")!;
    const provider = createLocalChatProvider();
    const chunks: string[] = [];
    for await (const chunk of streamChatProvider(provider, {
      persona,
      messages: [{ role: "user", content: "Plan a calm living room." }],
      memoryEnabled: false,
      confirmedPreferences: emptyPreferenceMap(),
      profileContext: {
        styleWords: null,
        budgetMinimum: null,
        budgetMaximum: null,
        budgetCurrency: null,
        projectName: null,
        projectSummary: null,
      },
    })) {
      if (chunk.text) chunks.push(chunk.text);
      if (chunk.done) {
        expect(chunk.model).toBe("local");
      }
    }
    expect(chunks.join("")).toContain("[local:eva-general]");
    expect(chunks.length).toBeGreaterThan(1);
  });
});
