import {
  AttachmentClientReadinessSchema,
  type ChatAttachmentPayload,
} from "@/lib/eva/api/chat-attachment";
import type {
  AttachmentClientReadiness,
  NormalizedAttachment,
} from "@/lib/eva/chat/attachments/attachment-types";

const SUPPORTED_IMAGE_MIME_PREFIXES = ["image/"];

function mimeSupported(mimeType: string | undefined): boolean {
  if (!mimeType || mimeType.trim() === "") return true;
  const lower = mimeType.toLowerCase();
  return SUPPORTED_IMAGE_MIME_PREFIXES.some((prefix) =>
    lower.startsWith(prefix),
  );
}

/**
 * Normalize client readiness: missing → `ready` (legacy clients).
 */
function readinessFromPayload(
  attachment: ChatAttachmentPayload,
): AttachmentClientReadiness {
  const parsed = AttachmentClientReadinessSchema.safeParse(
    attachment.clientReadiness,
  );
  return parsed.success ? parsed.data : "ready";
}

/**
 * Validate and normalize attachment list for chat grounding.
 */
export function resolveChatAttachments(
  attachments: ChatAttachmentPayload[],
): NormalizedAttachment[] {
  const out: NormalizedAttachment[] = [];
  for (const attachment of attachments) {
    const supported =
      attachment.kind === "image_url" && mimeSupported(attachment.mimeType);
    const effectiveReadiness: AttachmentClientReadiness = supported
      ? readinessFromPayload(attachment)
      : "unsupported";
    out.push({
      ...attachment,
      effectiveReadiness,
      supported,
    });
  }
  return out;
}
