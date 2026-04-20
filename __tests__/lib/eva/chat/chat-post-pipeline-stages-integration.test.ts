import { describe, expect, it, vi } from "vitest";
import { CLIENT_SURFACE_STUDIO_RAIL } from "@/lib/eva/api/chat-attachment";
import { normalizeChatStudioSnapshotForPost } from "@/lib/eva/chat/studio/normalize-chat-studio-snapshot";
import { buildChatGroundingLayers } from "@/lib/eva/chat/grounding/build-chat-grounding-layers";
import { buildChatSystemPromptStack } from "@/lib/eva/chat/prompt/build-chat-system-prompt-stack";
import { getAssistantById } from "@/lib/eva/assistants/catalog";
import * as attachmentContext from "@/lib/eva/chat/attachments/build-attachment-context";
import * as retriever from "@/lib/eva/rag/retriever";

/**
 * Composes the same middle-pipeline stages as `runChatPostPipeline` without HTTP or streaming.
 */
describe("chat post pipeline stages (integration slice)", () => {
  it("chains studio normalization, grounding, and prompt stack for a Studio rail snapshot", async () => {
    const snapshot = {
      activeProjectId: null,
      room: { roomType: "bedroom" },
      designIntent: {
        prompt: "soft light",
        styleTags: ["calm"],
        constraints: [],
      },
      scene: { placedItems: [], materials: [], colors: [] },
      assets: { referenceImages: [], generatedImages: [] },
      lastUserActions: [],
    };

    const normalized = normalizeChatStudioSnapshotForPost({
      rawStudioSnapshot: snapshot,
      clientSurface: CLIENT_SURFACE_STUDIO_RAIL,
    });
    expect(normalized.ok).toBe(true);
    if (!normalized.ok) return;

    vi.spyOn(
      attachmentContext,
      "buildAttachmentGroundingAsync",
    ).mockResolvedValue({
      promptBlock: "[IMG]",
      responseHeaderValue: "partial",
      hasUsableGrounding: true,
      visualAnalysisPerformed: false,
    });
    vi.spyOn(retriever, "retrieveRelevant").mockResolvedValue({
      quality: "weak",
      hits: [],
      topCosineBelowThreshold: 0.4,
      embeddingUnavailable: false,
    });

    const layers = await buildChatGroundingLayers({
      attachmentList: [],
      chatGenLogCtx: {
        chatRequestId: "r1",
        traceId: null,
        conversationId: "c1",
        projectId: null,
        assistantId: "eva-general",
        clientAttemptId: null,
        priorChatRequestId: null,
      },
      abortSignal: new AbortController().signal,
      message: "What paint finish for bedroom walls?",
      prefRecord: {},
      nodeConfig: { ragEnabled: true, designRulesEnabled: true },
    });

    const { systemPrompt } = buildChatSystemPromptStack(
      {
        domainConfig: { name: "t", system_prompt: "BASE", fields: [] },
        systemSuffix: "",
        message: "What paint finish for bedroom walls?",
        studioSnapshotPayload: normalized.studioSnapshotPayload,
        assistantForPrompt: getAssistantById("eva-general"),
        designWorkflowStage: null,
        projectIntel: null,
        playbookNodeConfig: { responseLength: "short" },
        grounding: layers,
      },
      [{ role: "user", content: "What paint finish for bedroom walls?" }],
    );

    expect(systemPrompt).toContain("bedroom");
    expect(systemPrompt).toContain("[IMG]");
    expect(layers.retrievalQuality).toBe("weak");
  });
});
