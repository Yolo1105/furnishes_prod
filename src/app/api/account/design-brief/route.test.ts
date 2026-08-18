import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/server/http", () => ({
  requireApiSession: vi.fn(),
  fromServiceResult: vi.fn(
    (result: { ok: boolean; error?: string }, map?: Record<string, number>) => {
      if (result.ok) {
        return new Response(JSON.stringify(result), { status: 200 });
      }
      const status = map?.[result.error ?? ""] ?? 400;
      return new Response(JSON.stringify(result), { status });
    },
  ),
}));

vi.mock("@/server/design-brief/build-design-brief", () => ({
  getDesignBrief: vi.fn(),
}));

import { requireApiSession } from "@/server/http";
import { getDesignBrief } from "@/server/design-brief/build-design-brief";
import { GET } from "@/app/api/account/design-brief/route";

describe("GET /api/account/design-brief", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requires a session", async () => {
    vi.mocked(requireApiSession).mockResolvedValue({
      session: null,
      response: new Response("unauthorized", { status: 401 }),
    } as never);
    const response = await GET(
      new Request("http://localhost/api/account/design-brief"),
    );
    expect(response.status).toBe(401);
    expect(getDesignBrief).not.toHaveBeenCalled();
  });

  it("passes roomPlanId ownership context to the builder", async () => {
    vi.mocked(requireApiSession).mockResolvedValue({
      session: { user: { id: "u1" } },
      response: null,
    } as never);
    vi.mocked(getDesignBrief).mockResolvedValue({
      ok: true,
      value: {
        version: 1,
        generatedAt: "2026-08-04T00:00:00.000Z",
        userId: "u1",
        roomPlanId: "rp1",
        conversationId: null,
        room: { type: "living room", notes: null },
        style: { primary: "japandi", secondary: [], avoid: [] },
        palette: { colors: [], exclusions: [] },
        budget: { capCents: 500000, currency: "USD", allocated: [] },
        items: [],
        readiness: { score: 40, label: "taking shape" },
        narrative: "A calm living room on budget.",
      },
    });

    const response = await GET(
      new Request("http://localhost/api/account/design-brief?roomPlanId=rp1"),
    );
    expect(getDesignBrief).toHaveBeenCalledWith({
      userId: "u1",
      roomPlanId: "rp1",
    });
    expect(response.status).toBe(200);
  });
});
