import type { ChatAttachmentPayload } from "@/lib/eva/api/chat-attachment";
import {
  ATTACHMENT_DEFAULT_MIME_LABEL,
  ATTACHMENT_GROUNDING_INTRO_LINES,
  defaultStructuredAttachmentLabel,
} from "@/lib/eva/chat/attachments/attachment-grounding-prompt";
import { enrichNormalizedAttachmentsWithServerVision } from "@/lib/eva/chat/attachments/enrich-attachments-with-server-vision";
import type { EnrichedNormalizedAttachment } from "@/lib/eva/chat/attachments/enrich-attachments-with-server-vision";
import type { AttachmentGroundingSummary } from "@/lib/eva/chat/attachments/attachment-types";
import { resolveChatAttachments } from "@/lib/eva/chat/attachments/resolve-chat-attachments";
import { summarizeChatAttachments } from "@/lib/eva/chat/attachments/summarize-chat-attachments";
import type { ChatGenerationLogContext } from "@/lib/eva/server/chat-generation-log";

function buildPromptBlock(
  enriched: EnrichedNormalizedAttachment[],
  summarized: ReturnType<typeof summarizeChatAttachments>,
): string {
  if (enriched.length === 0) return "";

  const lines: string[] = [...ATTACHMENT_GROUNDING_INTRO_LINES];

  for (let index = 0; index < enriched.length; index++) {
    const attachment = enriched[index]!;
    const per = summarized.perAttachment[index];
    const label = per?.label ?? defaultStructuredAttachmentLabel(index);
    const readiness = attachment.effectiveReadiness;
    const mime = attachment.mimeType ?? ATTACHMENT_DEFAULT_MIME_LABEL;
    lines.push(
      `- ${label} [clientReadiness=${readiness}, supported=${attachment.supported}] (${mime})`,
    );
    lines.push(`  URL: ${attachment.url}`);
    if (
      attachment.serverVisionState === "ok" &&
      attachment.serverVisualSummary?.trim()
    ) {
      lines.push(
        `  SERVER_VISION_ANALYSIS: ${attachment.serverVisualSummary.trim()}`,
      );
    }
    if (per) {
      lines.push(`  Grounding tier: ${per.tier}`);
      lines.push(`  Notes: ${per.summaryLine}`);
    }
    lines.push("");
  }

  return lines.join("\n").trimEnd();
}

function groundingFromEnriched(
  enriched: EnrichedNormalizedAttachment[],
): AttachmentGroundingSummary {
  const summarized = summarizeChatAttachments(enriched);
  const promptBlock =
    enriched.length === 0 ? "" : buildPromptBlock(enriched, summarized);

  return {
    promptBlock,
    responseHeaderValue: summarized.responseHeaderValue,
    hasUsableGrounding: summarized.hasUsableGrounding,
    visualAnalysisPerformed: summarized.visualAnalysisPerformed,
  };
}

/**
 * Grounding without server vision — deterministic tests and offline paths.
 */
export function buildAttachmentGroundingSync(
  attachments: ChatAttachmentPayload[],
): AttachmentGroundingSummary {
  const normalized = resolveChatAttachments(attachments);
  const enriched: EnrichedNormalizedAttachment[] = normalized.map((row) => ({
    ...row,
    serverVisionState: "not_attempted",
  }));
  return groundingFromEnriched(enriched);
}

/**
 * Full pipeline: normalize → server vision (when eligible) → prompt block.
 */
export async function buildAttachmentGroundingAsync(
  attachments: ChatAttachmentPayload[],
  chatGenLogCtx: ChatGenerationLogContext,
  abortSignal: AbortSignal,
): Promise<AttachmentGroundingSummary> {
  const normalized = resolveChatAttachments(attachments);
  const enriched = await enrichNormalizedAttachmentsWithServerVision(
    normalized,
    chatGenLogCtx,
    abortSignal,
  );
  return groundingFromEnriched(enriched);
}
