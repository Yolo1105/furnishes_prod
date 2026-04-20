import type { AttachmentClientReadiness } from "@/lib/eva/api/chat-attachment";

/** Client has not finished upload/analysis — URL/metadata only for grounding. */
export function isPendingClientAttachmentPhase(
  readiness: AttachmentClientReadiness,
): boolean {
  return readiness === "uploaded" || readiness === "analyzing";
}
