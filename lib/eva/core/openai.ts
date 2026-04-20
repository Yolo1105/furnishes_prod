/**
 * OpenAI / OpenRouter API. Server-only.
 */
import { createOpenAI } from "@ai-sdk/openai";
import { getPublicOrigin } from "@/lib/eva/core/public-origin";

const openRouterKey = process.env.OPENROUTER_API_KEY?.trim() || null;
const openaiKey = process.env.OPENAI_API_KEY?.trim() || null;

const openRouterReferer =
  process.env.OPENROUTER_HTTP_REFERER?.trim() || getPublicOrigin();
const openRouterTitle =
  process.env.OPENROUTER_APP_TITLE?.trim() ||
  process.env.NEXT_PUBLIC_APP_NAME?.trim() ||
  "Furnishes";

/** Provider: OpenRouter if OPENROUTER_API_KEY is set, else OpenAI. */
export const openai = openRouterKey
  ? createOpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: openRouterKey,
      /** https://openrouter.ai/docs — recommended for rankings; avoids odd routing. */
      headers: {
        "HTTP-Referer": openRouterReferer,
        "X-Title": openRouterTitle,
      },
    })
  : createOpenAI({ apiKey: openaiKey ?? "" });

export const OPENAI_KEY_MISSING_MESSAGE =
  "OPENAI_API_KEY or OPENROUTER_API_KEY is not configured.";

/**
 * OpenRouter expects `provider/model` slugs (e.g. `openai/gpt-4o-mini`).
 * Short IDs like `gpt-4o-mini` can yield empty streams while other calls appear fine.
 *
 * Override via env when a route misbehaves: `OPENROUTER_PRIMARY_MODEL`, `OPENROUTER_FALLBACK_MODEL`.
 */
export const OPENAI_PRIMARY_MODEL = openRouterKey
  ? process.env.OPENROUTER_PRIMARY_MODEL?.trim() || "openai/gpt-4o-mini"
  : "gpt-4o-mini";
/** On OpenRouter, prefer a second strong model over legacy 3.5 (often flaky / empty streams). */
export const OPENAI_FALLBACK_MODEL = openRouterKey
  ? process.env.OPENROUTER_FALLBACK_MODEL?.trim() || "openai/gpt-4o"
  : "gpt-3.5-turbo";

export const MODEL_PRICING: Record<string, { input: number; output: number }> =
  {
    "gpt-4o-mini": { input: 0.15, output: 0.6 },
    "gpt-4o": { input: 2.5, output: 10 },
    "gpt-3.5-turbo": { input: 0.5, output: 1.5 },
  };

function modelIdForPricing(model: string): string {
  const i = model.lastIndexOf("/");
  return i >= 0 ? model.slice(i + 1) : model;
}

export type UsageLike = {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
};

export function toUsageLike(usage: unknown): UsageLike {
  if (!usage || typeof usage !== "object") return {};
  const u = usage as Record<string, unknown>;
  return {
    promptTokens:
      typeof u.promptTokens === "number"
        ? u.promptTokens
        : typeof u.inputTokens === "number"
          ? u.inputTokens
          : undefined,
    completionTokens:
      typeof u.completionTokens === "number"
        ? u.completionTokens
        : typeof u.outputTokens === "number"
          ? u.outputTokens
          : undefined,
    totalTokens: typeof u.totalTokens === "number" ? u.totalTokens : undefined,
  };
}

export function computeCost(usage: UsageLike, model: string): number {
  const pricing =
    MODEL_PRICING[model] ?? MODEL_PRICING[modelIdForPricing(model)];
  if (!pricing) return 0;
  const prompt = (usage.promptTokens ?? 0) / 1_000_000;
  const completion = (usage.completionTokens ?? 0) / 1_000_000;
  return prompt * pricing.input + completion * pricing.output;
}

export function getOpenAIKey(): string | null {
  return openRouterKey ?? openaiKey;
}

/** True when requests go through OpenRouter (`openai/...` model slugs). */
export function usesOpenRouter(): boolean {
  return Boolean(openRouterKey);
}

/**
 * Models queued for non-streaming recovery when the chat stream yields no text.
 * Order: optional env override, route fallback + primary, then legacy slugs for extra attempts.
 */
export function buildChatRecoveryGenerateTextModelQueue(): string[] {
  const identifiers: string[] = [];
  const pushUnique = (modelId: string) => {
    const trimmed = modelId.trim();
    if (trimmed.length > 0 && !identifiers.includes(trimmed)) {
      identifiers.push(trimmed);
    }
  };

  const envExtra = process.env.OPENROUTER_RECOVERY_EXTRA_MODEL?.trim();
  if (envExtra) pushUnique(envExtra);
  pushUnique(OPENAI_FALLBACK_MODEL);
  pushUnique(OPENAI_PRIMARY_MODEL);
  if (usesOpenRouter()) {
    pushUnique("openai/gpt-4o");
    pushUnique("openai/gpt-3.5-turbo");
  } else {
    pushUnique("gpt-4o");
    pushUnique("gpt-3.5-turbo");
  }
  return identifiers;
}

export function getLLMApiBaseUrl(): string {
  return openRouterKey
    ? "https://openrouter.ai/api/v1"
    : "https://api.openai.com";
}

export function requireOpenAIKey(): string {
  const key = getOpenAIKey();
  if (!key) throw new Error(OPENAI_KEY_MISSING_MESSAGE);
  return key;
}

export async function withFallback<T>(
  primary: () => Promise<T>,
  fallback: () => Promise<T>,
): Promise<T> {
  try {
    return await primary();
  } catch {
    return await fallback();
  }
}
