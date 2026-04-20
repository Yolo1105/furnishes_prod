import { describe, expect, it, vi, beforeEach } from "vitest";
import { buildChatGroundingLayers } from "@/lib/eva/chat/grounding/build-chat-grounding-layers";
import * as attachmentContext from "@/lib/eva/chat/attachments/build-attachment-context";
import * as retriever from "@/lib/eva/rag/retriever";

const baseAttachmentSummary = {
  promptBlock: "",
  responseHeaderValue: "none" as const,
  hasUsableGrounding: false,
  visualAnalysisPerformed: false,
};

describe("buildChatGroundingLayers", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("merges attachment block, RAG appendix, and exposes retrieval quality", async () => {
    vi.spyOn(
      attachmentContext,
      "buildAttachmentGroundingAsync",
    ).mockResolvedValue({
      ...baseAttachmentSummary,
      promptBlock: "[ATTACHMENT CONTEXT]",
      hasUsableGrounding: true,
    });
    vi.spyOn(retriever, "retrieveRelevant").mockResolvedValue({
      quality: "strong",
      hits: [
        {
          documentId: "d1",
          source: "s",
          chunkIndex: 0,
          content: "Rag chunk text",
          similarityScore: 0.9,
          lexicalScore: 0.2,
          combinedScore: 0.85,
          passedSimilarityThreshold: true,
          metadata: null,
        },
      ],
      topCosineBelowThreshold: 0.1,
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
      message: "hello",
      prefRecord: {},
      nodeConfig: { ragEnabled: true, designRulesEnabled: true },
    });

    expect(layers.retrievalQuality).toBe("strong");
    expect(layers.attachmentGrounding.promptBlock).toContain("ATTACHMENT");
    expect(layers.retrievalPromptAppendix.length).toBeGreaterThan(0);
    expect(layers.rag?.quality).toBe("strong");
  });

  it("marks retrieval unavailable without calling RAG when rag disabled", async () => {
    vi.spyOn(
      attachmentContext,
      "buildAttachmentGroundingAsync",
    ).mockResolvedValue(baseAttachmentSummary);
    const spyRetrieve = vi.spyOn(retriever, "retrieveRelevant");

    const layers = await buildChatGroundingLayers({
      attachmentList: [],
      chatGenLogCtx: {
        chatRequestId: "r1",
        traceId: null,
        conversationId: null,
        projectId: null,
        assistantId: "eva-general",
        clientAttemptId: null,
        priorChatRequestId: null,
      },
      abortSignal: new AbortController().signal,
      message: "hello",
      prefRecord: {},
      nodeConfig: { ragEnabled: false },
    });

    expect(spyRetrieve).not.toHaveBeenCalled();
    expect(layers.retrievalQuality).toBe("none");
    expect(layers.retrievalPromptAppendix).toBe("");
  });

  it("surfaces attachment grounding unavailable tier in summary", async () => {
    vi.spyOn(
      attachmentContext,
      "buildAttachmentGroundingAsync",
    ).mockResolvedValue({
      ...baseAttachmentSummary,
      responseHeaderValue: "unavailable",
      promptBlock: "",
    });
    vi.spyOn(retriever, "retrieveRelevant").mockResolvedValue({
      quality: "unavailable",
      hits: [],
      topCosineBelowThreshold: 0,
      embeddingUnavailable: true,
    });

    const layers = await buildChatGroundingLayers({
      attachmentList: [],
      chatGenLogCtx: {
        chatRequestId: "r1",
        traceId: null,
        conversationId: null,
        projectId: null,
        assistantId: "eva-general",
        clientAttemptId: null,
        priorChatRequestId: null,
      },
      abortSignal: new AbortController().signal,
      message: "hello",
      prefRecord: {},
      nodeConfig: { ragEnabled: true },
    });

    expect(layers.attachmentGrounding.responseHeaderValue).toBe("unavailable");
    expect(layers.retrievalQuality).toBe("unavailable");
  });
});
