/** Single source for default labels and intro copy in attachment grounding prompts. */

export const ATTACHMENT_DEFAULT_MIME_LABEL = "image/*" as const;

export function defaultStructuredAttachmentLabel(index: number): string {
  return `Attachment ${index + 1}`;
}

/** Lines prepended before per-attachment items (honest about vision). */
export const ATTACHMENT_GROUNDING_INTRO_LINES: readonly string[] = [
  "[ATTACHMENTS — structured; the user message text does NOT embed these as raw URLs]",
  "Grounding rules:",
  "- When SERVER_VISION_ANALYSIS appears under an item, that summary was produced by a server vision API on the image URL (not the assistant inferring from the URL string alone).",
  "- User- or client-supplied analysisSummary text is not independently verified unless combined with SERVER_VISION_ANALYSIS.",
  "- If neither SERVER_VISION_ANALYSIS nor user analysis exists, treat the attachment as metadata/URL only for pixels.",
  "",
  "Items:",
];

/** Per-tier notes for `summarize-chat-attachments` (single source; tests may assert substrings). */
export const ATTACHMENT_GROUNDING_SUMMARY_NOTES = {
  unsupportedKind:
    "Unsupported attachment type for this chat path; not used for grounding.",
  failedClient: "Attachment failed client-side; no reliable grounding.",
  markedUnsupported: "Marked unsupported; skipped.",
  pendingClientAnalysis:
    "Still uploading or analyzing on the client — only URL/metadata may be listed; do not infer pixel-level detail.",
  userDescriptionPrefix:
    "User- or client-supplied description (not verified machine vision):",
  noAnalysisText:
    "No analysis text was provided — you only have URL/metadata; do not claim you saw the image pixels.",
  metadataFallback: "Attachment metadata only.",
} as const;
