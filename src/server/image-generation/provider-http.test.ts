import { afterEach, describe, expect, it, vi } from "vitest";
import { createHttpProvider } from "./provider-http";

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.IMAGE_GENERATION_API_URL;
  delete process.env.IMAGE_GENERATION_API_KEY;
  delete process.env.IMAGE_GENERATION_MODEL;
});

describe("HTTP image generation provider", () => {
  it("requires URL, key, and model", () => {
    expect(() => createHttpProvider()).toThrow(/requires URL/);
  });

  it("creates a queued job from the provider API", async () => {
    process.env.IMAGE_GENERATION_API_URL = "https://img.example/v1";
    process.env.IMAGE_GENERATION_API_KEY = "key";
    process.env.IMAGE_GENERATION_MODEL = "demo";

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        expect(url).toContain("/generations");
        return new Response(
          JSON.stringify({ jobId: "job-1", status: "queued" }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }),
    );

    const provider = createHttpProvider();
    const result = await provider.create({
      prompt: "calm living room",
      width: 1024,
      height: 1024,
    });
    expect(result).toMatchObject({
      providerJobId: "job-1",
      status: "queued",
    });
  });
});
