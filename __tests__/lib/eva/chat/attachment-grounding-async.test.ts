import { describe, expect, it, vi } from "vitest";
import { buildAttachmentGroundingAsync } from "@/lib/eva/chat/attachments/build-attachment-context";
import type { ChatGenerationLogContext } from "@/lib/eva/server/chat-generation-log";

vi.mock(
  "@/lib/eva/chat/attachments/enrich-attachments-with-server-vision",
  () => ({
    enrichNormalizedAttachmentsWithServerVision: vi.fn(
      async (
        normalized: {
          url: string;
          effectiveReadiness: string;
          supported: boolean;
        }[],
      ) =>
        normalized.map((row) =>
          row.supported && row.effectiveReadiness === "ready"
            ? {
                ...row,
                serverVisionState: "ok" as const,
                serverVisualSummary: "Navy sectional, warm wood floor.",
              }
            : {
                ...row,
                serverVisionState: "not_attempted" as const,
              },
        ),
    ),
  }),
);

const logCtx: ChatGenerationLogContext = {
  chatRequestId: "t1",
  traceId: null,
  conversationId: "c1",
  projectId: null,
  assistantId: "default",
  clientAttemptId: null,
  priorChatRequestId: null,
};

describe("buildAttachmentGroundingAsync", () => {
  it("includes SERVER_VISION_ANALYSIS when the enricher returns ok", async () => {
    const grounding = await buildAttachmentGroundingAsync(
      [
        {
          kind: "image_url",
          url: "https://example.com/room.jpg",
          clientReadiness: "ready",
          mimeType: "image/jpeg",
        },
      ],
      logCtx,
      new AbortController().signal,
    );
    expect(grounding.visualAnalysisPerformed).toBe(true);
    expect(grounding.promptBlock).toContain("SERVER_VISION_ANALYSIS:");
    expect(grounding.promptBlock).toContain("Navy sectional");
    expect(grounding.responseHeaderValue).toBe("partial");
  });

  it("does not claim vision for analyzing client readiness", async () => {
    const grounding = await buildAttachmentGroundingAsync(
      [
        {
          kind: "image_url",
          url: "https://example.com/room.jpg",
          clientReadiness: "analyzing",
          mimeType: "image/jpeg",
        },
      ],
      logCtx,
      new AbortController().signal,
    );
    expect(grounding.visualAnalysisPerformed).toBe(false);
    expect(grounding.promptBlock).not.toContain("SERVER_VISION_ANALYSIS:");
    expect(grounding.responseHeaderValue).toBe("analyzing_skipped");
  });
});
