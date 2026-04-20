import { generateObject, zodSchema } from "ai";
import { z } from "zod";
import { prisma } from "@/lib/eva/db";
import { requireConversationAccess } from "@/lib/eva/auth/helpers";
import { apiError, ErrorCodes } from "@/lib/eva/api/error";
import { getPreferencesAsRecord } from "@/lib/eva/api/helpers";
import { getDomainConfig } from "@/lib/eva/domain/config";
import {
  getOpenAIKey,
  withFallback,
  openai,
  OPENAI_PRIMARY_MODEL,
  OPENAI_FALLBACK_MODEL,
  computeCost,
  toUsageLike,
} from "@/lib/eva/core/openai";
import { recordCost } from "@/lib/eva/core/cost-logger";
import { gradeRecommendationItem } from "@/lib/eva/quality/recommendation-rubric";
import { buildProjectIntelligenceContext } from "@/lib/eva/intelligence/project-intelligence-context";
import { formatProjectIntelligenceForRecommendationsPrompt } from "@/lib/eva/intelligence/project-memory-prompt";
import { INTELLIGENCE_LIMITS } from "@/lib/eva/intelligence/intelligence-constants";
import { rankRecommendationsWithProjectContext } from "@/lib/eva/intelligence/recommendation-ranking";
import { stableRecommendationItemId } from "@/lib/eva/recommendations/stable-recommendation-id";
import type {
  ConversationRecommendationsPayload,
  NormalizedRecommendationItem,
  RecommendationsMetaState,
} from "@/lib/eva-dashboard/conversation-output-types";

export const dynamic = "force-dynamic";

/**
 * Response contract:
 * - 200 with `meta.state` not `ok` → intentional empty (disabled, no API key, insufficient prefs).
 * - 200 with `meta.state === "ok"` → generation completed (items may still be empty; see Recommendations view).
 * - 503 → LLM/rubric generation failed — never folded into a 200 empty body.
 */
const RecommendationsSchema = z.object({
  items: z.array(
    z.object({
      title: z.string(),
      summary: z.string().nullable().optional(),
      category: z.string(),
      reasonWhyItFits: z.string(),
      relatedPreferences: z.array(z.string()).optional().default([]),
      estimated_price: z.number().nullable(),
      discussionPrompt: z.string().optional(),
      imageUrl: z.string().nullable().optional(),
    }),
  ),
  suggestions: z.array(z.string()),
  budget_breakdown: z.record(z.string(), z.unknown()),
});

function emptyPayload(
  state: RecommendationsMetaState,
  message?: string,
): ConversationRecommendationsPayload {
  return {
    items: [],
    suggestions: [],
    budget_breakdown: {},
    meta: { state, message },
  };
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { error, status } = await requireConversationAccess(id, req);
  if (error) {
    return apiError(
      status === 404 ? ErrorCodes.NOT_FOUND : ErrorCodes.FORBIDDEN,
      error,
      status,
    );
  }
  const preferences = await getPreferencesAsRecord(prisma, id);

  const domainConfig = getDomainConfig();
  const recCfg = (domainConfig.recommendations ?? {}) as {
    max_items?: number;
    enabled?: boolean;
    rubric_enabled?: boolean;
  };
  const maxItems = recCfg.max_items ?? 10;
  if (recCfg.enabled === false) {
    return Response.json(
      emptyPayload(
        "disabled",
        "Recommendations are disabled in domain configuration.",
      ),
    );
  }
  if (!getOpenAIKey()) {
    return Response.json(
      emptyPayload(
        "llm_unconfigured",
        "Recommendations require the AI service to be configured.",
      ),
    );
  }

  const prefKeys = Object.keys(preferences).filter(
    (k) => String(preferences[k] ?? "").trim().length > 0,
  );
  if (prefKeys.length === 0) {
    return Response.json(
      emptyPayload(
        "insufficient_preferences",
        "Add room, style, or budget preferences in chat first.",
      ),
    );
  }

  try {
    const convoMeta = await prisma.conversation.findUnique({
      where: { id },
      select: { projectId: true },
    });
    const messageCount = await prisma.message.count({
      where: { conversationId: id },
    });

    let intelCtx: Awaited<
      ReturnType<typeof buildProjectIntelligenceContext>
    > | null = null;
    if (convoMeta?.projectId) {
      intelCtx = await buildProjectIntelligenceContext(
        prisma,
        convoMeta.projectId,
        {
          userMessage: "",
          messageCount,
          preferences,
        },
      );
    }

    const prefsStr = JSON.stringify(preferences, null, 0);
    let prompt = `You are an interior design partner helping someone choose directions—not a catalog.

Speak in plain language. For each direction, briefly explain tradeoffs (e.g. cost vs durability, openness vs coziness) when useful, and tie reasoning to the preferences below.

Preferences (JSON):
${prefsStr}`;

    if (intelCtx) {
      prompt += `\n\n${formatProjectIntelligenceForRecommendationsPrompt(intelCtx)}`;
    }

    prompt += `

Return:
- "items": up to ${maxItems} objects, each with:
  - "title": short product or direction name
  - "summary": optional one-line summary (or null)
  - "category": e.g. seating, lighting, storage
  - "reasonWhyItFits": one or two conversational sentences (preference tie-in; optional short tradeoff)
  - "relatedPreferences": array of preference field keys or short labels this relates to
  - "estimated_price": number in USD or null if unknown
  - "discussionPrompt": one sentence the user could paste to continue in chat
  - "imageUrl": null unless you are certain (usually null)
- "suggestions": short strings for follow-up ideas
- "budget_breakdown": object with category keys and amount, range string, or notes`;

    const result = await withFallback(
      () =>
        generateObject({
          model: openai(OPENAI_PRIMARY_MODEL),
          schema: zodSchema(RecommendationsSchema),
          prompt,
          maxRetries: 3,
        }),
      () =>
        generateObject({
          model: openai(OPENAI_FALLBACK_MODEL),
          schema: zodSchema(RecommendationsSchema),
          prompt,
          maxRetries: 2,
        }),
    );
    const { object } = result;
    if (result.usage) {
      const u = toUsageLike(result.usage);
      const costUsd = computeCost(u, OPENAI_PRIMARY_MODEL);
      void recordCost(
        id,
        OPENAI_PRIMARY_MODEL,
        u.promptTokens ?? 0,
        u.completionTokens ?? 0,
        costUsd,
      );
    }
    let itemsRaw = (object.items ?? []).slice(0, maxItems);
    const recCfgRubric = (
      domainConfig.recommendations as { rubric_enabled?: boolean }
    )?.rubric_enabled;
    if (recCfgRubric && itemsRaw.length > 0) {
      itemsRaw = await Promise.all(
        itemsRaw.map(async (item) => {
          const forRubric = {
            name: item.title,
            category: item.category,
            why_it_fits: item.reasonWhyItFits,
            estimated_price: item.estimated_price,
          };
          const graded = await gradeRecommendationItem(forRubric, preferences);
          return {
            ...item,
            reasonWhyItFits: graded.why_it_fits,
          };
        }),
      );
    }

    const reasonPreview =
      INTELLIGENCE_LIMITS.discussionPromptReasonPreviewChars;
    const itemsDraft: NormalizedRecommendationItem[] = itemsRaw.map(
      (item, i) => {
        const discussionPrompt =
          item.discussionPrompt?.trim() ||
          `I'd like to explore "${item.title}" further — ${item.reasonWhyItFits.slice(0, reasonPreview)}`;
        return {
          id: stableRecommendationItemId(id, item.title, item.category),
          title: item.title,
          summary: item.summary ?? null,
          reasonWhyItFits: item.reasonWhyItFits,
          category: item.category,
          relatedPreferences: item.relatedPreferences ?? [],
          estimatedPrice: item.estimated_price,
          rank: i + 1,
          imageUrl: item.imageUrl ?? null,
          discussionPrompt,
        };
      },
    );

    const { items: ranked } = rankRecommendationsWithProjectContext(
      itemsDraft,
      intelCtx,
    );

    const items: NormalizedRecommendationItem[] = ranked.map((it, i) => {
      const rawMatch = itemsRaw.find(
        (r) => r.title === it.title && r.category === it.category,
      );
      const discussionPrompt =
        rawMatch?.discussionPrompt?.trim() ||
        `I'd like to explore "${it.title}" further — ${it.reasonWhyItFits.slice(0, reasonPreview)}`;
      return {
        ...it,
        discussionPrompt,
        rank: i + 1,
      };
    });

    const payload: ConversationRecommendationsPayload = {
      items,
      suggestions: object.suggestions ?? [],
      budget_breakdown: (object.budget_breakdown ??
        {}) as ConversationRecommendationsPayload["budget_breakdown"],
      meta: {
        state: "ok",
        projectRankingApplied: Boolean(intelCtx),
      },
    };
    return Response.json(payload);
  } catch (e) {
    return apiError(
      ErrorCodes.LLM_UNAVAILABLE,
      e instanceof Error ? e.message : "Failed to generate recommendations",
      503,
    );
  }
}
