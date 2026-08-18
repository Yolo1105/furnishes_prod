/**
 * Rolling conversation context summaries for long threads.
 * Re-derived from legacy context-window behavior; raw OpenAI fetch only.
 */

import { prisma } from "@/server/db";
import { resolveModel } from "@/server/model-routing/model-router";
import { runAfterResponse } from "@/server/ops/after-response";
import { recordCost } from "@/server/ops/cost-guard";
import { logOps } from "@/server/ops/log";
import { toChatUsageLike } from "./chat-telemetry";

type ContextSummaryMessage = {
  role: string;
  content: string;
};

const DEFAULT_THRESHOLD = 20;
const DEFAULT_KEEP_RECENT = 12;
const DEFAULT_MAX_CHARS = 2400;
const DEFAULT_TIMEOUT_MS = 20_000;
const STALENESS_MIN_NEW_MESSAGES = 8;
const DEFAULT_FALLBACK_TAKE = 40;

function isChatContextSummaryEnabled(): boolean {
  return process.env.CHAT_SUMMARY_ENABLED === "1";
}

export function isChatSummaryEnabled(): boolean {
  return isChatContextSummaryEnabled();
}

function summaryThreshold(): number {
  const raw = Number(
    process.env.CHAT_SUMMARY_THRESHOLD ?? String(DEFAULT_THRESHOLD),
  );
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : DEFAULT_THRESHOLD;
}

function summaryKeepRecent(): number {
  const raw = Number(
    process.env.CHAT_SUMMARY_KEEP_RECENT ?? String(DEFAULT_KEEP_RECENT),
  );
  return Number.isFinite(raw) && raw > 0
    ? Math.floor(raw)
    : DEFAULT_KEEP_RECENT;
}

function summaryMaxChars(): number {
  const raw = Number(
    process.env.CHAT_SUMMARY_MAX_CHARS ?? String(DEFAULT_MAX_CHARS),
  );
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : DEFAULT_MAX_CHARS;
}

function summaryTimeoutMs(): number {
  const raw = Number(
    process.env.CHAT_SUMMARY_TIMEOUT_MS ?? String(DEFAULT_TIMEOUT_MS),
  );
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_TIMEOUT_MS;
}

function summaryModel(): string {
  return process.env.CHAT_SUMMARY_MODEL?.trim() || resolveModel("chat");
}

export function shouldRefreshContextSummary(input: {
  messageCount: number;
  contextSummaryUpTo?: number | null;
}): boolean {
  if (!isChatContextSummaryEnabled()) return false;
  const threshold = summaryThreshold();
  if (input.messageCount < threshold) return false;
  const upTo = input.contextSummaryUpTo ?? 0;
  return input.messageCount - upTo >= STALENESS_MIN_NEW_MESSAGES;
}

export function buildHistoryWindow(input: {
  messages: ContextSummaryMessage[];
  summary?: string | null;
  keepRecent?: number;
  fallbackTake?: number;
}): {
  summaryBlock: string | null;
  recentMessages: ContextSummaryMessage[];
} {
  const keepRecent = input.keepRecent ?? summaryKeepRecent();
  const fallbackTake = input.fallbackTake ?? DEFAULT_FALLBACK_TAKE;
  const summary = input.summary?.trim() ?? "";
  const { messages } = input;

  if (summary.length > 0 && messages.length > keepRecent) {
    return {
      summaryBlock: formatContextSummaryPromptBlock(summary),
      recentMessages: messages.slice(-keepRecent),
    };
  }

  return {
    summaryBlock: null,
    recentMessages: messages.slice(-fallbackTake),
  };
}

export function formatContextSummaryPromptBlock(summary: string): string {
  const trimmed = summary.trim();
  return `CONVERSATION MEMORY — earlier context (summarized)
${trimmed}
Treat as accurate history; prefer recent messages when they conflict.`;
}

function truncateSummary(text: string, maxChars: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxChars) return trimmed;
  return `${trimmed.slice(0, maxChars - 1)}…`;
}

function formatMessagesForSummarization(
  messages: ContextSummaryMessage[],
): string {
  return messages
    .map((message) => {
      const role = message.role === "assistant" ? "Assistant" : "User";
      return `${role}: ${message.content.trim()}`;
    })
    .join("\n\n");
}

type OpenAiFetch = typeof fetch;

async function summarizeOlderMessages(input: {
  messages: ContextSummaryMessage[];
  priorSummary?: string | null;
  fetchImpl: OpenAiFetch;
}): Promise<{ summary: string; model: string; usage: unknown } | null> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;

  const model = summaryModel();
  const transcript = formatMessagesForSummarization(input.messages);
  const system = input.priorSummary?.trim()
    ? `Update the existing running summary with the new messages. Write plain prose in second person for the user ("the user wants…"). Capture decisions made, constraints stated, preferences expressed, and open questions. Do not restart from scratch, invent details, or include long verbatim quotes. Keep under ${summaryMaxChars()} characters.`
    : `Write a factual running summary of this design conversation in plain prose, second person for the user ("the user wants…"). Capture decisions made, constraints stated, preferences expressed, and open questions. No long verbatim quotes. Keep under ${summaryMaxChars()} characters.`;

  const userContent = input.priorSummary?.trim()
    ? `Existing summary:\n${input.priorSummary.trim()}\n\nNew messages to fold in:\n${transcript}`
    : `Messages:\n${transcript}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), summaryTimeoutMs());
  try {
    const response = await input.fetchImpl(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        signal: controller.signal,
        headers: {
          authorization: `Bearer ${apiKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model,
          temperature: 0.2,
          messages: [
            { role: "system", content: system },
            { role: "user", content: userContent },
          ],
        }),
      },
    );
    if (!response.ok) return null;
    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: unknown;
    };
    const summary = payload.choices?.[0]?.message?.content?.trim() ?? "";
    if (!summary) return null;
    return { summary, model, usage: payload.usage };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function maybeRefreshContextSummary(input: {
  conversationId: string;
  userId: string;
  messages: ContextSummaryMessage[];
  fetchImpl?: OpenAiFetch;
}): Promise<void> {
  if (!isChatContextSummaryEnabled()) return;

  const conversation = await prisma.conversation.findFirst({
    where: { id: input.conversationId, userId: input.userId },
    select: {
      contextSummary: true,
      contextSummaryUpTo: true,
    },
  });
  if (!conversation) return;

  const messageCount = input.messages.length;
  if (
    !shouldRefreshContextSummary({
      messageCount,
      contextSummaryUpTo: conversation.contextSummaryUpTo,
    })
  ) {
    return;
  }

  const keepRecent = summaryKeepRecent();
  if (messageCount <= keepRecent) return;

  const older = input.messages.slice(0, messageCount - keepRecent);
  if (older.length === 0) return;

  const fetchImpl = input.fetchImpl ?? fetch;
  const result = await summarizeOlderMessages({
    messages: older,
    priorSummary: conversation.contextSummary,
    fetchImpl,
  });

  if (!result) {
    logOps("warn", "context_summary_failed", {
      conversationId: input.conversationId,
      messageCount,
      olderCount: older.length,
      priorSummaryChars: conversation.contextSummary?.length ?? 0,
    });
    console.warn(
      `[ops] context_summary_failed conversation=${input.conversationId} messages=${messageCount}`,
    );
    return;
  }

  const summary = truncateSummary(result.summary, summaryMaxChars());
  const upTo = messageCount - keepRecent;

  try {
    await prisma.conversation.update({
      where: { id: input.conversationId },
      data: {
        contextSummary: summary,
        contextSummaryUpTo: upTo,
        contextSummaryUpdatedAt: new Date(),
      },
    });

    const usage = toChatUsageLike(result.usage);
    await recordCost({
      userId: input.userId,
      conversationId: input.conversationId,
      model: result.model,
      kind: "chat",
      usage,
    }).catch(() => {
      /* cost ledger must not fail summary refresh */
    });
  } catch {
    logOps("warn", "context_summary_failed", {
      conversationId: input.conversationId,
      messageCount,
      olderCount: older.length,
      priorSummaryChars: conversation.contextSummary?.length ?? 0,
    });
    console.warn(
      `[ops] context_summary_failed conversation=${input.conversationId} messages=${messageCount}`,
    );
  }
}

/**
 * Schedule summary refresh after the reply. Uses Next `after()` when available
 * so serverless runtimes do not freeze before the work runs.
 */
export function scheduleContextSummaryRefresh(input: {
  conversationId: string;
  userId: string;
  messages: ContextSummaryMessage[];
}): void {
  if (!isChatContextSummaryEnabled()) return;
  logOps("info", "context_summary_schedule", {
    conversationId: input.conversationId,
    userId: input.userId,
    messageCount: input.messages.length,
  });
  runAfterResponse(() => maybeRefreshContextSummary(input));
}
