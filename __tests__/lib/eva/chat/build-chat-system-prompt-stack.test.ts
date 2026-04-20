import { describe, expect, it } from "vitest";
import { buildChatSystemPromptStack } from "@/lib/eva/chat/prompt/build-chat-system-prompt-stack";
import { getAssistantById } from "@/lib/eva/assistants/catalog";
import type { ChatGroundingLayers } from "@/lib/eva/chat/grounding/build-chat-grounding-layers";
const emptyGrounding = (): ChatGroundingLayers => ({
  attachmentGrounding: {
    promptBlock: "",
    responseHeaderValue: "none",
    hasUsableGrounding: false,
    visualAnalysisPerformed: false,
  },
  retrievalQuality: "none",
  rag: null,
  retrievalPromptAppendix: "",
  designRuleAppendix: null,
  layoutAppendix: null,
});

describe("buildChatSystemPromptStack", () => {
  it("includes same-turn critical constraint block derived from the user message", () => {
    const message =
      "Paint the bedroom walls blue but avoid glossy finishes and no carpet";
    const { systemPrompt } = buildChatSystemPromptStack(
      {
        domainConfig: {
          name: "t",
          system_prompt: "BASE",
          fields: [],
        },
        systemSuffix: "",
        message,
        studioSnapshotPayload: null,
        assistantForPrompt: getAssistantById("eva-general"),
        designWorkflowStage: null,
        projectIntel: null,
        playbookNodeConfig: { responseLength: "short" },
        grounding: emptyGrounding(),
      },
      [{ role: "user", content: message }],
    );
    expect(systemPrompt).toContain("Same-turn user constraints");
    expect(systemPrompt).toContain("bedroom");
  });

  it("propagates weak vs strong retrieval appendix distinctly", () => {
    const weak: ChatGroundingLayers = {
      ...emptyGrounding(),
      retrievalQuality: "weak",
      retrievalPromptAppendix: "\n\n[WEAK RAG SECTION]",
    };
    const strong: ChatGroundingLayers = {
      ...emptyGrounding(),
      retrievalQuality: "strong",
      retrievalPromptAppendix: "\n\n[STRONG RAG SECTION]",
    };

    const weakPrompt = buildChatSystemPromptStack(
      {
        domainConfig: { name: "t", system_prompt: "BASE", fields: [] },
        systemSuffix: "",
        message: "hi",
        studioSnapshotPayload: null,
        assistantForPrompt: getAssistantById("eva-general"),
        designWorkflowStage: null,
        projectIntel: null,
        playbookNodeConfig: {},
        grounding: weak,
      },
      [{ role: "user", content: "hi" }],
    ).systemPrompt;

    const strongPrompt = buildChatSystemPromptStack(
      {
        domainConfig: { name: "t", system_prompt: "BASE", fields: [] },
        systemSuffix: "",
        message: "hi",
        studioSnapshotPayload: null,
        assistantForPrompt: getAssistantById("eva-general"),
        designWorkflowStage: null,
        projectIntel: null,
        playbookNodeConfig: {},
        grounding: strong,
      },
      [{ role: "user", content: "hi" }],
    ).systemPrompt;

    expect(weakPrompt).toContain("WEAK RAG SECTION");
    expect(strongPrompt).toContain("STRONG RAG SECTION");
    expect(weakPrompt).not.toContain("STRONG RAG SECTION");
  });
});
