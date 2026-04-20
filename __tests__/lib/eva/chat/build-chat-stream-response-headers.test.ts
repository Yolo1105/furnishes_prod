import { describe, expect, it } from "vitest";
import { minimalStudioSnapshotFixture } from "@/__tests__/fixtures/minimal-studio-snapshot";
import { CHAT_OUTBOUND_HTTP } from "@/lib/eva/core/chat-http-header-names";
import { buildChatStreamResponseHeaders } from "@/lib/eva/chat/post/build-chat-stream-response-headers";
import { StudioSnapshotSchema } from "@/lib/eva/studio/studio-snapshot-schema";

describe("buildChatStreamResponseHeaders", () => {
  it("includes retrieval, studio grounding, and attachment grounding headers", () => {
    const snap = StudioSnapshotSchema.parse({
      ...minimalStudioSnapshotFixture,
    });
    const headers = buildChatStreamResponseHeaders({
      chatRequestId: "req-1",
      clientAttemptId: "attempt-1",
      conversationId: "convo-1",
      userMessageId: "user-msg-1",
      costWarning: false,
      setCookieHeader: undefined,
      retrievalQuality: "strong",
      studioSnapshotPayload: snap,
      attachmentGrounding: {
        promptBlock: "",
        responseHeaderValue: "partial",
        hasUsableGrounding: true,
        visualAnalysisPerformed: true,
      },
    });
    expect(headers["X-Chat-Retrieval-Strength"]).toBe("strong");
    expect(headers["X-Chat-Grounding-Studio"]).toBe("1");
    expect(headers["X-Chat-Attachment-Grounding"]).toBe("partial");
    expect(headers["X-Chat-Request-Id"]).toBe("req-1");
    expect(headers[CHAT_OUTBOUND_HTTP.CONVERSATION_ID]).toBe("convo-1");
  });

  it("marks studio snapshot absent when payload is null", () => {
    const headers = buildChatStreamResponseHeaders({
      chatRequestId: "req-2",
      clientAttemptId: null,
      conversationId: null,
      userMessageId: "u2",
      costWarning: true,
      retrievalQuality: "unavailable",
      studioSnapshotPayload: null,
      attachmentGrounding: {
        promptBlock: "",
        responseHeaderValue: "unavailable",
        hasUsableGrounding: false,
        visualAnalysisPerformed: false,
      },
    });
    expect(headers["X-Chat-Grounding-Studio"]).toBe("0");
    expect(headers[CHAT_OUTBOUND_HTTP.COST_WARNING]).toBe(
      CHAT_OUTBOUND_HTTP.COST_WARNING_APPROACHING,
    );
    expect(headers["X-Chat-Retrieval-Strength"]).toBe("unavailable");
  });
});
