import { generateObject, zodSchema } from "ai";
import { openai } from "@/lib/eva/core/openai";
import { z } from "zod";
import { prisma } from "@/lib/eva/db";
import { getFieldIds, getFieldLabel } from "@/lib/eva/domain/fields";
import { expandMessageVocabulary } from "@/lib/eva/extraction/vocabulary";
import { detectNegations } from "@/lib/eva/extraction/negation";
import { extractIndirectPreferences } from "@/lib/eva/extraction/semantic-inference";
import { checkContradiction } from "@/lib/eva/extraction/contradiction";
import { normalizeValue } from "@/lib/eva/extraction/normalize";
import {
  detectUncertainty,
  adjustConfidenceForUncertainty,
  UncertaintyLevel,
} from "@/lib/eva/extraction/uncertainty";
import {
  classifyMessageIntent,
  shouldSkipExtraction,
} from "@/lib/eva/extraction/classifier";
import { shouldRejectGenericPreferenceValue } from "@/lib/eva/extraction/topic-labels";
import {
  detectStateChangeIntent,
  createStateChangeUpdate,
} from "@/lib/eva/extraction/state-change";
import {
  applyVerifierToEntities,
  type EntityWithEvidence,
} from "@/lib/eva/extraction/verifier";
import { getCalibratedConfidence } from "@/lib/eva/extraction/calibration";
import { reviewExtractionsForSidebar } from "@/lib/eva/extraction/field-review";
import { applyStyleColorRoutingHeuristics } from "@/lib/eva/extraction/field-routing-heuristics";
import { detectImplicitSignals } from "@/lib/eva/feedback/implicit-signals";
import {
  getOpenAIKey,
  OPENAI_KEY_MISSING_MESSAGE,
  withFallback,
  OPENAI_PRIMARY_MODEL,
  OPENAI_FALLBACK_MODEL,
  computeCost,
  toUsageLike,
} from "@/lib/eva/core/openai";
import { recordCost } from "@/lib/eva/core/cost-logger";
import { log } from "@/lib/eva/core/logger";
import {
  checkCostLimit,
  checkGlobalDailyCostLimit,
} from "@/lib/eva/core/cost-tracker";
import {
  strictRateLimit,
  rateLimitError,
  EVA_EXTRACT_LIMITS,
} from "@/lib/rate-limit";
import { logSecurityEvent } from "@/lib/eva/core/security-logger";
import { apiError, ErrorCodes } from "@/lib/eva/api/error";
import { requireConversationAccess } from "@/lib/eva/auth/helpers";
import { getActiveNode } from "@/lib/eva/playbook/runtime";
import { clientIdentityFromRequest } from "@/lib/api/identity";
import {
  ClientMessageSourceSchema,
  shouldSkipExtractionFromClientMeta,
} from "@/lib/eva/api/client-message-meta";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const ExtractRequestSchema = z.object({
  messageId: z.string().optional().nullable(),
  content: z.string(),
  conversationId: z.string(),
  /** When true (e.g. quick-suggestion chip), do not run extraction or persist preferences. */
  skipExtraction: z.boolean().optional(),
  /** Hint from the client for analytics / routing; `quick_suggestion` skips extraction. */
  messageSource: ClientMessageSourceSchema.optional(),
});

const EvidenceSpanSchema = z.object({
  start: z.number(),
  end: z.number(),
  text: z.string(),
});

type EntityShape = Record<string, z.ZodTypeAny>;
let _extractionSchema: z.ZodObject<{
  entities: z.ZodArray<z.ZodObject<EntityShape>>;
}> | null = null;

function getExtractionSchema(): z.ZodObject<{
  entities: z.ZodArray<z.ZodObject<EntityShape>>;
}> {
  if (!_extractionSchema) {
    const fieldIds = getFieldIds();
    const tuple = (fieldIds.length > 0 ? fieldIds : ["roomType"]) as [
      string,
      ...string[],
    ];
    const fieldEnum = z.enum(tuple);
    _extractionSchema = z.object({
      entities: z.array(
        z.object({
          text: z.string(),
          field: fieldEnum,
          confidence: z.number().min(0).max(1),
          evidenceSpans: z.array(EvidenceSpanSchema),
        }),
      ),
    });
  }
  return _extractionSchema;
}

/** Narrow runtime shape from `generateObject` (dynamic zod enum → loose typing). */
type ExtractEntity = {
  text: string;
  field: string;
  confidence: number;
  evidenceSpans: Array<{ start: number; end: number; text: string }>;
  needsConfirmation?: boolean;
  confirmMessage?: string;
};

export async function POST(req: Request) {
  const clientIdentity = clientIdentityFromRequest(req);

  const extractLimit = await strictRateLimit(
    clientIdentity,
    EVA_EXTRACT_LIMITS,
  );
  if (!extractLimit.success) {
    logSecurityEvent({
      type: "rate_limit",
      clientIp: clientIdentity.replace(/^ip:/, ""),
      details: "extract",
    });
    const err = rateLimitError(extractLimit);
    return apiError(ErrorCodes.RATE_LIMITED, err.message, 429);
  }

  if (!getOpenAIKey()) {
    return apiError(
      ErrorCodes.LLM_UNAVAILABLE,
      OPENAI_KEY_MISSING_MESSAGE,
      503,
    );
  }
  const body = await req.json();
  const parsed = ExtractRequestSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(
      ErrorCodes.VALIDATION_ERROR,
      "Invalid request",
      400,
      parsed.error.flatten(),
    );
  }
  const { messageId, content, conversationId, skipExtraction, messageSource } =
    parsed.data;

  const access = await requireConversationAccess(conversationId, req);
  if (access.error) {
    return apiError(
      access.status === 404 ? ErrorCodes.NOT_FOUND : ErrorCodes.FORBIDDEN,
      access.error,
      access.status,
    );
  }

  if (messageId) {
    const msg = await prisma.message.findFirst({
      where: { id: messageId, conversationId },
      select: { id: true },
    });
    if (!msg) {
      return apiError(ErrorCodes.NOT_FOUND, "Message not found", 404);
    }
  }

  const skipFromClient = shouldSkipExtractionFromClientMeta(
    messageSource,
    skipExtraction,
  );
  const { intent } = classifyMessageIntent(content);
  if (skipFromClient || shouldSkipExtraction(intent)) {
    if (skipFromClient) {
      log({
        level: "info",
        event: "extract_skipped_by_client",
        conversationId,
        messageSource: messageSource ?? null,
      });
    }
    if (messageId) {
      await prisma.message.update({
        where: { id: messageId },
        data: { extractions: [] },
      });
    }
    return Response.json({ entities: [] });
  }

  const globalCost = await checkGlobalDailyCostLimit();
  if (!globalCost.allowed) {
    logSecurityEvent({
      type: "global_cost_limit_hit",
      clientIp: clientIdentity.replace(/^ip:/, ""),
      currentCost: globalCost.currentCost,
      limit: globalCost.limit,
    });
    return apiError(
      ErrorCodes.RATE_LIMITED,
      "Daily usage limit reached. Please try again later.",
      429,
    );
  }

  const sessionCost = await checkCostLimit(conversationId);
  if (!sessionCost.allowed) {
    logSecurityEvent({
      type: "cost_limit_hit",
      clientIp: clientIdentity.replace(/^ip:/, ""),
      conversationId,
      details: "extract",
    });
    return apiError(
      ErrorCodes.RATE_LIMITED,
      `This conversation has reached its usage limit ($${sessionCost.limit}). Please start a new conversation.`,
      429,
    );
  }

  // ── Playbook: get extraction focus from active node ────────────────
  const playbookResult = await getActiveNode(conversationId);
  const extractionFocus = playbookResult.config?.extractionFocus ?? null;
  const focusContext =
    extractionFocus && extractionFocus.length > 0
      ? ` Priority fields for this conversation phase: ${extractionFocus.join(", ")}. Give these fields higher confidence when evidence supports them.`
      : "";

  const expandedContent = expandMessageVocabulary(content);
  const negationResult = detectNegations(content);
  const inferredOutcomes = extractIndirectPreferences(content);
  const inferredContext =
    Object.keys(inferredOutcomes).length > 0
      ? ` Inferred from outcome language: ${JSON.stringify(inferredOutcomes)}`
      : "";
  const negationContext =
    negationResult.hasNegation && negationResult.negatedTerms.length > 0
      ? ` Detected negations (things user does NOT want): ${negationResult.negatedTerms.join(", ")}. Include relevant ones in the exclusion field.`
      : "";

  const enrichedPrompt = `Extract interior design preferences from this USER message only. Only extract what the user explicitly stated. Set confidence below 0.7 for ambiguous mentions.
Known vocabulary expansions applied to message where relevant: prefer standard terms (e.g. mid-century modern not mcm, scandinavian not scandi).${negationContext}${inferredContext}${focusContext}

Field routing (required):
- roomType: which room they are designing (e.g. living room, bedroom).
- style: named design aesthetics only (e.g. scandinavian, industrial, minimalist, coastal, mid-century modern). Do NOT use style for color palettes, paint, coordinating colors, or hue topics.
- color: colors, palettes, paint, walls, accents, neutrals, earth tones, "blue and gold", etc.
- budget: money amounts or budget language.
- furniture: pieces, seating, storage, layout needs.
- exclusion: things they do not want.

For each entity you extract, include evidenceSpans: array of { start, end, text } where start/end are 0-based character indices in the Message below for the exact substring that supports this value. Only extract values that are literally stated; if the value is inferred rather than stated, omit that entity or set low confidence and omit evidenceSpans for it.

Message: "${expandedContent}"`;

  const schema = getExtractionSchema();
  const result = await withFallback(
    () =>
      generateObject({
        model: openai(OPENAI_PRIMARY_MODEL),
        schema: zodSchema(schema),
        prompt: enrichedPrompt,
        maxRetries: 3,
      }),
    () =>
      generateObject({
        model: openai(OPENAI_FALLBACK_MODEL),
        schema: zodSchema(schema),
        prompt: enrichedPrompt,
        maxRetries: 2,
      }),
  );
  const { object } = result;
  if (conversationId && result.usage) {
    const usage = toUsageLike(result.usage);
    const model = OPENAI_PRIMARY_MODEL;
    const costUsd = computeCost(usage, model);
    void recordCost(
      conversationId,
      model,
      usage.promptTokens ?? 0,
      usage.completionTokens ?? 0,
      costUsd,
      "auxiliary",
    );
  }

  let entities: ExtractEntity[] = [...(object.entities as ExtractEntity[])];

  entities = applyVerifierToEntities(
    entities as EntityWithEvidence[],
    content,
  ) as ExtractEntity[];

  if (negationResult.hasNegation && negationResult.negatedTerms.length > 0) {
    const existingExclusions = entities
      .filter((e) => e.field === "exclusion")
      .map((e) => e.text.toLowerCase());
    const toAdd = negationResult.negatedTerms.filter(
      (t) => !existingExclusions.some((e) => e.includes(t.toLowerCase())),
    );
    if (toAdd.length > 0) {
      entities.push({
        text: toAdd.join(", "),
        field: "exclusion",
        confidence: negationResult.confidence,
        evidenceSpans: [],
      });
    }
  }

  for (const entity of entities) {
    const [normalized] = normalizeValue(entity.text);
    entity.text = Array.isArray(normalized)
      ? normalized.join(", ")
      : normalized;
  }

  for (const entity of entities) {
    const v = entity.text.trim().toLowerCase();
    const fid = entity.field.toLowerCase();
    if (v === fid || (fid === "color" && (v === "color" || v === "colors"))) {
      const phrase = content.trim();
      entity.text =
        phrase.length > 0 && phrase.length < 120
          ? phrase
          : `Discussing ${getFieldLabel(entity.field)}`;
      entity.confidence = Math.min(entity.confidence, 0.55);
    }
  }

  entities = applyStyleColorRoutingHeuristics(entities);

  const uncertainty = detectUncertainty(content);
  if (uncertainty.hasUncertainty && uncertainty.level !== null) {
    for (const entity of entities) {
      entity.confidence = adjustConfidenceForUncertainty(
        entity.confidence,
        uncertainty.level,
        uncertainty.confidenceAdjustment,
      );
    }
  }

  entities = await reviewExtractionsForSidebar(
    content,
    entities,
    conversationId,
  );

  const entitiesBeforeTopicFilter = entities.length;
  entities = entities.filter(
    (e) => !shouldRejectGenericPreferenceValue(e.field, e.text, content),
  );
  if (entities.length < entitiesBeforeTopicFilter) {
    log({
      level: "info",
      event: "extract_filtered_generic_topic_labels",
      conversationId,
      removedCount: entitiesBeforeTopicFilter - entities.length,
    });
  }

  for (const entity of entities) {
    entity.confidence = await getCalibratedConfidence(
      entity.field,
      entity.confidence,
    );
  }

  const currentPrefsList = await prisma.preference.findMany({
    where: { conversationId },
  });
  const currentPrefs: Record<string, string> = {};
  for (const p of currentPrefsList) currentPrefs[p.field] = p.value;

  const recentMessages = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "desc" },
    take: 10,
  });
  const recentContents = recentMessages
    .filter((m: { role: string }) => m.role === "user")
    .map((m: { content: string | null }) => m.content ?? "");

  const stateChangeUpdates: Array<{
    field: string;
    value: string;
    oldValue: string | null;
    changeType: "set" | "update";
  }> = [];

  const stateChange = detectStateChangeIntent(content);
  if (stateChange.hasChange && stateChange.changeType) {
    const { updates } = createStateChangeUpdate(
      stateChange,
      currentPrefs,
      recentContents,
    );
    for (const { field, value } of updates) {
      const existing = currentPrefs[field];
      stateChangeUpdates.push({
        field,
        value,
        oldValue: existing ?? null,
        changeType: existing ? "update" : "set",
      });
      currentPrefs[field] = value;
    }
  }

  for (const entity of entities) {
    const contradictionResult = checkContradiction(
      currentPrefs,
      entity.field,
      entity.text,
      content,
    );
    if (contradictionResult.hasConflict && !contradictionResult.allowUpdate) {
      (
        entity as { needsConfirmation?: boolean; confirmMessage?: string }
      ).needsConfirmation = true;
      (entity as { confirmMessage?: string }).confirmMessage =
        contradictionResult.confirmMessage;
    }
  }

  const recentForSignals = recentMessages.map(
    (m: { role: string; content: string | null }) => ({
      role: m.role,
      content: m.content ?? "",
    }),
  );
  const implicitSignals = detectImplicitSignals(
    content,
    currentPrefs,
    recentForSignals,
  );

  const proposals: Array<{
    field: string;
    value: string;
    previousValue: string | null;
    confidence: number;
    needsConfirmation: boolean;
    changeId: string;
  }> = [];

  await prisma.$transaction(
    async (tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0]) => {
      for (const u of stateChangeUpdates) {
        await tx.preferenceChange.create({
          data: {
            conversationId,
            field: u.field,
            oldValue: u.oldValue,
            newValue: u.value,
            confidence: 1,
            changeType: u.changeType,
            sourceMessageId: messageId ?? null,
          },
        });
        await tx.preference.upsert({
          where: { conversationId_field: { conversationId, field: u.field } },
          create: {
            conversationId,
            field: u.field,
            value: u.value,
            confidence: 1,
            status: "confirmed",
          },
          update: { value: u.value, confidence: 1, status: "confirmed" },
        });
      }

      if (messageId) {
        await tx.message.update({
          where: { id: messageId },
          data: {
            extractions: entities as unknown as Prisma.InputJsonValue,
          },
        });
      }
      for (const entity of entities) {
        if (entity.needsConfirmation) continue;
        if (
          uncertainty.level === UncertaintyLevel.EXPLORATORY ||
          entity.confidence <= 0
        )
          continue;
        const existing = currentPrefs[entity.field];
        const changeType = existing ? "update" : "set";
        const created = await tx.preferenceChange.create({
          data: {
            conversationId,
            field: entity.field,
            oldValue: existing ?? null,
            newValue: entity.text,
            confidence: entity.confidence,
            changeType,
            sourceMessageId: messageId ?? null,
          },
        });
        const needsConfirmation = entity.confidence < 0.85 || !!existing;
        proposals.push({
          field: entity.field,
          value: entity.text,
          previousValue: existing ?? null,
          confidence: entity.confidence,
          needsConfirmation,
          changeId: created.id,
        });
        await tx.preference.upsert({
          where: {
            conversationId_field: { conversationId, field: entity.field },
          },
          create: {
            conversationId,
            field: entity.field,
            value: entity.text,
            confidence: entity.confidence,
            status:
              entity.confidence > 0.85
                ? "confirmed"
                : entity.confidence > 0.6
                  ? "potential"
                  : "inferred",
            source: messageId ?? undefined,
          },
          update: {
            value: entity.text,
            confidence: entity.confidence,
            status:
              entity.confidence > 0.85
                ? "confirmed"
                : entity.confidence > 0.6
                  ? "potential"
                  : "inferred",
            source: messageId ?? undefined,
          },
        });
      }
    },
  );

  for (const signal of implicitSignals) {
    if (messageId) {
      await prisma.messageFeedback.create({
        data: {
          messageId,
          rating: "implicit",
          comment: signal.comment,
        },
      });
    }
  }

  return Response.json({ entities, proposals });
}
