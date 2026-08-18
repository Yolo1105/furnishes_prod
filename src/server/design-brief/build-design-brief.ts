/**
 * Assemble DesignBriefV1 from preferences + optional RoomPlan + Eva narrative.
 */

import { z } from "zod";
import type { DesignBriefV1 } from "@/lib/contracts/design-brief";
import { prisma } from "@/server/db";
import { err, ok, type ServiceResult } from "@/server/result";
import { getConfirmedPreferenceMap } from "@/server/preferences/preference-service";
import {
  CostLimitError,
  generateStructured,
  StructuredGenerationError,
} from "@/server/structured-output/generate-structured";
import { CHAT_FAILURE_COST_LIMIT } from "@/server/conversations/chat-copy";
import { computeReadiness } from "@/server/room-plan/readiness";

export function isDesignBriefEnabled(): boolean {
  return process.env.DESIGN_BRIEF_ENABLED === "1";
}

const NarrativeSchema = z.object({
  narrative: z.string(),
});

export function isDesignBriefChatIntent(message: string): boolean {
  const lower = message.trim().toLowerCase();
  if (!lower) return false;
  return (
    /\bmy brief\b/.test(lower) ||
    /\bdesign brief\b/.test(lower) ||
    /\bsummarize my (design )?plan\b/.test(lower) ||
    /\bsummary of my (design |room )?plan\b/.test(lower) ||
    /\bexport (my )?brief\b/.test(lower)
  );
}

function fallbackNarrative(input: {
  roomType: string | null;
  style: string | null;
  budgetLabel: string | null;
  readinessLabel: string;
  strongestConstraint: string | null;
}): string {
  const room = input.roomType ?? "room";
  const style = input.style ?? "your chosen direction";
  const constraint =
    input.strongestConstraint ??
    input.budgetLabel ??
    "the constraints you already shared";
  return `You're shaping a ${room} around ${style}, staying true to ${constraint}. The plan is currently ${input.readinessLabel} — keep deciding core pieces before accents, and I'll keep every suggestion tied to what you've already locked in.`;
}

async function writeNarrative(input: {
  userId: string;
  conversationId?: string | null;
  facts: Record<string, unknown>;
  fetchImpl?: typeof fetch;
}): Promise<string> {
  try {
    const result = await generateStructured({
      system: `You write Eva's design-brief narrative. Summarize the design intent in the user's own terms; name the strongest constraint and the chosen direction; no filler. Return JSON {"narrative":"..."} with 3–5 plain sentences.`,
      user: JSON.stringify(input.facts),
      schema: NarrativeSchema,
      temperature: 0.3,
      costContext: {
        userId: input.userId,
        conversationId: input.conversationId ?? null,
        kind: "brief",
      },
      ...(input.fetchImpl ? { fetchImpl: input.fetchImpl } : {}),
    });
    const narrative = result.narrative.trim();
    return (
      narrative ||
      fallbackNarrative({
        roomType: null,
        style: null,
        budgetLabel: null,
        readinessLabel: "in progress",
        strongestConstraint: null,
      })
    );
  } catch (error) {
    if (error instanceof CostLimitError) throw error;
    if (
      error instanceof StructuredGenerationError &&
      error.code === "cost_limit"
    ) {
      throw error;
    }
    return fallbackNarrative({
      roomType:
        typeof input.facts.roomType === "string" ? input.facts.roomType : null,
      style:
        typeof input.facts.stylePrimary === "string"
          ? input.facts.stylePrimary
          : null,
      budgetLabel:
        typeof input.facts.budgetLabel === "string"
          ? input.facts.budgetLabel
          : null,
      readinessLabel:
        typeof input.facts.readinessLabel === "string"
          ? input.facts.readinessLabel
          : "in progress",
      strongestConstraint:
        typeof input.facts.strongestConstraint === "string"
          ? input.facts.strongestConstraint
          : null,
    });
  }
}

async function loadOwnedRoomPlan(
  userId: string,
  roomPlanId: string,
): Promise<{
  id: string;
  currency: string;
  budgetCapCents: number | null;
  items: Array<{
    label: string;
    category: string;
    priority: string;
    status: string;
    budgetCents: number | null;
    actualCents: number | null;
    notes: string | null;
  }>;
  readiness: { score: number; label: string };
} | null> {
  const plan = await prisma.roomPlan.findFirst({
    where: { id: roomPlanId, userId },
    include: { items: { orderBy: { sortOrder: "asc" } } },
  });
  if (!plan) return null;

  const prefs = await getConfirmedPreferenceMap(userId);
  const readiness = computeReadiness({
    plan: {
      budgetCapCents: plan.budgetCapCents,
      items: plan.items.map((item) => ({
        label: item.label,
        priority: item.priority,
        status: item.status,
        budgetCents: item.budgetCents,
        actualCents: item.actualCents,
      })),
    },
    styleConfirmed: Boolean(prefs.style?.trim()),
    colorConfirmed: Boolean(prefs.color?.trim()),
  });

  return {
    id: plan.id,
    currency: plan.currency,
    budgetCapCents: plan.budgetCapCents,
    items: plan.items.map((item) => ({
      label: item.label,
      category: item.category,
      priority: item.priority,
      status: item.status,
      budgetCents: item.budgetCents,
      actualCents: item.actualCents,
      notes: item.notes,
    })),
    readiness: { score: readiness.score, label: readiness.label },
  };
}

/**
 * Build a DesignBriefV1 for the Design page / API / chat intent.
 * Flag-gated by DESIGN_BRIEF_ENABLED.
 */
export async function getDesignBrief(input: {
  userId: string;
  roomPlanId?: string | null;
  conversationId?: string | null;
  /** Skip LLM narrative (tests / degraded). */
  skipNarrative?: boolean;
  fetchImpl?: typeof fetch;
}): Promise<
  ServiceResult<
    DesignBriefV1,
    | "disabled"
    | "not_found"
    | "forbidden"
    | "cost_limit"
    | "provider_unavailable"
  >
> {
  if (!isDesignBriefEnabled()) {
    return err("disabled", "Design brief is disabled.");
  }

  const [prefs, styleProfile, budget] = await Promise.all([
    getConfirmedPreferenceMap(input.userId),
    prisma.styleProfile.findUnique({
      where: { userId: input.userId },
      select: { styleWords: true, roomDimensions: true },
    }),
    prisma.budget.findUnique({
      where: { userId: input.userId },
      select: { minimum: true, maximum: true, currency: true },
    }),
  ]);

  let roomPlanId = input.roomPlanId ?? null;
  if (!roomPlanId) {
    const latest = await prisma.roomPlan.findFirst({
      where: { userId: input.userId },
      orderBy: { updatedAt: "desc" },
      select: { id: true },
    });
    roomPlanId = latest?.id ?? null;
  }

  let planItems: DesignBriefV1["items"] = [];
  let allocated: DesignBriefV1["budget"]["allocated"] = [];
  let capCents: number | null = null;
  let currency = budget?.currency?.trim() || "SGD";
  let readiness = { score: 0, label: "exploring" };

  if (roomPlanId) {
    const plan = await loadOwnedRoomPlan(input.userId, roomPlanId);
    if (!plan) {
      if (input.roomPlanId) {
        return err("not_found", "Room plan not found.");
      }
      roomPlanId = null;
    } else {
      currency = plan.currency || currency;
      capCents = plan.budgetCapCents;
      planItems = plan.items.map((item) => ({
        label: item.label,
        category: item.category,
        priority: item.priority,
        status: item.status,
        specsNote: item.notes,
      }));
      allocated = plan.items
        .map((item) => ({
          label: item.label,
          cents: item.actualCents ?? item.budgetCents ?? 0,
        }))
        .filter((row) => row.cents > 0);
      readiness = {
        score: plan.readiness.score,
        label: plan.readiness.label,
      };
    }
  }

  if (!roomPlanId) {
    const prefOnly = computeReadiness({
      plan: { budgetCapCents: null, items: [] },
      styleConfirmed: Boolean(prefs.style?.trim()),
      colorConfirmed: Boolean(prefs.color?.trim()),
    });
    readiness = { score: prefOnly.score, label: prefOnly.label };
  }

  if (capCents == null && budget?.maximum != null) {
    const max = budget.maximum;
    capCents = max > 100_000 ? Math.round(max) : Math.round(max * 100);
  }

  const styleWords = styleProfile?.styleWords
    ?.split(/[,|/]/)
    .map((part) => part.trim())
    .filter(Boolean);

  const secondary = (styleWords ?? []).filter(
    (word) => word.toLowerCase() !== (prefs.style ?? "").trim().toLowerCase(),
  );

  const colors = prefs.color?.trim() ? [prefs.color.trim()] : [];
  const strongestConstraint =
    prefs.budget?.trim() ||
    (capCents != null
      ? `${currency} ${(capCents / 100).toFixed(0)} cap`
      : null) ||
    prefs.furniture?.trim() ||
    null;

  const facts = {
    roomType: prefs.room,
    stylePrimary: prefs.style,
    styleSecondary: secondary,
    colors,
    budgetLabel: prefs.budget,
    furniture: prefs.furniture,
    readinessLabel: readiness.label,
    readinessScore: readiness.score,
    strongestConstraint,
    itemCount: planItems.length,
  };

  let narrative: string;
  if (input.skipNarrative) {
    narrative = fallbackNarrative({
      roomType: prefs.room,
      style: prefs.style,
      budgetLabel: prefs.budget,
      readinessLabel: readiness.label,
      strongestConstraint,
    });
  } else {
    try {
      narrative = await writeNarrative({
        userId: input.userId,
        ...(input.conversationId != null
          ? { conversationId: input.conversationId }
          : {}),
        facts,
        ...(input.fetchImpl ? { fetchImpl: input.fetchImpl } : {}),
      });
    } catch (error) {
      if (
        error instanceof CostLimitError ||
        (error instanceof StructuredGenerationError &&
          error.code === "cost_limit")
      ) {
        return err("cost_limit", CHAT_FAILURE_COST_LIMIT);
      }
      return err(
        "provider_unavailable",
        "Could not generate the design brief narrative.",
      );
    }
  }

  const brief: DesignBriefV1 = {
    version: 1,
    generatedAt: new Date().toISOString(),
    userId: input.userId,
    roomPlanId,
    conversationId: input.conversationId ?? null,
    room: {
      type: prefs.room,
      notes:
        styleProfile?.roomDimensions != null
          ? JSON.stringify(styleProfile.roomDimensions)
          : null,
    },
    style: {
      primary: prefs.style,
      secondary,
      avoid: [],
    },
    palette: {
      colors,
      exclusions: [],
    },
    budget: {
      capCents,
      currency,
      allocated,
    },
    items: planItems,
    readiness,
    narrative,
  };

  return ok(brief);
}
