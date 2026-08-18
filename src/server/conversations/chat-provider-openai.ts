import type {
  ChatProvider,
  ChatProviderInput,
  ChatProviderResult,
  ChatStreamChunk,
} from "./chat-provider";
import { buildProviderMessages, resolveChatSystemPrompt } from "./chat-prompt";
import {
  CHAT_FAILURE_AI_TEMPORARILY_UNAVAILABLE,
  CHAT_FAILURE_ALL_MODELS_FAILED,
  CHAT_FAILURE_EMPTY_REPLY,
  CHAT_FAILURE_REQUEST_TIMEOUT,
  CHAT_FAILURE_SANITIZATION_EMPTIED,
} from "./chat-copy";
import { CHAT_GENERATION_FAILURE, ChatProviderError } from "./chat-failure";
import { finalizeChatModelOutput } from "./chat-output-sanitize";
import {
  computeChatCostUsd,
  extractCachedPromptTokens,
  toChatUsageLike,
} from "./chat-telemetry";
import { envMs } from "@/server/env";
import { logOps } from "@/server/ops/log";
import { runOpenAiToolLoop } from "./chat-tool-loop";

function timeoutMs(): number {
  return envMs("CHAT_REQUEST_TIMEOUT_MS", 60_000);
}

function isAbortError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const name =
    "name" in error ? String((error as { name?: unknown }).name) : "";
  return name === "AbortError" || name === "TimeoutError";
}

function linkSignals(
  external: AbortSignal | undefined,
  timeout: AbortSignal,
): AbortSignal {
  if (!external) return timeout;
  if (typeof AbortSignal.any === "function") {
    return AbortSignal.any([external, timeout]);
  }
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  if (external.aborted || timeout.aborted) {
    controller.abort();
    return controller.signal;
  }
  external.addEventListener("abort", onAbort, { once: true });
  timeout.addEventListener("abort", onAbort, { once: true });
  return controller.signal;
}

async function* readOpenAiSse(
  body: ReadableStream<Uint8Array>,
  model: string,
): AsyncGenerator<ChatStreamChunk> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let requestId: string | null = null;
  let usage: ReturnType<typeof toChatUsageLike> | null = null;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split("\n");
      buffer = parts.pop() ?? "";
      for (const line of parts) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const data = trimmed.slice(5).trim();
        if (!data || data === "[DONE]") continue;
        let payload: {
          id?: string;
          choices?: Array<{ delta?: { content?: string } }>;
          usage?: unknown;
        };
        try {
          payload = JSON.parse(data) as typeof payload;
        } catch {
          continue;
        }
        if (payload.id) requestId = payload.id;
        if (payload.usage) usage = toChatUsageLike(payload.usage);
        const delta = payload.choices?.[0]?.delta?.content ?? "";
        if (delta) yield { text: delta, model, requestId };
      }
    }
  } finally {
    reader.releaseLock();
  }

  yield {
    text: "",
    done: true,
    model,
    requestId,
    promptTokens: usage?.promptTokens ?? null,
    completionTokens: usage?.completionTokens ?? null,
    costUsd: usage ? computeChatCostUsd(usage, model) : null,
  };
}

function promptInputFrom(input: ChatProviderInput) {
  return {
    persona: input.persona,
    memoryEnabled: input.memoryEnabled,
    confirmedPreferences: input.confirmedPreferences,
    ...(input.confirmedPreferenceSources
      ? { confirmedPreferenceSources: input.confirmedPreferenceSources }
      : {}),
    profileContext: input.profileContext,
    messages: input.messages,
    ...(input.userId ? { userId: input.userId } : {}),
    ...(input.conversationId ? { conversationId: input.conversationId } : {}),
    ...(input.workflow ? { workflow: input.workflow } : {}),
    ...(input.attachmentGroundingBlock
      ? { attachmentGroundingBlock: input.attachmentGroundingBlock }
      : {}),
    ...(input.contextSummaryBlock
      ? { contextSummaryBlock: input.contextSummaryBlock }
      : {}),
    ...(input.projectMemoryBlock
      ? { projectMemoryBlock: input.projectMemoryBlock }
      : {}),
    ...(input.roomPlanBlock ? { roomPlanBlock: input.roomPlanBlock } : {}),
    ...(input.pageContextBlock
      ? { pageContextBlock: input.pageContextBlock }
      : {}),
    ...(input.responseLengthOverride
      ? { responseLengthOverride: input.responseLengthOverride }
      : {}),
  };
}

/**
 * OpenAI chat generation via fetch (no SDK import).
 * Requires OPENAI_API_KEY and CHAT_MODEL_PRIMARY.
 * Primary → optional fallback model; never silent local replies.
 * When `input.tools.execute` is true, runs the whitelist tool loop first.
 */
export function createOpenAIChatProvider(): ChatProvider {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  const primary = process.env.CHAT_MODEL_PRIMARY?.trim();
  const fallback = process.env.CHAT_MODEL_FALLBACK?.trim();

  if (!apiKey || !primary) {
    throw new ChatProviderError(
      CHAT_GENERATION_FAILURE.PROVIDER_UNAVAILABLE,
      "OpenAI chat requires OPENAI_API_KEY and CHAT_MODEL_PRIMARY.",
    );
  }

  return {
    async generate(input: ChatProviderInput): Promise<ChatProviderResult> {
      const { systemPrompt } = await resolveChatSystemPrompt(
        promptInputFrom(input),
      );

      if (input.tools?.execute && input.userId && input.conversationId) {
        const loop = await runOpenAiToolLoop({
          apiKey,
          model: primary,
          systemPrompt,
          history: input.messages,
          ctx: {
            userId: input.userId,
            conversationId: input.conversationId,
            mode: input.tools.mode,
          },
          mode: input.tools.mode,
          costAlreadyChecked: true,
          ...(input.signal ? { signal: input.signal } : {}),
        });
        if (loop.toolsFired.length > 0 && loop.content.trim()) {
          return {
            content: loop.content,
            model: loop.model,
            promptTokens: loop.promptTokens,
            completionTokens: loop.completionTokens,
            costUsd: null,
            toolsFired: loop.toolsFired,
          };
        }
      }

      const messages = buildProviderMessages({
        systemPrompt,
        history: input.messages,
      });

      const models =
        fallback && fallback !== primary ? [primary, fallback] : [primary];
      let lastError: ChatProviderError | null = null;
      let sawTimeout = false;

      for (let index = 0; index < models.length; index += 1) {
        const model = models[index]!;
        const isPrimary = index === 0;
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs());
        const signal = linkSignals(input.signal, controller.signal);
        try {
          const response = await fetch(
            "https://api.openai.com/v1/chat/completions",
            {
              method: "POST",
              signal,
              headers: {
                authorization: `Bearer ${apiKey}`,
                "content-type": "application/json",
              },
              body: JSON.stringify({
                model,
                temperature: 0.7,
                messages: messages.map((message) => ({
                  role: message.role,
                  content: message.content,
                })),
              }),
            },
          );

          if (response.status === 429 || response.status >= 500) {
            lastError = new ChatProviderError(
              CHAT_GENERATION_FAILURE.PROVIDER_UNAVAILABLE,
              CHAT_FAILURE_AI_TEMPORARILY_UNAVAILABLE,
            );
            continue;
          }
          if (!response.ok) {
            lastError = new ChatProviderError(
              isPrimary
                ? CHAT_GENERATION_FAILURE.PRIMARY_EXCEPTION
                : CHAT_GENERATION_FAILURE.FALLBACK_EXCEPTION,
              `OpenAI chat HTTP ${response.status}`,
            );
            continue;
          }

          const payload = (await response.json()) as {
            id?: string;
            choices?: Array<{ message?: { content?: string } }>;
            usage?: unknown;
          };
          const raw = payload.choices?.[0]?.message?.content ?? "";
          const finalized = finalizeChatModelOutput(raw);
          if (!finalized.text.trim()) {
            lastError = new ChatProviderError(
              finalized.strictSanitizationCollapsed
                ? CHAT_GENERATION_FAILURE.SANITIZATION_COLLAPSED_OUTPUT
                : isPrimary
                  ? CHAT_GENERATION_FAILURE.PRIMARY_EMPTY
                  : CHAT_GENERATION_FAILURE.FALLBACK_EMPTY,
              finalized.strictSanitizationCollapsed
                ? CHAT_FAILURE_SANITIZATION_EMPTIED
                : CHAT_FAILURE_EMPTY_REPLY,
            );
            continue;
          }

          const usage = toChatUsageLike(payload.usage);
          const cachedTokens = extractCachedPromptTokens(payload.usage);
          if (cachedTokens != null && input.userId) {
            logOps("info", "prompt_cache_tokens", {
              userId: input.userId,
              conversationId: input.conversationId ?? null,
              promptTokens: usage.promptTokens,
              cachedTokens,
              model,
            });
          }
          return {
            content: finalized.text,
            model,
            promptTokens: usage.promptTokens,
            completionTokens: usage.completionTokens,
            costUsd: computeChatCostUsd(usage, model),
            requestId: payload.id ?? null,
          };
        } catch (error) {
          if (input.signal?.aborted) throw error;
          if (isAbortError(error) || controller.signal.aborted) {
            sawTimeout = true;
            lastError = new ChatProviderError(
              CHAT_GENERATION_FAILURE.PROVIDER_TIMEOUT,
              CHAT_FAILURE_REQUEST_TIMEOUT,
              { cause: error },
            );
            continue;
          }
          lastError = new ChatProviderError(
            isPrimary
              ? CHAT_GENERATION_FAILURE.PRIMARY_EXCEPTION
              : CHAT_GENERATION_FAILURE.FALLBACK_EXCEPTION,
            CHAT_FAILURE_AI_TEMPORARILY_UNAVAILABLE,
            { cause: error },
          );
        } finally {
          clearTimeout(timer);
        }
      }

      if (
        sawTimeout &&
        lastError?.category === CHAT_GENERATION_FAILURE.PROVIDER_TIMEOUT
      ) {
        throw lastError;
      }
      throw (
        lastError ??
        new ChatProviderError(
          CHAT_GENERATION_FAILURE.ALL_MODELS_FAILED,
          CHAT_FAILURE_ALL_MODELS_FAILED,
        )
      );
    },

    async *stream(input: ChatProviderInput): AsyncIterable<ChatStreamChunk> {
      const { systemPrompt } = await resolveChatSystemPrompt(
        promptInputFrom(input),
      );

      if (input.tools?.execute && input.userId && input.conversationId) {
        const activities: Array<{ tool: string; status: string }> = [];
        const loop = await runOpenAiToolLoop({
          apiKey,
          model: primary,
          systemPrompt,
          history: input.messages,
          ctx: {
            userId: input.userId,
            conversationId: input.conversationId,
            mode: input.tools.mode,
          },
          mode: input.tools.mode,
          costAlreadyChecked: true,
          ...(input.signal ? { signal: input.signal } : {}),
          onToolActivity: (tool, status) => {
            activities.push({ tool, status });
          },
        });
        for (const activity of activities) {
          yield { text: "", toolActivity: activity };
        }
        if (loop.toolsFired.length > 0 && loop.content.trim()) {
          yield { text: loop.content, model: loop.model };
          yield {
            text: "",
            done: true,
            model: loop.model,
            promptTokens: loop.promptTokens,
            completionTokens: loop.completionTokens,
            costUsd: null,
          };
          return;
        }
      }

      const messages = buildProviderMessages({
        systemPrompt,
        history: input.messages,
      });
      const models =
        fallback && fallback !== primary ? [primary, fallback] : [primary];
      let lastError: ChatProviderError | null = null;

      for (let index = 0; index < models.length; index += 1) {
        const model = models[index]!;
        const isPrimary = index === 0;
        const timeoutController = new AbortController();
        const timer = setTimeout(() => timeoutController.abort(), timeoutMs());
        const signal = linkSignals(input.signal, timeoutController.signal);
        try {
          const response = await fetch(
            "https://api.openai.com/v1/chat/completions",
            {
              method: "POST",
              signal,
              headers: {
                authorization: `Bearer ${apiKey}`,
                "content-type": "application/json",
              },
              body: JSON.stringify({
                model,
                temperature: 0.7,
                stream: true,
                stream_options: { include_usage: true },
                messages: messages.map((message) => ({
                  role: message.role,
                  content: message.content,
                })),
              }),
            },
          );
          if (response.status === 429 || response.status >= 500) {
            lastError = new ChatProviderError(
              CHAT_GENERATION_FAILURE.PROVIDER_UNAVAILABLE,
              CHAT_FAILURE_AI_TEMPORARILY_UNAVAILABLE,
            );
            continue;
          }
          if (!response.ok || !response.body) {
            lastError = new ChatProviderError(
              isPrimary
                ? CHAT_GENERATION_FAILURE.PRIMARY_EXCEPTION
                : CHAT_GENERATION_FAILURE.FALLBACK_EXCEPTION,
              `OpenAI chat HTTP ${response.status}`,
            );
            continue;
          }
          yield* readOpenAiSse(response.body, model);
          return;
        } catch (error) {
          if (input.signal?.aborted) return;
          if (isAbortError(error) || timeoutController.signal.aborted) {
            lastError = new ChatProviderError(
              CHAT_GENERATION_FAILURE.PROVIDER_TIMEOUT,
              CHAT_FAILURE_REQUEST_TIMEOUT,
              { cause: error },
            );
            continue;
          }
          lastError = new ChatProviderError(
            isPrimary
              ? CHAT_GENERATION_FAILURE.PRIMARY_EXCEPTION
              : CHAT_GENERATION_FAILURE.FALLBACK_EXCEPTION,
            CHAT_FAILURE_AI_TEMPORARILY_UNAVAILABLE,
            { cause: error },
          );
        } finally {
          clearTimeout(timer);
        }
      }

      throw (
        lastError ??
        new ChatProviderError(
          CHAT_GENERATION_FAILURE.ALL_MODELS_FAILED,
          CHAT_FAILURE_ALL_MODELS_FAILED,
        )
      );
    },
  };
}
