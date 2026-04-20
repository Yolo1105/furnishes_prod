import { describe, expect, it } from "vitest";
import { ChatAttachmentSchema } from "@/lib/eva/api/chat-attachment";
import { ATTACHMENT_GROUNDING_INTRO_LINES } from "@/lib/eva/chat/attachments/attachment-grounding-prompt";
import { buildAttachmentGroundingSync } from "@/lib/eva/chat/attachments/build-attachment-context";
import { resolveChatAttachments } from "@/lib/eva/chat/attachments/resolve-chat-attachments";

describe("ChatAttachmentSchema", () => {
  it("accepts a valid image_url payload with lifecycle fields", () => {
    const parsed = ChatAttachmentSchema.safeParse({
      kind: "image_url",
      url: "https://example.com/a.jpg",
      mimeType: "image/jpeg",
      label: "Test",
      clientReadiness: "ready",
      localId: "abc",
      fileRecordId: "cm123file",
      analysisSummary: "Warm oak tones.",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.fileRecordId).toBe("cm123file");
    }
  });

  it("rejects invalid URLs", () => {
    const parsed = ChatAttachmentSchema.safeParse({
      kind: "image_url",
      url: "not-a-url",
    });
    expect(parsed.success).toBe(false);
  });
});

describe("resolveChatAttachments", () => {
  it("marks non-image mime types as unsupported", () => {
    const normalized = resolveChatAttachments([
      {
        kind: "image_url",
        url: "https://example.com/f.pdf",
        mimeType: "application/pdf",
        clientReadiness: "ready",
      },
    ]);
    expect(normalized[0]?.supported).toBe(false);
    expect(normalized[0]?.effectiveReadiness).toBe("unsupported");
  });
});

describe("buildAttachmentGroundingSync", () => {
  it("uses metadata-only honest wording when ready but no analysis text", () => {
    const grounding = buildAttachmentGroundingSync([
      {
        kind: "image_url",
        url: "https://example.com/x.png",
        clientReadiness: "ready",
        label: "Room",
      },
    ]);
    expect(grounding.responseHeaderValue).toBe("metadata_only");
    expect(grounding.promptBlock).toContain(
      ATTACHMENT_GROUNDING_INTRO_LINES[2],
    );
    expect(grounding.promptBlock).toContain("No analysis text was provided");
    expect(grounding.hasUsableGrounding).toBe(false);
    expect(grounding.visualAnalysisPerformed).toBe(false);
  });

  it("marks partial when analysisSummary is present", () => {
    const grounding = buildAttachmentGroundingSync([
      {
        kind: "image_url",
        url: "https://example.com/x.png",
        clientReadiness: "ready",
        analysisSummary: "Blue sofa visible.",
      },
    ]);
    expect(grounding.responseHeaderValue).toBe("partial");
    expect(grounding.hasUsableGrounding).toBe(true);
    expect(grounding.promptBlock).toContain(
      "User- or client-supplied description",
    );
  });

  it("surfaces analyzing state without implying vision", () => {
    const grounding = buildAttachmentGroundingSync([
      {
        kind: "image_url",
        url: "https://example.com/x.png",
        clientReadiness: "analyzing",
      },
    ]);
    expect(grounding.responseHeaderValue).toBe("analyzing_skipped");
    expect(grounding.promptBlock).toContain("uploading or analyzing");
  });
});
