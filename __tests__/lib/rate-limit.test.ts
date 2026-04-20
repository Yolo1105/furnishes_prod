import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { strictRateLimit } from "@/lib/rate-limit";

describe("lib/rate-limit (in-memory path)", () => {
  it("allows first request", async () => {
    const r = await strictRateLimit("ip-test-" + Math.random(), {
      requests: 5,
      windowSeconds: 60,
      prefix: "test:rl-" + Math.random(),
    });
    expect(r.success).toBe(true);
    expect(r.remaining).toBe(4);
  });

  it("enforces limit within window", async () => {
    const cfg = {
      requests: 3,
      windowSeconds: 60,
      prefix: "test:rl2-" + Math.random(),
    };
    const key = "ip-limit-" + Math.random();
    await expect(strictRateLimit(key, cfg)).resolves.toMatchObject({
      success: true,
    });
    await expect(strictRateLimit(key, cfg)).resolves.toMatchObject({
      success: true,
    });
    await expect(strictRateLimit(key, cfg)).resolves.toMatchObject({
      success: true,
    });
    await expect(strictRateLimit(key, cfg)).resolves.toMatchObject({
      success: false,
    });
  });

  it("treats different keys independently", async () => {
    const cfg = {
      requests: 2,
      windowSeconds: 60,
      prefix: "test:rl3-" + Math.random(),
    };
    const keyA = "a-" + Math.random();
    const keyB = "b-" + Math.random();
    await expect(strictRateLimit(keyA, cfg)).resolves.toMatchObject({
      success: true,
    });
    await expect(strictRateLimit(keyB, cfg)).resolves.toMatchObject({
      success: true,
    });
    await expect(strictRateLimit(keyA, cfg)).resolves.toMatchObject({
      success: true,
    });
    await expect(strictRateLimit(keyA, cfg)).resolves.toMatchObject({
      success: false,
    });
    await expect(strictRateLimit(keyB, cfg)).resolves.toMatchObject({
      success: true,
    });
  });
});
