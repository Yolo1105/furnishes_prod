import { describe, expect, it, vi, beforeEach } from "vitest";
import type { ChatGenerationLogContext } from "@/lib/eva/server/chat-generation-log";
import { createChatOpenAiStreamOptionBuilder } from "@/lib/eva/chat/generation/build-chat-openai-stream-options";
import { runChatPrimaryFallbackStreamText } from "@/lib/eva/chat/generation/run-chat-primary-fallback-stream-text";
import * as ai from "ai";
import {
  OPENAI_FALLBACK_MODEL,
  OPENAI_PRIMARY_MODEL,
} from "@/lib/eva/core/openai";

vi.mock("ai", async (importOriginal) => {
  const mod = await importOriginal<typeof import("ai")>();
  return { ...mod, streamText: vi.fn() };
});

const logCtx: ChatGenerationLogContext = {
  chatRequestId: "req",
  traceId: null,
  conversationId: "c1",
  projectId: null,
  assistantId: "eva-general",
  clientAttemptId: null,
  priorChatRequestId: null,
};

function minimalStreamResult(): Awaited<ReturnType<typeof ai.streamText>> {
  return {
    textStream: (async function* () {
      yield "";
    })(),
    text: Promise.resolve("ok"),
  } as unknown as Awaited<ReturnType<typeof ai.streamText>>;
}

describe("runChatPrimaryFallbackStreamText", () => {
  beforeEach(() => {
    vi.mocked(ai.streamText).mockReset();
  });

  it("returns primary stream on first success", async () => {
    vi.mocked(ai.streamText).mockResolvedValueOnce(minimalStreamResult());

    const buildStreamOptions = createChatOpenAiStreamOptionBuilder({
      coreGeneration: {
        system: "s",
        messages: [{ role: "user", content: "hi" }],
        abortSignal: new AbortController().signal,
      },
      chatGenLogCtx: logCtx,
      conversationId: "c1",
    });

    const result = await runChatPrimaryFallbackStreamText({
      buildStreamOptions,
      chatGenLogCtx: logCtx,
      chatRequestId: "req",
      clientAttemptId: null,
    });

    expect(result.outcome).toBe("ok");
    if (result.outcome === "ok") {
      expect(result.streamModelUsed).toBe(OPENAI_PRIMARY_MODEL);
      expect(result.primaryStreamAttempted).toBe(true);
      expect(result.fallbackStreamAttempted).toBe(false);
    }
    expect(ai.streamText).toHaveBeenCalledTimes(1);
    expect(vi.mocked(ai.streamText).mock.calls[0][0].model).toBeDefined();
  });

  it("falls back when primary throws", async () => {
    vi.mocked(ai.streamText)
      .mockRejectedValueOnce(new Error("primary down"))
      .mockResolvedValueOnce(minimalStreamResult());

    const buildStreamOptions = createChatOpenAiStreamOptionBuilder({
      coreGeneration: {
        system: "s",
        messages: [{ role: "user", content: "hi" }],
        abortSignal: new AbortController().signal,
      },
      chatGenLogCtx: logCtx,
      conversationId: "c1",
    });

    const result = await runChatPrimaryFallbackStreamText({
      buildStreamOptions,
      chatGenLogCtx: logCtx,
      chatRequestId: "req",
      clientAttemptId: null,
    });

    expect(result.outcome).toBe("ok");
    if (result.outcome === "ok") {
      expect(result.streamModelUsed).toBe(OPENAI_FALLBACK_MODEL);
      expect(result.primaryStreamAttempted).toBe(true);
      expect(result.fallbackStreamAttempted).toBe(true);
    }
    expect(ai.streamText).toHaveBeenCalledTimes(2);
  });

  it("returns structured error response when both streams fail", async () => {
    vi.mocked(ai.streamText)
      .mockRejectedValueOnce(new Error("primary down"))
      .mockRejectedValueOnce(new Error("fallback down"));

    const buildStreamOptions = createChatOpenAiStreamOptionBuilder({
      coreGeneration: {
        system: "s",
        messages: [{ role: "user", content: "hi" }],
        abortSignal: new AbortController().signal,
      },
      chatGenLogCtx: logCtx,
      conversationId: "c1",
    });

    const result = await runChatPrimaryFallbackStreamText({
      buildStreamOptions,
      chatGenLogCtx: logCtx,
      chatRequestId: "req",
      clientAttemptId: null,
    });

    expect(result.outcome).toBe("error");
    if (result.outcome === "error") {
      expect(result.response.status).toBe(503);
    }
  });
});
