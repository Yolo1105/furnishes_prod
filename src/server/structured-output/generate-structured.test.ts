import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import {
  CostLimitError,
  generateStructured,
  StructuredGenerationError,
} from "./generate-structured";
import type { CostGuardDeps } from "@/server/ops/cost-guard";
import { CHAT_FAILURE_COST_LIMIT } from "@/server/conversations/chat-copy";

const schema = z.object({
  items: z.array(z.string()).min(1),
});

function overCapDeps(): CostGuardDeps {
  return {
    getSessionCostUsd: async () => 2.5,
    getDailyUserCostUsd: async () => 0,
    getDailyGlobalCostUsd: async () => 0,
  };
}

function underCapDeps(): CostGuardDeps {
  return {
    getSessionCostUsd: async () => 0.1,
    getDailyUserCostUsd: async () => 0,
    getDailyGlobalCostUsd: async () => 0,
  };
}

describe("generateStructured", () => {
  afterEach(() => {
    delete process.env.OPENAI_API_KEY;
    delete process.env.AI_STRUCTURED_MODEL;
    delete process.env.AI_MODEL_MINI;
    delete process.env.CHAT_MODEL_PRIMARY;
    delete process.env.CHAT_SESSION_COST_LIMIT_USD;
    delete process.env.CHAT_GLOBAL_DAILY_COST_LIMIT_USD;
    delete process.env.CHAT_USER_DAILY_COST_LIMIT_USD;
    delete process.env.CHAT_USER_DAILY_COST_USD;
  });

  it("parses a valid JSON object response", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    process.env.AI_STRUCTURED_MODEL = "gpt-4o-mini";
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          { message: { content: JSON.stringify({ items: ["a", "b"] }) } },
        ],
        usage: { prompt_tokens: 10, completion_tokens: 5 },
      }),
    });

    const result = await generateStructured({
      system: "Return JSON",
      user: "hi",
      schema,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(result.items).toEqual(["a", "b"]);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const body = JSON.parse(
      (fetchImpl.mock.calls[0]![1] as RequestInit).body as string,
    ) as {
      response_format: {
        type: string;
        json_schema: { name: string; strict: boolean; schema: unknown };
      };
    };
    expect(body.response_format.type).toBe("json_schema");
    expect(body.response_format.json_schema).toMatchObject({
      name: "structured",
      strict: true,
      schema: expect.objectContaining({
        type: "object",
        additionalProperties: false,
      }),
    });
  });

  it("retries once when the first response is invalid JSON", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    process.env.AI_MODEL_MINI = "gpt-4o-mini";
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: "not-json" } }],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            { message: { content: JSON.stringify({ items: ["ok"] }) } },
          ],
        }),
      });

    const result = await generateStructured({
      system: "Return JSON",
      user: "hi",
      schema,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(result.items).toEqual(["ok"]);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("throws missing_key when OPENAI_API_KEY is unset", async () => {
    await expect(
      generateStructured({
        system: "x",
        user: "y",
        schema,
      }),
    ).rejects.toBeInstanceOf(StructuredGenerationError);
  });

  it("refuses over-cap when costContext is set (session)", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    process.env.CHAT_SESSION_COST_LIMIT_USD = "2";
    const fetchImpl = vi.fn();

    await expect(
      generateStructured({
        system: "Return JSON",
        user: "hi",
        schema,
        costContext: {
          userId: "u1",
          conversationId: "c1",
          kind: "suggestion",
        },
        costGuardDeps: overCapDeps(),
        fetchImpl: fetchImpl as unknown as typeof fetch,
      }),
    ).rejects.toBeInstanceOf(CostLimitError);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("refuses over-cap for recommendation and brainstorm kinds", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    process.env.CHAT_SESSION_COST_LIMIT_USD = "2";
    const fetchImpl = vi.fn();

    for (const kind of ["recommendation", "brainstorm"] as const) {
      await expect(
        generateStructured({
          system: "Return JSON",
          user: "hi",
          schema,
          costContext: {
            userId: "u1",
            conversationId: "c1",
            kind,
          },
          costGuardDeps: overCapDeps(),
          fetchImpl: fetchImpl as unknown as typeof fetch,
        }),
      ).rejects.toMatchObject({
        code: "cost_limit",
        message: CHAT_FAILURE_COST_LIMIT,
      });
    }
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("skips caps when costContext.enforceCaps is false", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    process.env.CHAT_SESSION_COST_LIMIT_USD = "2";
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: JSON.stringify({ items: ["ok"] }) } }],
      }),
    });

    const result = await generateStructured({
      system: "Return JSON",
      user: "hi",
      schema,
      costContext: {
        userId: "u1",
        conversationId: "c1",
        kind: "suggestion",
        enforceCaps: false,
      },
      costGuardDeps: overCapDeps(),
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(result.items).toEqual(["ok"]);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("calls the provider when costContext is under cap", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    process.env.CHAT_SESSION_COST_LIMIT_USD = "2";
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: JSON.stringify({ items: ["ok"] }) } }],
      }),
    });

    const result = await generateStructured({
      system: "Return JSON",
      user: "hi",
      schema,
      costContext: {
        userId: "u1",
        conversationId: "c1",
        kind: "suggestion",
      },
      costGuardDeps: underCapDeps(),
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(result.items).toEqual(["ok"]);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});
