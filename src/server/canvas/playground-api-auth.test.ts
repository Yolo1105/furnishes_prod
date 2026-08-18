import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/server/http", () => ({
  jsonError: vi.fn((status: number, error: string, message: string) => ({
    status,
    error,
    message,
  })),
  requireApiSession: vi.fn(),
}));

vi.mock("./canvas-playground-enabled", () => ({
  isCanvasPlaygroundEnabled: vi.fn(),
}));

import { requireApiSession } from "@/server/http";
import { isCanvasPlaygroundEnabled } from "./canvas-playground-enabled";
import {
  playgroundRateLimitKey,
  requirePlaygroundApiSession,
} from "./playground-api-auth";

describe("requirePlaygroundApiSession", () => {
  beforeEach(() => {
    vi.mocked(isCanvasPlaygroundEnabled).mockReturnValue(true);
  });

  it("returns disabled when Canvas playground is off", async () => {
    vi.mocked(isCanvasPlaygroundEnabled).mockReturnValue(false);
    const result = await requirePlaygroundApiSession();
    expect(result.session).toBeNull();
    expect(result.response).toMatchObject({ status: 503, error: "disabled" });
    expect(requireApiSession).not.toHaveBeenCalled();
  });

  it("delegates to requireApiSession when enabled", async () => {
    const session = {
      sessionId: "sess-1",
      expiresAt: new Date("2026-12-31"),
      user: {
        id: "u1",
        email: "u1@test.local",
        emailVerifiedAt: new Date("2026-01-01"),
        displayName: null,
        memoryEnabled: true,
        currency: "USD",
        createdAt: new Date("2026-01-01"),
      },
    };
    vi.mocked(requireApiSession).mockResolvedValue({
      session,
      response: null,
    });
    const result = await requirePlaygroundApiSession();
    expect(result.session).toBe(session);
    expect(requireApiSession).toHaveBeenCalledOnce();
  });
});

describe("playgroundRateLimitKey", () => {
  it("scopes by user id", () => {
    expect(playgroundRateLimitKey("abc-123")).toBe("user:abc-123");
  });
});
