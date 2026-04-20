import type { ConversationArtifactKind } from "@/lib/eva-dashboard/conversation-output-types";

/** Human label for artifact kind (used in tags and descriptions). */
export function artifactKindLabel(kind: ConversationArtifactKind): string {
  switch (kind) {
    case "image":
      return "Image";
    case "pdf":
      return "PDF";
    case "floorplan":
      return "Floorplan";
    case "document":
      return "Document";
    default:
      return "File";
  }
}

/**
 * Derived tags from real fields only (no invented catalog metadata).
 * DB has no tags column yet — these summarize kind + provenance.
 */
export function deriveArtifactTags(
  fileType: ConversationArtifactKind,
  sourceType: "remote" | "upload",
): string[] {
  return [
    artifactKindLabel(fileType),
    sourceType === "upload" ? "Uploaded" : "Linked",
  ];
}

/**
 * One-line description from stored mime, classification, and provenance.
 */
export function deriveArtifactDescription(input: {
  fileType: ConversationArtifactKind;
  mimeType: string | null;
  sourceType: "remote" | "upload";
}): string {
  const kind = artifactKindLabel(input.fileType);
  const mime = input.mimeType?.trim() || "unknown type";
  const origin =
    input.sourceType === "upload" ? "Uploaded asset" : "External link";
  return `${kind} · ${mime} · ${origin}`;
}
