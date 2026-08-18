/**
 * Token/cost estimates for chat generations (stored on ChatGeneration).
 * Pricing is approximate list pricing for operational telemetry only.
 */

const MODEL_PRICING_PER_MILLION: Record<
  string,
  { input: number; output: number }
> = {
  "gpt-4o-mini": { input: 0.15, output: 0.6 },
  "gpt-4o": { input: 2.5, output: 10 },
  "gpt-3.5-turbo": { input: 0.5, output: 1.5 },
};

function normalizeModelId(model: string): string {
  const trimmed = model.trim();
  const slash = trimmed.lastIndexOf("/");
  return slash >= 0 ? trimmed.slice(slash + 1) : trimmed;
}

type ChatUsageLike = {
  promptTokens: number;
  completionTokens: number;
};

export function toChatUsageLike(usage: unknown): ChatUsageLike {
  const row = (usage ?? {}) as Record<string, unknown>;
  const prompt =
    Number(row.prompt_tokens ?? row.promptTokens ?? row.input_tokens ?? 0) || 0;
  const completion =
    Number(
      row.completion_tokens ?? row.completionTokens ?? row.output_tokens ?? 0,
    ) || 0;
  return {
    promptTokens: Math.max(0, Math.floor(prompt)),
    completionTokens: Math.max(0, Math.floor(completion)),
  };
}

/** Extract OpenAI prompt cache hit count when the provider reports it. */
export function extractCachedPromptTokens(usage: unknown): number | null {
  const row = (usage ?? {}) as Record<string, unknown>;
  const details =
    (row.prompt_tokens_details as Record<string, unknown> | undefined) ??
    (row.promptTokensDetails as Record<string, unknown> | undefined);
  if (!details) return null;
  const cached = Number(details.cached_tokens ?? details.cachedTokens);
  if (!Number.isFinite(cached) || cached < 0) return null;
  return Math.floor(cached);
}

export function computeCacheHitRatio(
  promptTokens: number,
  cachedTokens: number | null,
): number | null {
  if (cachedTokens == null || promptTokens <= 0) return null;
  return Math.round((cachedTokens / promptTokens) * 1000) / 1000;
}

export function computeChatCostUsd(
  usage: ChatUsageLike,
  model: string,
): number {
  const pricing =
    MODEL_PRICING_PER_MILLION[normalizeModelId(model)] ??
    MODEL_PRICING_PER_MILLION["gpt-4o-mini"]!;
  const cost =
    (usage.promptTokens / 1_000_000) * pricing.input +
    (usage.completionTokens / 1_000_000) * pricing.output;
  return Math.round(cost * 1_000_000) / 1_000_000;
}
