import { describe, expect, it } from "vitest";
import { minimalStudioSnapshotFixture } from "@/__tests__/fixtures/minimal-studio-snapshot";
import { buildChatPostBodySchema } from "@/lib/eva/chat/request/parse-chat-request";
import { CLIENT_SURFACE_STUDIO_RAIL } from "@/lib/eva/api/chat-attachment";
import { StudioSnapshotSchema } from "@/lib/eva/studio/studio-snapshot-schema";

describe("buildChatPostBodySchema", () => {
  const schema = buildChatPostBodySchema(10_000);

  it("accepts studioSnapshot with studio_rail surface", () => {
    const snap = StudioSnapshotSchema.parse({
      ...minimalStudioSnapshotFixture,
    });
    const parsed = schema.safeParse({
      message: "Hello",
      clientSurface: CLIENT_SURFACE_STUDIO_RAIL,
      studioSnapshot: snap,
    });
    expect(parsed.success).toBe(true);
  });

  it("accepts message with structured attachments", () => {
    const snap = StudioSnapshotSchema.parse({
      ...minimalStudioSnapshotFixture,
    });
    const parsed = schema.safeParse({
      message: "What do you think?",
      clientSurface: CLIENT_SURFACE_STUDIO_RAIL,
      studioSnapshot: snap,
      attachments: [
        {
          kind: "image_url",
          url: "https://example.com/a.jpg",
          clientReadiness: "ready",
        },
      ],
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.attachments?.[0]?.url).toContain("example.com");
    }
  });
});
