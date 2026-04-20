import { describe, expect, it } from "vitest";
import { CLIENT_SURFACE_STUDIO_RAIL } from "@/lib/eva/api/chat-attachment";
import { normalizeChatStudioSnapshotForPost } from "@/lib/eva/chat/studio/normalize-chat-studio-snapshot";

describe("normalizeChatStudioSnapshotForPost", () => {
  it("returns null payload when snapshot omitted", () => {
    const result = normalizeChatStudioSnapshotForPost({
      rawStudioSnapshot: undefined,
      clientSurface: undefined,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.studioSnapshotPayload).toBeNull();
    }
  });

  it("rejects studioSnapshot without Studio rail surface", () => {
    const result = normalizeChatStudioSnapshotForPost({
      rawStudioSnapshot: { sceneLabel: "Test" },
      clientSurface: "other" as never,
    });
    expect(result.ok).toBe(false);
  });

  it("accepts valid snapshot on Studio rail with stable shape", () => {
    const raw = {
      activeProjectId: null,
      room: { roomType: "living room" },
      designIntent: {
        prompt: "cozy seating",
        styleTags: ["modern"],
        constraints: [],
      },
      scene: {
        placedItems: ["sofa"],
        materials: ["wood"],
        colors: ["cream"],
      },
      assets: {
        referenceImages: [],
        generatedImages: [],
      },
      lastUserActions: [],
    };
    const first = normalizeChatStudioSnapshotForPost({
      rawStudioSnapshot: raw,
      clientSurface: CLIENT_SURFACE_STUDIO_RAIL,
    });
    const second = normalizeChatStudioSnapshotForPost({
      rawStudioSnapshot: raw,
      clientSurface: CLIENT_SURFACE_STUDIO_RAIL,
    });
    expect(first.ok && second.ok).toBe(true);
    if (first.ok && second.ok) {
      expect(first.studioSnapshotPayload).toEqual(second.studioSnapshotPayload);
      expect(first.studioSnapshotPayload?.room.roomType).toBe("living room");
    }
  });
});
