import { afterEach, describe, expect, it, vi } from "vitest";
import {
  runParallelChatAndExtraction,
  shouldPersistPreferenceProposals,
  withTimeout,
} from "./chat-message-pipeline";
import type { ChatProviderResult } from "./chat-provider";
import type { ExtractedPreferenceCandidate } from "@/server/preferences/preference-types";

afterEach(() => {
  vi.useRealTimers();
  delete process.env.CHAT_REQUEST_TIMEOUT_MS;
  delete process.env.PREFERENCE_EXTRACTION_TIMEOUT_MS;
});

describe("withTimeout", () => {
  it("resolves when the promise finishes in time", async () => {
    await expect(withTimeout(Promise.resolve(42), 1000, "fast")).resolves.toBe(
      42,
    );
  });

  it("rejects with labeled timeout when the promise hangs", async () => {
    vi.useFakeTimers();
    const pending = withTimeout(
      new Promise<number>(() => undefined),
      50,
      "slow",
    );
    const assertion = expect(pending).rejects.toThrow("slow_timeout");
    await vi.advanceTimersByTimeAsync(50);
    await assertion;
  });
});

describe("runParallelChatAndExtraction", () => {
  const okChat = (): Promise<ChatProviderResult> =>
    Promise.resolve({ content: "Here is a calm layout idea." });

  const okExtract = (): Promise<ExtractedPreferenceCandidate[]> =>
    Promise.resolve([
      {
        category: "style",
        value: "japandi",
        confidence: 0.9,
        evidenceText: "japandi",
      },
    ]);

  it("fulfills both when chat and extraction succeed", async () => {
    const result = await runParallelChatAndExtraction({
      generate: okChat,
      extract: okExtract,
    });
    expect(result.chat.status).toBe("fulfilled");
    expect(result.extraction.status).toBe("fulfilled");
    if (result.chat.status === "fulfilled") {
      expect(result.chat.value.content).toContain("calm");
    }
    if (result.extraction.status === "fulfilled") {
      expect(result.extraction.value).toHaveLength(1);
    }
  });

  it("keeps chat fulfilled when extraction rejects (chat OK + extract fail)", async () => {
    const result = await runParallelChatAndExtraction({
      generate: okChat,
      extract: () => Promise.reject(new Error("extract_boom")),
    });
    expect(result.chat.status).toBe("fulfilled");
    expect(result.extraction.status).toBe("rejected");
  });

  it("keeps extraction fulfilled when chat rejects (chat fail + extract OK)", async () => {
    const result = await runParallelChatAndExtraction({
      generate: () => Promise.reject(new Error("chat_boom")),
      extract: okExtract,
    });
    expect(result.chat.status).toBe("rejected");
    expect(result.extraction.status).toBe("fulfilled");
  });

  it("rejects both when both fail", async () => {
    const result = await runParallelChatAndExtraction({
      generate: () => Promise.reject(new Error("chat_boom")),
      extract: () => Promise.reject(new Error("extract_boom")),
    });
    expect(result.chat.status).toBe("rejected");
    expect(result.extraction.status).toBe("rejected");
  });

  it("times out chat independently of extraction", async () => {
    process.env.CHAT_REQUEST_TIMEOUT_MS = "40";
    process.env.PREFERENCE_EXTRACTION_TIMEOUT_MS = "5000";
    vi.useFakeTimers();

    const pending = runParallelChatAndExtraction({
      generate: () => new Promise<ChatProviderResult>(() => undefined),
      extract: okExtract,
    });
    await vi.advanceTimersByTimeAsync(40);
    const result = await pending;
    expect(result.chat.status).toBe("rejected");
    if (result.chat.status === "rejected") {
      expect(String(result.chat.reason)).toContain("chat_timeout");
    }
    expect(result.extraction.status).toBe("fulfilled");
  });
});

describe("shouldPersistPreferenceProposals failure matrix", () => {
  it("chat OK + extract OK → persist proposals", () => {
    expect(
      shouldPersistPreferenceProposals({
        chatOk: true,
        replyContent: "Hello",
        extractionOk: true,
        candidateCount: 2,
      }),
    ).toBe(true);
  });

  it("chat OK + extract fail → no proposals", () => {
    expect(
      shouldPersistPreferenceProposals({
        chatOk: true,
        replyContent: "Hello",
        extractionOk: false,
        candidateCount: 2,
      }),
    ).toBe(false);
  });

  it("chat fail + extract OK → discard proposals", () => {
    expect(
      shouldPersistPreferenceProposals({
        chatOk: false,
        replyContent: "",
        extractionOk: true,
        candidateCount: 2,
      }),
    ).toBe(false);
  });

  it("both fail → no proposals", () => {
    expect(
      shouldPersistPreferenceProposals({
        chatOk: false,
        replyContent: "",
        extractionOk: false,
        candidateCount: 0,
      }),
    ).toBe(false);
  });

  it("empty chat content discards extraction", () => {
    expect(
      shouldPersistPreferenceProposals({
        chatOk: true,
        replyContent: "   ",
        extractionOk: true,
        candidateCount: 1,
      }),
    ).toBe(false);
  });
});
