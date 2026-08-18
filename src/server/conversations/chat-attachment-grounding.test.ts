import { afterEach, describe, expect, it, vi } from "vitest";
import {
  formatAttachedImagesBlock,
  groundOwnedUploads,
  truncateVisionSummary,
} from "./chat-attachment-grounding";

describe("truncateVisionSummary", () => {
  it("keeps short text", () => {
    expect(truncateVisionSummary("  Navy sofa  ")).toBe("Navy sofa");
  });

  it("caps at 600 characters", () => {
    const long = "a".repeat(700);
    const out = truncateVisionSummary(long);
    expect(out.length).toBeLessThanOrEqual(600);
    expect(out.endsWith("…")).toBe(true);
  });
});

describe("formatAttachedImagesBlock", () => {
  it("returns empty for no items", () => {
    expect(formatAttachedImagesBlock([])).toBe("");
  });

  it("includes intro and per-image summaries", () => {
    const block = formatAttachedImagesBlock([
      {
        label: "room.jpg",
        mimeType: "image/jpeg",
        summary: "Navy sectional, warm wood floor.",
      },
    ]);
    expect(block).toContain("Attached images");
    expect(block).toContain("Attachment 1 (room.jpg, image/jpeg)");
    expect(block).toContain("Navy sectional");
  });
});

describe("groundOwnedUploads", () => {
  afterEach(() => {
    delete process.env.OPENAI_API_KEY;
    delete process.env.CHAT_VISION_MODEL;
  });

  it("includes vision analysis when the API returns text", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    process.env.CHAT_VISION_MODEL = "gpt-4o-mini";
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: "Navy sectional, warm wood floor.",
            },
          },
        ],
      }),
    });

    const result = await groundOwnedUploads({
      userId: "u1",
      conversationId: "c1",
      uploads: [
        {
          id: "up1",
          filename: "room.jpg",
          mimeType: "image/jpeg",
          storageKey: "u1/room.jpg",
        },
      ],
      fetchImpl: fetchImpl as unknown as typeof fetch,
      getObject: async () => ({
        bytes: new Uint8Array([1, 2, 3]),
        mimeType: "image/jpeg",
      }),
    });

    expect(result.visionOkCount).toBe(1);
    expect(result.promptBlock).toContain("Navy sectional");
    expect(result.promptBlock).toContain("Attached images");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("degrades when vision fails", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({}),
    });

    const result = await groundOwnedUploads({
      userId: "u1",
      conversationId: "c1",
      uploads: [
        {
          id: "up1",
          filename: "room.jpg",
          mimeType: "image/jpeg",
          storageKey: "u1/room.jpg",
        },
      ],
      fetchImpl: fetchImpl as unknown as typeof fetch,
      getObject: async () => ({
        bytes: new Uint8Array([1, 2, 3]),
        mimeType: "image/jpeg",
      }),
    });

    expect(result.visionOkCount).toBe(0);
    expect(result.promptBlock).toContain(
      "(image attached; analysis unavailable)",
    );
  });

  it("degrades when storage read throws", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    const result = await groundOwnedUploads({
      userId: "u1",
      conversationId: "c1",
      uploads: [
        {
          id: "up1",
          filename: "room.jpg",
          mimeType: "image/jpeg",
          storageKey: "missing",
        },
      ],
      fetchImpl: vi.fn() as unknown as typeof fetch,
      getObject: async () => {
        throw new Error("missing");
      },
    });
    expect(result.promptBlock).toContain(
      "(image attached; analysis unavailable)",
    );
    expect(result.visionOkCount).toBe(0);
  });
});
