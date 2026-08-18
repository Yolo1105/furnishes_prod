import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/server/http", () => ({
  requireApiSession: vi.fn(),
  jsonOk: vi.fn((body: unknown) => {
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }),
}));

vi.mock("@/server/preferences/calibration", () => ({
  computeCalibrationReport: vi.fn(() => []),
  loadCalibrationRows: vi.fn(async (userId: string) => {
    // Prove the route only asks for the session user's rows.
    expect(userId).toBe("session-user");
    return [];
  }),
  loadRestatePendingCounts: vi.fn(async (userId: string) => {
    expect(userId).toBe("session-user");
    return {};
  }),
}));

import { requireApiSession } from "@/server/http";
import { GET } from "@/app/api/account/preferences/calibration/route";

describe("GET /api/account/preferences/calibration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requires a session (ownership boundary)", async () => {
    vi.mocked(requireApiSession).mockResolvedValue({
      session: null,
      response: new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
      }),
    } as never);

    const response = await GET(
      new Request("http://localhost/api/account/preferences/calibration"),
    );
    expect(response.status).toBe(401);
  });

  it("scopes the report to the session user and returns empty gracefully", async () => {
    vi.mocked(requireApiSession).mockResolvedValue({
      session: { user: { id: "session-user" } },
      response: null,
    } as never);

    const response = await GET(
      new Request("http://localhost/api/account/preferences/calibration"),
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as { report: unknown[] };
    expect(body.report).toEqual([]);
  });
});
