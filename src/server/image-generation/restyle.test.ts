import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildRestyleStylePrompt } from "./restyle";

describe("buildRestyleStylePrompt", () => {
  it("pins room structure and uses the design brief as intent source", () => {
    const prompt = buildRestyleStylePrompt({
      brief: {
        style: { primary: "japandi", secondary: ["scandi"] },
        palette: { colors: ["walnut", "cream"] },
        items: [
          { label: "low sofa", status: "decided" },
          { label: "lamp", status: "idea" },
        ],
      },
      styleDirection: "softer evening light",
    });
    expect(prompt).toMatch(/walls, windows, doors, geometry, and camera/i);
    expect(prompt).toMatch(/japandi/i);
    expect(prompt).toMatch(/walnut/i);
    expect(prompt).toMatch(/low sofa/i);
    expect(prompt).not.toMatch(/\blamp\b/);
    expect(prompt).toMatch(/softer evening light/i);
  });
});

vi.mock("@/server/db", () => ({
  prisma: {
    conversation: { findFirst: vi.fn() },
    imageGeneration: { count: vi.fn(), create: vi.fn(), findFirst: vi.fn() },
    upload: { create: vi.fn() },
  },
}));

vi.mock("@/server/uploads/service", () => ({
  getOwnedUpload: vi.fn(),
  readUploadBytes: vi.fn(),
}));

vi.mock("@/server/ops/cost-guard", () => ({
  checkCostAllowance: vi.fn(async () => ({ allowed: true })),
  recordCost: vi.fn(async () => undefined),
}));

vi.mock("@/server/storage/private-storage", () => ({
  getPrivateStorage: () => ({
    putObject: vi.fn(async () => undefined),
  }),
}));

vi.mock("@/server/design-brief/build-design-brief", () => ({
  isDesignBriefEnabled: vi.fn(() => false),
  getDesignBrief: vi.fn(),
}));

import { prisma } from "@/server/db";
import { getOwnedUpload, readUploadBytes } from "@/server/uploads/service";
import { TEST_PNG_BYTES } from "./provider-test";
import { createConversationRender } from "./restyle";

describe("createConversationRender", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CHAT_RENDERS_ENABLED = "1";
    process.env.IMAGE_RESTYLE_PROVIDER = "test";
    vi.mocked(prisma.conversation.findFirst).mockResolvedValue({
      id: "c1",
      projectId: null,
    } as never);
    vi.mocked(prisma.imageGeneration.count).mockResolvedValue(0);
    vi.mocked(prisma.imageGeneration.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.imageGeneration.create).mockResolvedValue({
      id: "g1",
    } as never);
    vi.mocked(prisma.upload.create).mockResolvedValue({ id: "out1" } as never);
    vi.mocked(getOwnedUpload).mockResolvedValue({
      id: "up1",
      status: "ready",
      mimeType: "image/png",
      storageKey: "k",
    } as never);
    vi.mocked(readUploadBytes).mockResolvedValue(Buffer.from(TEST_PNG_BYTES));
  });

  it("returns disabled when flag is off", async () => {
    process.env.CHAT_RENDERS_ENABLED = "0";
    const result = await createConversationRender({
      userId: "u1",
      conversationId: "c1",
      uploadId: "up1",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("disabled");
  });

  it("creates a restyle when enabled", async () => {
    const result = await createConversationRender({
      userId: "u1",
      conversationId: "c1",
      uploadId: "up1",
      styleDirection: "warmer walnut",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.outputUploadId).toBe("out1");
    expect(result.value.stylePrompt).toMatch(/\[restyle\]/);
    expect(result.value.structureCheck).toBeNull();
  });

  it("returns the prior generation for a duplicate clientRenderId", async () => {
    vi.mocked(prisma.imageGeneration.findFirst).mockResolvedValue({
      id: "g-prior",
      outputUploadId: "out-prior",
      prompt: "[restyle] prior",
      structureCheck: { sameStructure: true, confidence: 0.9 },
    } as never);
    const result = await createConversationRender({
      userId: "u1",
      conversationId: "c1",
      uploadId: "up1",
      clientRenderId: "render-key-1",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.generationId).toBe("g-prior");
    expect(result.value.outputUploadId).toBe("out-prior");
    expect(result.value.structureCheck).toEqual({
      sameStructure: true,
      confidence: 0.9,
    });
    expect(prisma.imageGeneration.create).not.toHaveBeenCalled();
  });
});
