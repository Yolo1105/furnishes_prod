/**
 * Conversation context builder: token-aware history, optional summarization.
 */
import { generateText } from "ai";
import { messagesToTranscript } from "@/lib/eva/api/helpers";
import { openai, getOpenAIKey, OPENAI_PRIMARY_MODEL } from "./openai";
import { log } from "./logger";

const CHARS_PER_TOKEN = 4;
const MAX_CONTEXT_CHARS = 3000;
/** Abort summarization if it takes longer than this. */
const SUMMARIZE_TIMEOUT_MS = 10_000;

function estimateTokens(text: string): number {
  return Math.max(0, Math.floor(text.length / CHARS_PER_TOKEN));
}

export interface MessageForContext {
  role: string;
  content: string;
}

export interface BuildContextResult {
  systemSuffix: string;
  messages: MessageForContext[];
}

async function summarizeMessages(
  messages: MessageForContext[],
): Promise<string> {
  if (!getOpenAIKey() || messages.length === 0) return "";
  try {
    const blob = messagesToTranscript(
      messages.map((m) => ({
        role: m.role,
        content: (m.content || "").slice(0, 300),
      })),
    );
    const body =
      blob.length > MAX_CONTEXT_CHARS ? blob.slice(-MAX_CONTEXT_CHARS) : blob;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), SUMMARIZE_TIMEOUT_MS);

    try {
      const result = await generateText({
        model: openai(OPENAI_PRIMARY_MODEL),
        prompt: `Summarize this conversation in 2-4 sentences, preserving key preferences and decisions:\n\n${body}`,
        temperature: 0.2,
        maxRetries: 1,
        abortSignal: controller.signal,
      });
      return (result.text ?? "").trim();
    } finally {
      clearTimeout(timer);
    }
  } catch (err) {
    log({
      level: "warn",
      event: "context_summarization_failed",
      error: String(err),
    });
    return "";
  }
}

export async function buildContext(
  messages: MessageForContext[],
  preferences: Record<string, string>,
  options: {
    maxContextTokens?: number;
    summarizeAfter?: number;
  } = {},
): Promise<BuildContextResult> {
  const maxContextTokens = options.maxContextTokens ?? 4000;
  const summarizeAfter = options.summarizeAfter ?? 20;
  const approxChars = maxContextTokens * CHARS_PER_TOKEN;

  const systemSuffix = Object.keys(preferences).length
    ? `\n\nCurrent preferences (use for context): ${JSON.stringify(preferences)}`
    : "";

  let totalTokens = 0;
  for (const m of messages) {
    totalTokens += estimateTokens(m.content || "") + 5;
  }

  if (totalTokens <= maxContextTokens && messages.length <= summarizeAfter) {
    return {
      systemSuffix,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content || "",
      })),
    };
  }

  if (messages.length > summarizeAfter && getOpenAIKey()) {
    const toSummarize = messages.slice(0, -summarizeAfter);
    const rest = messages.slice(-summarizeAfter);
    const summary = await summarizeMessages(toSummarize);
    const out: MessageForContext[] = [];
    if (summary) {
      out.push({
        role: "user",
        content: `[Earlier conversation summary]: ${summary}`,
      });
    }
    for (const m of rest) {
      out.push({ role: m.role, content: m.content || "" });
    }
    let count = 0;
    const trimmed: MessageForContext[] = [];
    for (let i = out.length - 1; i >= 0; i--) {
      count += (out[i].content?.length ?? 0) + 20;
      if (count > approxChars) break;
      trimmed.unshift(out[i]);
    }
    return {
      systemSuffix,
      messages: trimmed.length ? trimmed : out,
    };
  }

  const out: MessageForContext[] = [];
  let count = 0;
  for (let i = messages.length - 1; i >= 0; i--) {
    count += (messages[i].content?.length ?? 0) + 20;
    if (count > approxChars) break;
    out.unshift({
      role: messages[i].role,
      content: messages[i].content || "",
    });
  }
  return {
    systemSuffix,
    messages: out.length
      ? out
      : messages.map((m) => ({ role: m.role, content: m.content || "" })),
  };
}
