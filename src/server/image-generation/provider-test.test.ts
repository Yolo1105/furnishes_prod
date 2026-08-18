import { beforeEach, describe, expect, it } from "vitest";
import {
  createTestProvider,
  resetTestProviderJobs,
  TEST_PNG_BYTES,
} from "./provider-test";

describe("test image generation provider", () => {
  beforeEach(() => {
    resetTestProviderJobs();
  });

  it("returns ready immediately for test-ready", async () => {
    const provider = createTestProvider();
    const created = await provider.create({
      prompt: "test-ready living room",
      width: 1024,
      height: 1024,
    });
    expect(created.status).toBe("ready");
    expect(created.imageBytes?.byteLength).toBeGreaterThan(0);
    expect(created.mimeType).toBe("image/png");
  });

  it("fails for test-fail", async () => {
    const provider = createTestProvider();
    const created = await provider.create({
      prompt: "test-fail now",
      width: 768,
      height: 768,
    });
    expect(created.status).toBe("failed");
  });

  it("delays then becomes ready after refresh", async () => {
    const provider = createTestProvider();
    const created = await provider.create({
      prompt: "test-delayed room",
      width: 768,
      height: 768,
    });
    expect(created.status).toBe("queued");
    const first = await provider.getStatus(created.providerJobId);
    expect(first.status).toBe("generating");
    const second = await provider.getStatus(created.providerJobId);
    expect(second.status).toBe("ready");
    expect(second.imageBytes?.[0]).toBe(TEST_PNG_BYTES[0]);
  });

  it("cancels generating jobs", async () => {
    const provider = createTestProvider();
    const created = await provider.create({
      prompt: "test-cancel room",
      width: 768,
      height: 768,
    });
    expect(created.status).toBe("generating");
    await provider.cancel?.(created.providerJobId);
    const status = await provider.getStatus(created.providerJobId);
    expect(status.status).toBe("canceled");
  });
});
