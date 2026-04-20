import type { ChatAttachmentPayload } from "@/lib/eva/api/chat-attachment";
import { buildAttachmentGroundingAsync } from "@/lib/eva/chat/attachments/build-attachment-context";
import type { AttachmentGroundingSummary } from "@/lib/eva/chat/attachments/attachment-types";
import {
  lookupDesignRule,
  planLayout,
  parseRoomDimensions,
  parseLayoutOpenings,
} from "@/lib/eva/design-rules";
import { retrieveRelevant } from "@/lib/eva/rag/retriever";
import { buildRetrievalPromptSection } from "@/lib/eva/chat/grounding/build-chat-grounding";
import {
  RAG_DEFAULT_TOP_K,
  RAG_RELEVANCE_FLOOR,
} from "@/lib/eva/rag/rag-retrieval-constants";
import type {
  RetrieveForChatResult,
  RetrievalQualityLevel,
} from "@/lib/eva/rag/retrieval-types";
import type { ChatGenerationLogContext } from "@/lib/eva/server/chat-generation-log";

const LAYOUT_KEYWORDS = [
  "layout",
  "arrange",
  "where should i put",
  "where to put",
  "placement",
  "floor plan",
] as const;

/**
 * Structured attachment + retrieval + layout signals before merging into the system prompt.
 */
export type ChatGroundingLayers = {
  attachmentGrounding: AttachmentGroundingSummary;
  retrievalQuality: RetrievalQualityLevel;
  rag: RetrieveForChatResult | null;
  /** Serialized RAG section for the system prompt (empty when RAG disabled). */
  retrievalPromptAppendix: string;
  designRuleAppendix: string | null;
  layoutAppendix: string | null;
};

/**
 * Attachment grounding (async), RAG retrieval, optional design-rule and layout fragments.
 */
export async function buildChatGroundingLayers(parameters: {
  attachmentList: ChatAttachmentPayload[];
  chatGenLogCtx: ChatGenerationLogContext;
  abortSignal: AbortSignal;
  message: string;
  prefRecord: Record<string, string>;
  nodeConfig: {
    designRulesEnabled?: boolean;
    ragEnabled?: boolean;
  };
}): Promise<ChatGroundingLayers> {
  const {
    attachmentList,
    chatGenLogCtx,
    abortSignal,
    message,
    prefRecord,
    nodeConfig,
  } = parameters;

  const attachmentGrounding = await buildAttachmentGroundingAsync(
    attachmentList,
    chatGenLogCtx,
    abortSignal,
  );

  let retrievalQuality: RetrievalQualityLevel = "none";
  let rag: RetrieveForChatResult | null = null;
  let retrievalPromptAppendix = "";

  if (nodeConfig.ragEnabled !== false) {
    rag = await retrieveRelevant(
      message,
      RAG_DEFAULT_TOP_K,
      RAG_RELEVANCE_FLOOR,
    );
    retrievalQuality = rag.quality;
    retrievalPromptAppendix = buildRetrievalPromptSection({
      quality: rag.quality,
      hits: rag.hits,
      topCosineBelowThreshold: rag.topCosineBelowThreshold,
    });
  }

  let designRuleAppendix: string | null = null;
  if (nodeConfig.designRulesEnabled !== false) {
    const designRule = lookupDesignRule(message);
    if (designRule) {
      designRuleAppendix = `[DESIGN RULE] Use these exact numbers when answering: ${designRule}`;
    }
  }

  let layoutAppendix: string | null = null;
  const wantsLayout =
    nodeConfig.designRulesEnabled !== false &&
    LAYOUT_KEYWORDS.some((keyword) => message.toLowerCase().includes(keyword));

  if (wantsLayout) {
    const parsedDims = parseRoomDimensions(message);
    const roomW =
      prefRecord.roomWidth ??
      (parsedDims != null ? String(parsedDims.widthInches / 12) : null);
    const roomL =
      prefRecord.roomLength ??
      (parsedDims != null ? String(parsedDims.lengthInches / 12) : null);
    if (roomW && roomL) {
      const widthInches =
        typeof roomW === "string" ? parseFloat(roomW) * 12 : Number(roomW) * 12;
      const lengthInches =
        typeof roomL === "string" ? parseFloat(roomL) * 12 : Number(roomL) * 12;
      if (widthInches > 0 && lengthInches > 0) {
        const openings = parseLayoutOpenings(message);
        const options = planLayout({
          roomWidthInches: widthInches,
          roomLengthInches: lengthInches,
          doors: openings.doors,
          windows: openings.windows,
          closets: openings.closets,
        });
        const layoutText = options
          .map(
            (opt, index) =>
              `Option ${index + 1}: ${opt.rationale} Placements: ${opt.placements.map((placement) => `${placement.piece} on ${placement.position.wall} wall`).join("; ")}.`,
          )
          .join(" ");
        layoutAppendix = `[LAYOUT OPTIONS] Present these placement options naturally: ${layoutText}`;
      }
    }
  }

  return {
    attachmentGrounding,
    retrievalQuality,
    rag,
    retrievalPromptAppendix,
    designRuleAppendix,
    layoutAppendix,
  };
}
