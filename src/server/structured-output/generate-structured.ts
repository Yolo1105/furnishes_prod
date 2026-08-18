/**
 * Structured JSON chat completions via raw fetch (no AI SDK).
 * Zod-parse with one retry on parse failure; records CostLog when costContext set.
 * When costContext is set (enforceCaps default true), enforces checkCostAllowance
 * before calling the provider.
 *
 * Lives under `structured-output/` (not `server/ai/`) so ESLint's blocked `ai`
 * package pattern does not match the import path.
 */

import type { z } from "zod";
import { envMs } from "@/server/env";
import {
  checkCostAllowance,
  recordCost,
  type CostGuardDeps,
  type CostKind,
} from "@/server/ops/cost-guard";
import { CHAT_FAILURE_COST_LIMIT } from "@/server/conversations/chat-copy";
import {
  computeChatCostUsd,
  toChatUsageLike,
} from "@/server/conversations/chat-telemetry";
import { resolveModel } from "@/server/model-routing/model-router";
import { zodToJsonSchema } from "./zod-to-json-schema";

function structuredModel(kind?: CostKind): string {
  if (process.env.AI_STRUCTURED_MODEL?.trim()) {
    return process.env.AI_STRUCTURED_MODEL.trim();
  }
  if (kind === "brief") return resolveModel("brief");
  return resolveModel("structured");
}

function timeoutMs(): number {
  return envMs("AI_STRUCTURED_TIMEOUT_MS", 45_000);
}

type GenerateStructuredCostContext = {
  userId: string;
  conversationId?: string | null;
  kind: CostKind;
  /** When false, skip checkCostAllowance. Defaults to true. */
  enforceCaps?: boolean;
};

type GenerateStructuredInput<T extends z.ZodType> = {
  system: string;
  user: string;
  schema: T;
  costContext?: GenerateStructuredCostContext;
  temperature?: number;
  /** Injected for tests. */
  fetchImpl?: typeof fetch;
  /** Injected for tests — cost cap lookups. */
  costGuardDeps?: CostGuardDeps;
};

export class StructuredGenerationError extends Error {
  constructor(
    message: string,
    readonly code:
      "missing_key" | "http" | "parse" | "timeout" | "empty" | "cost_limit",
  ) {
    super(message);
    this.name = "StructuredGenerationError";
  }
}

/** Thrown when costContext.enforceCaps is on and checkCostAllowance refuses. */
export class CostLimitError extends StructuredGenerationError {
  constructor(message = CHAT_FAILURE_COST_LIMIT) {
    super(message, "cost_limit");
    this.name = "CostLimitError";
  }
}

async function callOnce(input: {
  apiKey: string;
  model: string;
  system: string;
  user: string;
  schema: z.ZodType;
  temperature: number;
  signal: AbortSignal;
  fetchImpl: typeof fetch;
}): Promise<{ raw: string; usage: unknown }> {
  const response = await input.fetchImpl(
    "https://api.openai.com/v1/chat/completions",
    {
      method: "POST",
      signal: input.signal,
      headers: {
        authorization: `Bearer ${input.apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: input.model,
        temperature: input.temperature,
        response_format: {
          type: "json_schema",
          json_schema: zodToJsonSchema(input.schema, "structured"),
        },
        messages: [
          { role: "system", content: input.system },
          { role: "user", content: input.user },
        ],
      }),
    },
  );
  if (!response.ok) {
    throw new StructuredGenerationError(
      `Structured generation HTTP ${response.status}`,
      "http",
    );
  }
  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: unknown;
  };
  const raw = payload.choices?.[0]?.message?.content?.trim() ?? "";
  if (!raw) {
    throw new StructuredGenerationError(
      "Structured generation returned empty content",
      "empty",
    );
  }
  return { raw, usage: payload.usage };
}

/**
 * Generate a Zod-validated JSON object from the chat completions API.
 * Retries once when JSON/Zod parse fails.
 */
export async function generateStructured<T extends z.ZodType>(
  input: GenerateStructuredInput<T>,
): Promise<z.infer<T>> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new StructuredGenerationError(
      "OPENAI_API_KEY is required for structured generation",
      "missing_key",
    );
  }

  if (input.costContext && input.costContext.enforceCaps !== false) {
    const allowance = await checkCostAllowance(
      {
        userId: input.costContext.userId,
        conversationId: input.costContext.conversationId ?? null,
      },
      input.costGuardDeps,
    );
    if (!allowance.allowed) {
      throw new CostLimitError();
    }
  }

  const model = structuredModel(input.costContext?.kind);
  const fetchImpl = input.fetchImpl ?? fetch;
  const temperature = input.temperature ?? 0.4;

  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs());
    try {
      const { raw, usage } = await callOnce({
        apiKey,
        model,
        system:
          attempt === 0
            ? input.system
            : `${input.system}\n\nReturn valid JSON only that matches the required shape.`,
        user: input.user,
        schema: input.schema,
        temperature,
        signal: controller.signal,
        fetchImpl,
      });
      let parsedJson: unknown;
      try {
        parsedJson = JSON.parse(raw) as unknown;
      } catch (error) {
        lastError = error;
        continue;
      }
      const parsed = input.schema.safeParse(parsedJson);
      if (!parsed.success) {
        lastError = parsed.error;
        continue;
      }
      if (input.costContext?.userId && usage) {
        const like = toChatUsageLike(usage);
        void computeChatCostUsd(like, model);
        await recordCost({
          userId: input.costContext.userId,
          conversationId: input.costContext.conversationId ?? null,
          model,
          kind: input.costContext.kind,
          usage,
        }).catch(() => {
          /* cost ledger must not fail generation */
        });
      }
      return parsed.data;
    } catch (error) {
      if (
        error instanceof Error &&
        (error.name === "AbortError" || error.message.includes("abort"))
      ) {
        throw new StructuredGenerationError(
          "Structured generation timed out",
          "timeout",
        );
      }
      if (error instanceof StructuredGenerationError) throw error;
      lastError = error;
    } finally {
      clearTimeout(timer);
    }
  }

  throw new StructuredGenerationError(
    lastError instanceof Error
      ? `Structured generation parse failed: ${lastError.message}`
      : "Structured generation parse failed",
    "parse",
  );
}
