import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

describe("mock auth server policy", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("production: server mock only with ALLOW_MOCK_AUTH, ignores NEXT_PUBLIC", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ALLOW_MOCK_AUTH", undefined);
    vi.stubEnv("NEXT_PUBLIC_MOCK_AUTH", "1");
    const { isMockAuthEnabled } = await import("@/lib/auth/mock-auth");
    expect(isMockAuthEnabled()).toBe(false);
  });

  it("production: ALLOW_MOCK_AUTH enables server mock", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ALLOW_MOCK_AUTH", "1");
    const { isMockAuthEnabled } = await import("@/lib/auth/mock-auth");
    expect(isMockAuthEnabled()).toBe(true);
  });

  it("development: mock enabled without ALLOW_MOCK_AUTH", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("ALLOW_MOCK_AUTH", undefined);
    const { isMockAuthEnabled } = await import("@/lib/auth/mock-auth");
    expect(isMockAuthEnabled()).toBe(true);
  });
});
