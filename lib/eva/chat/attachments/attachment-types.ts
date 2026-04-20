/**
 * Server-side attachment grounding — honest about whether pixels were analyzed.
 */

import type {
  AttachmentClientReadiness,
  ChatAttachmentPayload,
} from "@/lib/eva/api/chat-attachment";

export type { AttachmentClientReadiness };

/** What the model can rely on for this attachment. */
export type AttachmentGroundingTier =
  | "metadata_only"
  | "summary_text_only"
  | "unavailable";

export type NormalizedAttachment = ChatAttachmentPayload & {
  /** Effective readiness after server normalization. */
  effectiveReadiness: AttachmentClientReadiness;
  /** Supported for this chat path (image URLs only for now). */
  supported: boolean;
};

export type AttachmentGroundingSummary = {
  /** Block appended to the system prompt (honest about vision). */
  promptBlock: string;
  /**
   * Coarse header for `X-Chat-Attachment-Grounding`:
   * none | metadata_only | partial | unavailable | analyzing_skipped
   */
  responseHeaderValue:
    | "none"
    | "metadata_only"
    | "partial"
    | "unavailable"
    | "analyzing_skipped";
  /** True when any attachment contributed usable (non-empty) grounding text. */
  hasUsableGrounding: boolean;
  /** True when no pixel-level or vision API analysis was performed. */
  visualAnalysisPerformed: boolean;
};

export type PerAttachmentSummary = {
  label: string;
  tier: AttachmentGroundingTier;
  /** One line for the model — never claims vision without analysis. */
  summaryLine: string;
};
