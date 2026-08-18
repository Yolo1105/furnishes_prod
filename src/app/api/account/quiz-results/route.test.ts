import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/server/http", () => ({
  requireApiSession: vi.fn(),
  fromServiceResult: vi.fn(
    (result: { ok: boolean; error?: string; message?: string }) => {
      if (result.ok) {
        return new Response(JSON.stringify(result), { status: 200 });
      }
      return new Response(JSON.stringify(result), { status: 400 });
    },
  ),
  jsonOk: vi.fn(
    (value: unknown) => new Response(JSON.stringify(value), { status: 200 }),
  ),
  jsonError: vi.fn(
    (status: number, code: string, message: string) =>
      new Response(JSON.stringify({ error: code, message }), { status }),
  ),
}));

vi.mock("@/server/auth/rate-limit", () => ({
  consumeRateLimit: vi.fn(),
}));

vi.mock("@/server/preferences/quiz-ingest", () => ({
  ingestQuizResult: vi.fn(),
}));

import { requireApiSession, jsonError } from "@/server/http";
import { consumeRateLimit } from "@/server/auth/rate-limit";
import { ingestQuizResult } from "@/server/preferences/quiz-ingest";
import { POST } from "@/app/api/account/quiz-results/route";

describe("POST /api/account/quiz-results", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(consumeRateLimit).mockResolvedValue({
      allowed: true,
      remaining: 4,
    });
  });

  it("requires a session", async () => {
    vi.mocked(requireApiSession).mockResolvedValue({
      session: null,
      response: new Response("unauthorized", { status: 401 }),
    } as never);
    const response = await POST(
      new Request("http://localhost/api/account/quiz-results", {
        method: "POST",
        body: "{}",
      }),
    );
    expect(response.status).toBe(401);
    expect(ingestQuizResult).not.toHaveBeenCalled();
  });

  it("rejects invalid bodies", async () => {
    vi.mocked(requireApiSession).mockResolvedValue({
      session: { user: { id: "u1" } },
      response: null,
    } as never);
    const response = await POST(
      new Request("http://localhost/api/account/quiz-results", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ version: 2 }),
      }),
    );
    expect(response.status).toBe(400);
    expect(jsonError).toHaveBeenCalled();
    expect(ingestQuizResult).not.toHaveBeenCalled();
  });

  it("ingests for the session user", async () => {
    vi.mocked(requireApiSession).mockResolvedValue({
      session: { user: { id: "u1" } },
      response: null,
    } as never);
    vi.mocked(ingestQuizResult).mockResolvedValue({
      ok: true,
      value: { created: 2, skipped: 1, categories: ["style", "color"] },
    } as never);

    const body = {
      version: 1,
      completedAt: new Date().toISOString(),
      answers: {
        style: { primary: "minimalist", secondary: [] },
        palette: { colors: ["warm linen"], avoid: [] },
        roomFocus: null,
        budgetBand: null,
        lifestyle: [],
        furniture: [],
      },
    };
    const response = await POST(
      new Request("http://localhost/api/account/quiz-results", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      }),
    );
    expect(ingestQuizResult).toHaveBeenCalledWith({
      userId: "u1",
      result: expect.objectContaining({ version: 1 }),
    });
    expect(response.status).toBe(200);
  });
});
