import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/server/http", () => ({
  requireApiSession: vi.fn(),
  fromServiceResult: vi.fn((result: { ok: boolean }) => {
    if (result.ok) return new Response(JSON.stringify(result), { status: 200 });
    return new Response(JSON.stringify(result), { status: 404 });
  }),
  jsonError: vi.fn(
    (status: number, code: string, message: string) =>
      new Response(JSON.stringify({ error: code, message }), { status }),
  ),
}));

vi.mock("@/server/room-plan/service", () => ({
  listRoomPlans: vi.fn(),
  createRoomPlan: vi.fn(),
}));

import { requireApiSession } from "@/server/http";
import { listRoomPlans } from "@/server/room-plan/service";
import { GET } from "@/app/api/account/room-plans/route";

describe("GET /api/account/room-plans", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requires a session", async () => {
    vi.mocked(requireApiSession).mockResolvedValue({
      session: null,
      response: new Response("unauthorized", { status: 401 }),
    } as never);
    const response = await GET(
      new Request("http://localhost/api/account/room-plans"),
    );
    expect(response.status).toBe(401);
    expect(listRoomPlans).not.toHaveBeenCalled();
  });

  it("lists plans for the session user", async () => {
    vi.mocked(requireApiSession).mockResolvedValue({
      session: { user: { id: "u1" } },
      response: null,
    } as never);
    vi.mocked(listRoomPlans).mockResolvedValue({
      ok: true,
      value: { plans: [] },
    });
    const response = await GET(
      new Request("http://localhost/api/account/room-plans"),
    );
    expect(listRoomPlans).toHaveBeenCalledWith({ userId: "u1" });
    expect(response.status).toBe(200);
  });
});
