import { z } from "zod";
import { prisma } from "@/server/db";
import { err, ok, type ServiceResult } from "@/server/result";
import {
  CostLimitError,
  generateStructured,
} from "@/server/structured-output/generate-structured";
import { getConfirmedPreferenceMap } from "@/server/preferences/preference-service";
import { createInspirationItem } from "@/server/inspiration/inspiration-service";
import { CHAT_FAILURE_COST_LIMIT } from "@/server/conversations/chat-copy";
import { logChatOperationalEvent } from "@/server/conversations/chat-ops";
import {
  buildProjectMemoryContext,
  isChatProjectMemoryEnabled,
} from "@/server/projects/project-memory";
import { formatProjectMemoryPrompt } from "@/server/projects/project-memory-prompt";
import {
  rankRecommendationsWithProjectContext,
  type RecommendationItem,
  type RecommendationRankingContext,
} from "./ranking";
import { gradeRecommendationItems } from "./rubric";
import { stableRecommendationItemId } from "./stable-recommendation-id";
import {
  listActiveRecommendations,
  markRecommendationSaved,
  upsertRecommendationRows,
  findRecommendationForUser,
} from "./repository";
import { itemsMissingUserFactCitation } from "./explain-validation";

export const GeneratedSchema = z.object({
  items: z
    .array(
      z.object({
        title: z.string().min(1),
        summary: z.string().nullable().optional(),
        category: z.string().min(1),
        reasonWhyItFits: z.string().min(1),
        relatedPreferences: z.array(z.string()).default([]),
        estimatedPrice: z.number().nullable().optional(),
        priceBandUsd: z
          .object({ min: z.number(), max: z.number() })
          .nullable()
          .optional(),
        specs: z.array(z.string()).default([]),
        alternatives: z.array(z.string()).default([]),
        discussionPrompt: z.string().nullable().optional(),
      }),
    )
    .min(1)
    .max(8),
});

function isSideFeaturesEnabled(): boolean {
  return process.env.CHAT_SIDE_FEATURES_ENABLED === "1";
}

function recommendationSystemPrompt(projectMemoryAppendix: string): string {
  return `You are Eva recommending interior-design archetypes (piece + specs + price band).
Never invent Product SKUs or shopping links.
EXPLAIN: every reasonWhyItFits MUST reference at least one confirmed user fact (style, palette/color value, budget band, room, or stated constraint) in plain language — never generic praise.
Return JSON: {"items":[{"title","summary","category","reasonWhyItFits","relatedPreferences","estimatedPrice","priceBandUsd","specs","alternatives","discussionPrompt"}]}`.concat(
    projectMemoryAppendix,
  );
}

async function generateRecommendationItems(input: {
  userId: string;
  conversationId: string;
  prefs: Record<string, string>;
  transcript: string;
  projectMemoryAppendix: string;
  reinforceExplain?: boolean;
}): Promise<z.infer<typeof GeneratedSchema>> {
  const explainReinforce = input.reinforceExplain
    ? `\nRETRY: Prior reasons lacked user-fact citations. Each reasonWhyItFits must literally mention at least one of: ${Object.values(
        input.prefs,
      )
        .filter(Boolean)
        .join(", ")}.`
    : "";
  return generateStructured({
    system:
      recommendationSystemPrompt(input.projectMemoryAppendix) +
      explainReinforce,
    user: JSON.stringify({
      preferences: input.prefs,
      transcript: input.transcript,
    }),
    schema: GeneratedSchema,
    costContext: {
      userId: input.userId,
      conversationId: input.conversationId,
      kind: "recommendation",
    },
  });
}

function rowToItem(row: {
  stableId: string;
  rank: number;
  payload: unknown;
}): RecommendationItem {
  const p = (row.payload ?? {}) as Record<string, unknown>;
  const explanationFactors = Array.isArray(p.explanationFactors)
    ? p.explanationFactors.filter((x): x is string => typeof x === "string")
    : null;
  const fitScore = typeof p.fitScore === "number" ? p.fitScore : null;
  return {
    id: row.stableId,
    title: typeof p.title === "string" ? p.title : "Recommendation",
    summary: typeof p.summary === "string" ? p.summary : null,
    reasonWhyItFits:
      typeof p.rationale === "string"
        ? p.rationale
        : typeof p.reasonWhyItFits === "string"
          ? p.reasonWhyItFits
          : "",
    category: typeof p.category === "string" ? p.category : "general",
    relatedPreferences: Array.isArray(p.relatedPreferences)
      ? p.relatedPreferences.filter((x): x is string => typeof x === "string")
      : [],
    estimatedPrice:
      typeof p.estimatedPrice === "number" ? p.estimatedPrice : null,
    rank: row.rank,
    discussionPrompt:
      typeof p.discussionPrompt === "string" ? p.discussionPrompt : null,
    specs: Array.isArray(p.specs)
      ? p.specs.filter((x): x is string => typeof x === "string")
      : [],
    alternatives: Array.isArray(p.alternatives)
      ? p.alternatives.filter((x): x is string => typeof x === "string")
      : [],
    priceBandUsd:
      p.priceBandUsd &&
      typeof p.priceBandUsd === "object" &&
      !Array.isArray(p.priceBandUsd)
        ? (p.priceBandUsd as { min: number; max: number })
        : null,
    ...(explanationFactors ? { explanationFactors } : {}),
    ...(fitScore != null ? { fitScore } : {}),
  };
}

async function buildRankingContext(
  userId: string,
  conversationId: string,
  confirmed: Record<string, string | null>,
): Promise<RecommendationRankingContext> {
  const inspiration = await prisma.inspirationItem.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    take: 20,
    select: { title: true },
  });
  const prior = await listActiveRecommendations(conversationId);
  const constraints: string[] = [];
  for (const [key, value] of Object.entries(confirmed)) {
    if (value?.trim()) constraints.push(`${key}: ${value.trim()}`);
  }
  return {
    acceptedConstraints: constraints,
    preferredPathItemTitles: [],
    preferredPathNotes: null,
    preferredDirectionLabel: confirmed.style ?? null,
    shortlistProductNames: inspiration
      .map((i) => i.title)
      .filter((t): t is string => Boolean(t?.trim())),
    priorRecommendationTitles: prior.map((r) => rowToItem(r).title),
  };
}

export async function listConversationRecommendations(input: {
  userId: string;
  conversationId: string;
}): Promise<
  ServiceResult<{ items: RecommendationItem[] }, "not_found" | "disabled">
> {
  if (!isSideFeaturesEnabled()) {
    return err("disabled", "Side features are disabled.");
  }
  const conversation = await prisma.conversation.findFirst({
    where: { id: input.conversationId, userId: input.userId },
    select: { id: true },
  });
  if (!conversation) return err("not_found", "Conversation not found.");
  const rows = await listActiveRecommendations(input.conversationId);
  return ok({ items: rows.map(rowToItem) });
}

export async function regenerateConversationRecommendations(input: {
  userId: string;
  conversationId: string;
}): Promise<
  ServiceResult<
    { items: RecommendationItem[] },
    | "not_found"
    | "disabled"
    | "provider_unavailable"
    | "validation"
    | "cost_limit"
  >
> {
  if (!isSideFeaturesEnabled()) {
    return err("disabled", "Side features are disabled.");
  }
  const conversation = await prisma.conversation.findFirst({
    where: { id: input.conversationId, userId: input.userId },
    select: {
      id: true,
      projectId: true,
      messages: {
        orderBy: { createdAt: "asc" },
        take: 30,
        select: { role: true, content: true },
      },
    },
  });
  if (!conversation) return err("not_found", "Conversation not found.");

  const confirmed = await getConfirmedPreferenceMap(input.userId);
  const prefs = Object.fromEntries(
    Object.entries(confirmed).filter(([, v]) => v != null),
  ) as Record<string, string>;
  if (Object.keys(prefs).length === 0 && conversation.messages.length < 2) {
    return err(
      "validation",
      "Add a few preferences or messages before generating recommendations.",
    );
  }

  const transcript = conversation.messages
    .map((m) => `${m.role}: ${m.content}`)
    .join("\n")
    .slice(0, 6000);

  let projectMemoryAppendix = "";
  if (isChatProjectMemoryEnabled() && conversation.projectId) {
    const memory = await buildProjectMemoryContext({
      projectId: conversation.projectId,
      userId: input.userId,
      excludeConversationId: input.conversationId,
    });
    if (memory) {
      projectMemoryAppendix = `\n\n${formatProjectMemoryPrompt(memory, "recommendations")}`;
    }
  }

  let generated: z.infer<typeof GeneratedSchema>;
  try {
    generated = await generateRecommendationItems({
      userId: input.userId,
      conversationId: input.conversationId,
      prefs,
      transcript,
      projectMemoryAppendix,
    });

    const missing = itemsMissingUserFactCitation(generated.items, prefs);
    if (missing > 0) {
      logChatOperationalEvent({
        event: "recommendation_explain_retry",
        userId: input.userId,
        conversationId: input.conversationId,
        retryItemCount: missing,
        outcome: "retry_once",
      });
      generated = await generateRecommendationItems({
        userId: input.userId,
        conversationId: input.conversationId,
        prefs,
        transcript,
        projectMemoryAppendix,
        reinforceExplain: true,
      });
    }
  } catch (error) {
    if (error instanceof CostLimitError) {
      return err("cost_limit", CHAT_FAILURE_COST_LIMIT);
    }
    return err(
      "provider_unavailable",
      "Recommendations are temporarily unavailable.",
    );
  }

  const gradedWhys = await gradeRecommendationItems(
    generated.items.map((raw) => ({
      name: raw.title,
      category: raw.category,
      why_it_fits: raw.reasonWhyItFits,
      estimated_price: raw.estimatedPrice ?? null,
    })),
    prefs,
    { userId: input.userId, conversationId: input.conversationId },
  );
  const graded: RecommendationItem[] = generated.items.map((raw, index) => ({
    id: stableRecommendationItemId(
      input.conversationId,
      raw.title,
      raw.category,
    ),
    title: raw.title,
    summary: raw.summary ?? null,
    reasonWhyItFits: gradedWhys[index]?.why_it_fits ?? raw.reasonWhyItFits,
    category: raw.category,
    relatedPreferences: raw.relatedPreferences ?? [],
    estimatedPrice: raw.estimatedPrice ?? null,
    rank: 0,
    discussionPrompt: raw.discussionPrompt ?? null,
    specs: raw.specs ?? [],
    alternatives: raw.alternatives ?? [],
    priceBandUsd: raw.priceBandUsd ?? null,
  }));

  const ctx = await buildRankingContext(
    input.userId,
    input.conversationId,
    confirmed,
  );
  const ranked = rankRecommendationsWithProjectContext(graded, ctx);
  await upsertRecommendationRows({
    conversationId: input.conversationId,
    items: ranked.items,
  });
  return ok({ items: ranked.items });
}

/**
 * Save a recommendation archetype onto the Inspiration Board (board replaces shortlist).
 */
export async function saveRecommendationToInspiration(input: {
  userId: string;
  conversationId: string;
  stableId: string;
}): Promise<
  ServiceResult<
    { inspirationId: string },
    "not_found" | "disabled" | "validation"
  >
> {
  if (!isSideFeaturesEnabled()) {
    return err("disabled", "Side features are disabled.");
  }
  const row = await findRecommendationForUser(input);
  if (!row) return err("not_found", "Recommendation not found.");
  const item = rowToItem(row);
  const created = await createInspirationItem(input.userId, {
    title: item.title,
    note: item.reasonWhyItFits,
    roomLabel: item.category,
    colors: [],
    materials: item.specs?.slice(0, 6) ?? [],
    noteOnly: true,
  });
  if (!created.ok) {
    return err("validation", created.message ?? "Could not save inspiration.");
  }
  await markRecommendationSaved({
    conversationId: input.conversationId,
    stableId: input.stableId,
  });
  return ok({ inspirationId: created.value.id });
}
