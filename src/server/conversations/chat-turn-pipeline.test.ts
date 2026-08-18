import { describe, expect, it } from "vitest";
import { getAssistantPersonaById } from "@/lib/eva/personas/catalog";
import { buildChatSystemPrompt } from "./chat-prompt";
import {
  assembleTurnProviderInput,
  type TurnPageContext,
} from "./chat-turn-pipeline";
import type { ChatProviderInput } from "./chat-provider";

const persona = getAssistantPersonaById("eva-general")!;

const fixtureBase = {
  persona,
  messages: [
    { role: "user" as const, content: "I like navy accents." },
    { role: "assistant" as const, content: "Navy works well with oak." },
    { role: "user" as const, content: "What sofa would you suggest?" },
  ],
  memoryEnabled: false,
  confirmedPreferences: {
    room: "living room",
    budget: null,
    style: null,
    color: "navy",
    furniture: null,
  },
  confirmedPreferenceSources: {
    room: "chat",
    color: "quiz",
  },
  profileContext: {
    styleWords: null,
    budgetMinimum: null,
    budgetMaximum: null,
    budgetCurrency: null,
    projectName: "Loft",
    projectSummary: null,
  },
  userId: "user-fixture",
  conversationId: "conv-fixture",
  workflowOverlay: null as ChatProviderInput["workflow"],
  userMessageForTools: "What sofa would you suggest?",
};

function promptParitySlice(input: ChatProviderInput) {
  return {
    messages: input.messages,
    memoryEnabled: input.memoryEnabled,
    confirmedPreferences: input.confirmedPreferences,
    confirmedPreferenceSources: input.confirmedPreferenceSources,
    profileContext: input.profileContext,
    workflow: input.workflow ?? null,
    attachmentGroundingBlock: input.attachmentGroundingBlock ?? null,
    contextSummaryBlock: input.contextSummaryBlock ?? null,
    projectMemoryBlock: input.projectMemoryBlock ?? null,
    roomPlanBlock: input.roomPlanBlock ?? null,
    pageContextBlock: input.pageContextBlock ?? null,
    responseLengthOverride: input.responseLengthOverride ?? null,
    tools: input.tools ?? null,
  };
}

describe("chat-turn-pipeline parity", () => {
  it("json and stream paths assemble identical prompt/messages for a fixed fixture", () => {
    const pageContext: TurnPageContext = {
      surface: "design",
      snapshot: { selectedSku: "sofa-1" },
    };

    const jsonInput = assembleTurnProviderInput({
      ...fixtureBase,
      mode: "full",
      pageContext,
      userEmail: "user@example.com",
    });

    const streamInput = assembleTurnProviderInput({
      ...fixtureBase,
      mode: "full",
      pageContext,
      userEmail: "user@example.com",
      signal: AbortSignal.abort(),
    });

    expect(promptParitySlice(jsonInput)).toEqual(
      promptParitySlice(streamInput),
    );
    expect(streamInput.signal?.aborted).toBe(true);
    expect(jsonInput.signal).toBeUndefined();

    const lastUser = [...jsonInput.messages]
      .reverse()
      .find((m) => m.role === "user");
    expect(lastUser?.content).toBeTruthy();
    const userMessage = lastUser!.content;

    const systemPrompt = buildChatSystemPrompt({
      persona: jsonInput.persona,
      memoryEnabled: jsonInput.memoryEnabled,
      confirmedPreferences: jsonInput.confirmedPreferences,
      ...(jsonInput.confirmedPreferenceSources
        ? { confirmedPreferenceSources: jsonInput.confirmedPreferenceSources }
        : {}),
      profileContext: jsonInput.profileContext,
      userMessage,
      ...(jsonInput.workflow ? { workflow: jsonInput.workflow } : {}),
      ...(jsonInput.attachmentGroundingBlock
        ? { attachmentGroundingBlock: jsonInput.attachmentGroundingBlock }
        : {}),
      ...(jsonInput.contextSummaryBlock
        ? { contextSummaryBlock: jsonInput.contextSummaryBlock }
        : {}),
      ...(jsonInput.projectMemoryBlock
        ? { projectMemoryBlock: jsonInput.projectMemoryBlock }
        : {}),
      ...(jsonInput.roomPlanBlock
        ? { roomPlanBlock: jsonInput.roomPlanBlock }
        : {}),
      ...(jsonInput.pageContextBlock
        ? { pageContextBlock: jsonInput.pageContextBlock }
        : {}),
      ...(jsonInput.responseLengthOverride
        ? { responseLengthOverride: jsonInput.responseLengthOverride }
        : {}),
    });

    const streamSystemPrompt = buildChatSystemPrompt({
      persona: streamInput.persona,
      memoryEnabled: streamInput.memoryEnabled,
      confirmedPreferences: streamInput.confirmedPreferences,
      ...(streamInput.confirmedPreferenceSources
        ? {
            confirmedPreferenceSources: streamInput.confirmedPreferenceSources,
          }
        : {}),
      profileContext: streamInput.profileContext,
      userMessage,
      ...(streamInput.workflow ? { workflow: streamInput.workflow } : {}),
      ...(streamInput.attachmentGroundingBlock
        ? { attachmentGroundingBlock: streamInput.attachmentGroundingBlock }
        : {}),
      ...(streamInput.contextSummaryBlock
        ? { contextSummaryBlock: streamInput.contextSummaryBlock }
        : {}),
      ...(streamInput.projectMemoryBlock
        ? { projectMemoryBlock: streamInput.projectMemoryBlock }
        : {}),
      ...(streamInput.roomPlanBlock
        ? { roomPlanBlock: streamInput.roomPlanBlock }
        : {}),
      ...(streamInput.pageContextBlock
        ? { pageContextBlock: streamInput.pageContextBlock }
        : {}),
      ...(streamInput.responseLengthOverride
        ? { responseLengthOverride: streamInput.responseLengthOverride }
        : {}),
    });

    expect(systemPrompt).toBe(streamSystemPrompt);
    expect(jsonInput.messages).toEqual(fixtureBase.messages);
  });

  it("flag-off optional blocks leave assembled prompts without those sections", () => {
    const input = assembleTurnProviderInput({
      ...fixtureBase,
      contextSummaryBlock: "",
      projectMemoryBlock: "",
      roomPlanBlock: "",
    });
    const lastUser = [...input.messages]
      .reverse()
      .find((m) => m.role === "user");
    expect(lastUser?.content).toBeTruthy();
    const prompt = buildChatSystemPrompt({
      persona: input.persona,
      memoryEnabled: input.memoryEnabled,
      confirmedPreferences: input.confirmedPreferences,
      profileContext: input.profileContext,
      userMessage: lastUser!.content,
      contextSummaryBlock: input.contextSummaryBlock ?? "",
      projectMemoryBlock: input.projectMemoryBlock ?? "",
      roomPlanBlock: input.roomPlanBlock ?? "",
    });
    expect(prompt).not.toContain("CONVERSATION MEMORY");
    expect(prompt).not.toContain("PROJECT CONTEXT");
    expect(prompt).not.toContain("ROOM PLAN");
  });
});
