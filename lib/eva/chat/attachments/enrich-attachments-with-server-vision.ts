import { generateText } from "ai";
import { OPENAI_PRIMARY_MODEL, openai } from "@/lib/eva/core/openai";
import type { NormalizedAttachment } from "@/lib/eva/chat/attachments/attachment-types";
import {
  logChatGeneration,
  type ChatGenerationLogContext,
} from "@/lib/eva/server/chat-generation-log";

const VISION_TELEMETRY = "chat_attachment_vision_attempt" as const;

function visionModelId(): string {
  return (
    process.env.CHAT_ATTACHMENT_VISION_MODEL?.trim() ?? OPENAI_PRIMARY_MODEL
  );
}

export type ServerVisionState = "ok" | "unavailable" | "not_attempted";

export type EnrichedNormalizedAttachment = NormalizedAttachment & {
  serverVisualSummary?: string;
  serverVisionState: ServerVisionState;
};

/**
 * Run a single vision-capable model pass on each eligible image URL.
 * External boundary: vision API — failures mark `unavailable`, never invent pixels.
 */
async function summarizeImageWithVisionModel(
  imageUrl: string,
  chatGenLogCtx: ChatGenerationLogContext,
  abortSignal: AbortSignal,
): Promise<string | null> {
  const model = visionModelId();
  const result = await generateText({
    model: openai(model),
    abortSignal,
    maxOutputTokens: 400,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Describe this image briefly for an interior-design chat assistant: main subjects, materials/colors if visible, spatial layout cues. If the image is not interior/furniture related, say so. Factual only; no marketing.",
          },
          { type: "image", image: new URL(imageUrl) },
        ],
      },
    ],
  });
  const text = result.text?.trim();
  logChatGeneration("info", VISION_TELEMETRY, chatGenLogCtx, {
    model,
    imageUrlLength: imageUrl.length,
    summaryLength: text?.length ?? 0,
  });
  return text && text.length > 0 ? text : null;
}

function shouldAttemptServerVision(attachment: NormalizedAttachment): boolean {
  if (!attachment.supported || attachment.kind !== "image_url") return false;
  if (
    attachment.effectiveReadiness === "failed" ||
    attachment.effectiveReadiness === "unsupported"
  ) {
    return false;
  }
  if (
    attachment.effectiveReadiness === "uploaded" ||
    attachment.effectiveReadiness === "analyzing"
  ) {
    return false;
  }
  const url = attachment.url;
  return url.startsWith("http://") || url.startsWith("https://");
}

export async function enrichNormalizedAttachmentsWithServerVision(
  attachments: NormalizedAttachment[],
  chatGenLogCtx: ChatGenerationLogContext,
  abortSignal: AbortSignal,
): Promise<EnrichedNormalizedAttachment[]> {
  const out: EnrichedNormalizedAttachment[] = [];
  for (const attachment of attachments) {
    const base: EnrichedNormalizedAttachment = {
      ...attachment,
      serverVisionState: "not_attempted",
    };
    if (!shouldAttemptServerVision(attachment)) {
      out.push(base);
      continue;
    }
    try {
      const summary = await summarizeImageWithVisionModel(
        attachment.url,
        chatGenLogCtx,
        abortSignal,
      );
      if (summary) {
        out.push({
          ...attachment,
          serverVisualSummary: summary,
          serverVisionState: "ok",
        });
      } else {
        out.push({
          ...attachment,
          serverVisionState: "unavailable",
        });
      }
    } catch (error: unknown) {
      logChatGeneration(
        "warn",
        "chat_attachment_vision_failed",
        chatGenLogCtx,
        {
          detail: String(error),
          urlHost: (() => {
            try {
              return new URL(attachment.url).host;
            } catch {
              return "invalid_url";
            }
          })(),
        },
      );
      out.push({
        ...attachment,
        serverVisionState: "unavailable",
      });
    }
  }
  return out;
}
