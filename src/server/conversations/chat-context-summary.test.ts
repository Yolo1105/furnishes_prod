import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildHistoryWindow,
  formatContextSummaryPromptBlock,
  shouldRefreshContextSummary,
} from "./chat-context-summary";

afterEach(() => {
  delete process.env.CHAT_SUMMARY_ENABLED;
  delete process.env.CHAT_SUMMARY_THRESHOLD;
  delete process.env.CHAT_SUMMARY_KEEP_RECENT;
});

describe("shouldRefreshContextSummary", () => {
  it("returns false when disabled", () => {
    process.env.CHAT_SUMMARY_ENABLED = "0";
    expect(
      shouldRefreshContextSummary({ messageCount: 30, contextSummaryUpTo: 0 }),
    ).toBe(false);
  });

  it("returns false below threshold", () => {
    process.env.CHAT_SUMMARY_ENABLED = "1";
    expect(
      shouldRefreshContextSummary({ messageCount: 19, contextSummaryUpTo: 0 }),
    ).toBe(false);
  });

  it("returns false when not stale enough", () => {
    process.env.CHAT_SUMMARY_ENABLED = "1";
    expect(
      shouldRefreshContextSummary({ messageCount: 25, contextSummaryUpTo: 20 }),
    ).toBe(false);
  });

  it("returns true when enabled, above threshold, and stale", () => {
    process.env.CHAT_SUMMARY_ENABLED = "1";
    expect(
      shouldRefreshContextSummary({ messageCount: 28, contextSummaryUpTo: 8 }),
    ).toBe(true);
  });

  it("treats null upTo as zero", () => {
    process.env.CHAT_SUMMARY_ENABLED = "1";
    expect(
      shouldRefreshContextSummary({
        messageCount: 28,
        contextSummaryUpTo: null,
      }),
    ).toBe(true);
  });
});

describe("buildHistoryWindow", () => {
  const messages = Array.from({ length: 30 }, (_, index) => ({
    role: index % 2 === 0 ? "user" : "assistant",
    content: `message-${index}`,
  }));

  it("uses summary block and keepRecent when summary exists and thread is long", () => {
    process.env.CHAT_SUMMARY_KEEP_RECENT = "12";
    const window = buildHistoryWindow({
      messages,
      summary: "Earlier they chose japandi and a $5k budget.",
      keepRecent: 12,
    });
    expect(window.summaryBlock).toContain(
      "CONVERSATION MEMORY — earlier context (summarized)",
    );
    expect(window.recentMessages).toHaveLength(12);
    expect(window.recentMessages[0]?.content).toBe("message-18");
  });

  it("falls back to last 40 without summary block when summary empty", () => {
    const window = buildHistoryWindow({
      messages,
      summary: "",
      fallbackTake: 40,
    });
    expect(window.summaryBlock).toBeNull();
    expect(window.recentMessages).toHaveLength(30);
  });

  it("falls back when summary exists but thread is short", () => {
    const short = messages.slice(0, 10);
    const window = buildHistoryWindow({
      messages: short,
      summary: "Some summary",
      keepRecent: 12,
      fallbackTake: 40,
    });
    expect(window.summaryBlock).toBeNull();
    expect(window.recentMessages).toHaveLength(10);
  });
});

describe("formatContextSummaryPromptBlock", () => {
  it("wraps summary with delimited section and conflict guidance", () => {
    const block = formatContextSummaryPromptBlock(
      "User prefers warm neutrals.",
    );
    expect(block).toBe(
      `CONVERSATION MEMORY — earlier context (summarized)
User prefers warm neutrals.
Treat as accurate history; prefer recent messages when they conflict.`,
    );
  });
});

describe("maybeRefreshContextSummary", () => {
  it("no-ops when disabled without calling fetch", async () => {
    process.env.CHAT_SUMMARY_ENABLED = "0";
    const fetchImpl = vi.fn();
    const { maybeRefreshContextSummary } =
      await import("./chat-context-summary");
    await maybeRefreshContextSummary({
      conversationId: "c1",
      userId: "u1",
      messages: [{ role: "user", content: "hi" }],
      fetchImpl,
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("sends a rolling-update prompt when a prior summary exists", async () => {
    process.env.CHAT_SUMMARY_ENABLED = "1";
    process.env.CHAT_SUMMARY_THRESHOLD = "20";
    process.env.CHAT_SUMMARY_KEEP_RECENT = "12";
    process.env.OPENAI_API_KEY = "test-key";
    process.env.CHAT_MODEL_PRIMARY = "gpt-test";

    vi.resetModules();
    vi.doMock("@/server/db", () => ({
      prisma: {
        conversation: {
          findFirst: vi.fn(async () => ({
            contextSummary: "Prior: the user wants japandi.",
            contextSummaryUpTo: 8,
          })),
          update: vi.fn(async () => ({})),
        },
      },
    }));
    vi.doMock("@/server/ops/cost-guard", () => ({
      recordCost: vi.fn(async () => undefined),
    }));
    vi.doMock("@/server/ops/log", () => ({
      logOps: vi.fn(),
    }));

    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "Updated summary for the user." } }],
        usage: { prompt_tokens: 10, completion_tokens: 5 },
      }),
    }));

    const { maybeRefreshContextSummary } =
      await import("./chat-context-summary");

    const messages = Array.from({ length: 28 }, (_, index) => ({
      role: index % 2 === 0 ? "user" : "assistant",
      content: `turn-${index}`,
    }));

    await maybeRefreshContextSummary({
      conversationId: "c1",
      userId: "u1",
      messages,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [, requestInit] = fetchImpl.mock.calls[0] as unknown as [
      string,
      { body: string },
    ];
    const body = JSON.parse(requestInit.body) as {
      messages: Array<{ role: string; content: string }>;
    };
    expect(body.messages[0]?.content).toMatch(
      /Update the existing running summary/i,
    );
    expect(body.messages[1]?.content).toContain("Existing summary:");
    expect(body.messages[1]?.content).toContain(
      "Prior: the user wants japandi.",
    );
    expect(body.messages[1]?.content).toContain("New messages to fold in:");
  });
});
