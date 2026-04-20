import {
  ATTACHMENT_GROUNDING_SUMMARY_NOTES,
  defaultStructuredAttachmentLabel,
} from "@/lib/eva/chat/attachments/attachment-grounding-prompt";
import type { EnrichedNormalizedAttachment } from "@/lib/eva/chat/attachments/enrich-attachments-with-server-vision";
import type {
  AttachmentGroundingSummary,
  AttachmentGroundingTier,
  PerAttachmentSummary,
} from "@/lib/eva/chat/attachments/attachment-types";
import { isPendingClientAttachmentPhase } from "@/lib/eva/chat/attachments/attachment-readiness";

function tierForNormalized(attachment: EnrichedNormalizedAttachment): {
  tier: AttachmentGroundingTier;
  summaryLine: string;
} {
  if (!attachment.supported) {
    return {
      tier: "unavailable",
      summaryLine: ATTACHMENT_GROUNDING_SUMMARY_NOTES.unsupportedKind,
    };
  }
  if (
    attachment.serverVisionState === "ok" &&
    attachment.serverVisualSummary?.trim()
  ) {
    return {
      tier: "summary_text_only",
      summaryLine: `Server vision analysis (API, not inferred from URL text): ${attachment.serverVisualSummary.trim()}`,
    };
  }
  switch (attachment.effectiveReadiness) {
    case "failed":
      return {
        tier: "unavailable",
        summaryLine: ATTACHMENT_GROUNDING_SUMMARY_NOTES.failedClient,
      };
    case "unsupported":
      return {
        tier: "unavailable",
        summaryLine: ATTACHMENT_GROUNDING_SUMMARY_NOTES.markedUnsupported,
      };
    case "uploaded":
    case "analyzing":
      return {
        tier: "metadata_only",
        summaryLine: ATTACHMENT_GROUNDING_SUMMARY_NOTES.pendingClientAnalysis,
      };
    case "ready": {
      const summary = attachment.analysisSummary?.trim();
      if (summary) {
        return {
          tier: "summary_text_only",
          summaryLine: `${ATTACHMENT_GROUNDING_SUMMARY_NOTES.userDescriptionPrefix} ${summary}`,
        };
      }
      return {
        tier: "metadata_only",
        summaryLine: ATTACHMENT_GROUNDING_SUMMARY_NOTES.noAnalysisText,
      };
    }
    default:
      return {
        tier: "metadata_only",
        summaryLine: ATTACHMENT_GROUNDING_SUMMARY_NOTES.metadataFallback,
      };
  }
}

function aggregateHeader(
  normalized: EnrichedNormalizedAttachment[],
  summaries: PerAttachmentSummary[],
): AttachmentGroundingSummary["responseHeaderValue"] {
  if (summaries.length === 0) return "none";
  const tiers = new Set(summaries.map((s) => s.tier));
  if (tiers.size === 1 && tiers.has("unavailable")) return "unavailable";

  const anyPendingClientPhase = normalized.some(
    (attachment) =>
      attachment.supported &&
      isPendingClientAttachmentPhase(attachment.effectiveReadiness),
  );
  const anySummaryText = summaries.some((s) => s.tier === "summary_text_only");
  const allMetadataOnly = summaries.every((s) => s.tier === "metadata_only");

  if (anyPendingClientPhase && !anySummaryText) return "analyzing_skipped";
  if (anySummaryText) return "partial";
  if (allMetadataOnly) return "metadata_only";
  return "partial";
}

/**
 * Per-attachment honest summaries — server vision wins when present.
 */
export function summarizeChatAttachments(
  normalized: EnrichedNormalizedAttachment[],
): {
  perAttachment: PerAttachmentSummary[];
  responseHeaderValue: AttachmentGroundingSummary["responseHeaderValue"];
  hasUsableGrounding: boolean;
  visualAnalysisPerformed: boolean;
} {
  if (normalized.length === 0) {
    return {
      perAttachment: [],
      responseHeaderValue: "none",
      hasUsableGrounding: false,
      visualAnalysisPerformed: false,
    };
  }

  const perAttachment: PerAttachmentSummary[] = normalized.map(
    (attachment, index) => {
      const { tier, summaryLine } = tierForNormalized(attachment);
      const label =
        attachment.label?.trim() || defaultStructuredAttachmentLabel(index);
      return { label, tier, summaryLine };
    },
  );

  const responseHeaderValue = aggregateHeader(normalized, perAttachment);
  const hasUsableGrounding = perAttachment.some(
    (row) => row.tier === "summary_text_only",
  );
  const visualAnalysisPerformed = normalized.some(
    (row) => row.serverVisionState === "ok",
  );

  return {
    perAttachment,
    responseHeaderValue,
    hasUsableGrounding,
    visualAnalysisPerformed,
  };
}
