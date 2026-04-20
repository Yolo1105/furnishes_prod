import { beforeEach, describe, expect, it, vi } from "vitest";
import { uploadStudioChatImageArtifact } from "@/lib/eva-dashboard/chat/studio-chat-image-upload";

describe("uploadStudioChatImageArtifact", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("rejects unsupported mime types without calling the network", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const file = new File([new Uint8Array([1, 2])], "x.bin", {
      type: "application/octet-stream",
    });
    const result = await uploadStudioChatImageArtifact({
      conversationId: "convo-1",
      file,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("unsupported_type");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("runs sign → put → confirm on success", async () => {
    const putUrl = "https://r2.example/presigned";
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.includes("/api/uploads/sign")) {
        return new Response(
          JSON.stringify({
            uploadUrl: putUrl,
            storageKey: "uploads/guest/convo-1/a.jpg",
            publicUrl: "https://cdn.example/a.jpg",
            expiresAt: Date.now() + 60_000,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      if (url === putUrl) {
        expect(init?.method).toBe("PUT");
        return new Response(null, { status: 200 });
      }
      if (url.includes("/api/uploads/confirm")) {
        return new Response(
          JSON.stringify({
            id: "file-row-1",
            url: "https://cdn.example/a.jpg",
            filename: "a.jpg",
            storageKey: "uploads/guest/convo-1/a.jpg",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response("unexpected", { status: 500 });
    });

    const jpegBytes = new Uint8Array([
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00,
    ]);
    const file = new File([jpegBytes], "a.jpg", { type: "image/jpeg" });

    const result = await uploadStudioChatImageArtifact({
      conversationId: "convo-1",
      file,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.fileRecordId).toBe("file-row-1");
      expect(result.url).toContain("https://");
    }
  });
});
