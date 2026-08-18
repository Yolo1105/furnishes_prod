/**
 * OpenAI embeddings via raw fetch (no SDK).
 * Patterns follow `chat-provider-openai.ts` (timeout, abort, JSON body).
 */

import { envMs } from "@/server/env";
import { recordCost } from "@/server/ops/cost-guard";

const DEFAULT_MODEL = "text-embedding-3-small";
const DEFAULT_TIMEOUT_MS = 20_000;

function embeddingModel(): string {
  return process.env.RAG_EMBEDDING_MODEL?.trim() || DEFAULT_MODEL;
}

function timeoutMs(): number {
  return envMs("RAG_EMBEDDING_TIMEOUT_MS", DEFAULT_TIMEOUT_MS);
}

export type EmbedCostContext = {
  userId: string;
  conversationId?: string | null;
};

/**
 * Embed a single text string. Optionally records CostLog kind=embedding.
 */
export async function embedText(
  text: string,
  costContext?: EmbedCostContext,
): Promise<number[]> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is required for RAG embeddings");
  }
  const model = embeddingModel();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs());
  try {
    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      signal: controller.signal,
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        input: text.slice(0, 8000),
      }),
    });
    if (!response.ok) {
      throw new Error(`Embeddings API HTTP ${response.status}`);
    }
    const payload = (await response.json()) as {
      data?: Array<{ embedding?: number[] }>;
      usage?: { prompt_tokens?: number; total_tokens?: number };
    };
    const embedding = payload.data?.[0]?.embedding;
    if (!embedding?.length) {
      throw new Error("Embeddings API returned empty embedding");
    }
    if (costContext?.userId) {
      const tokens =
        payload.usage?.prompt_tokens ??
        payload.usage?.total_tokens ??
        Math.ceil(text.length / 4);
      await recordCost({
        userId: costContext.userId,
        conversationId: costContext.conversationId ?? null,
        model,
        kind: "embedding",
        usage: { promptTokens: tokens, completionTokens: 0 },
      }).catch(() => {
        /* cost ledger must not fail retrieval */
      });
    }
    return embedding;
  } finally {
    clearTimeout(timer);
  }
}
