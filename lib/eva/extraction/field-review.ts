/**
 * LLM pass: ensure each extracted entity belongs in the correct sidebar field,
 * or drop / relabel before preferences are updated.
 */
import { generateObject, zodSchema } from "ai";
import { z } from "zod";
import { openai } from "@/lib/eva/core/openai";
import { getDomainConfig } from "@/lib/eva/domain/config";
import { getFieldIds } from "@/lib/eva/domain/fields";
import { normalizeValue } from "@/lib/eva/extraction/normalize";
import {
  withFallback,
  OPENAI_PRIMARY_MODEL,
  OPENAI_FALLBACK_MODEL,
  computeCost,
  toUsageLike,
} from "@/lib/eva/core/openai";
import { recordCost } from "@/lib/eva/core/cost-logger";
import { log } from "@/lib/eva/core/logger";

const DecisionSchema = z.object({
  action: z.enum(["keep", "drop", "adjust"]),
  /** Correct field id when action is adjust and field should change */
  field: z.string().optional(),
  /** Corrected display value when action is adjust */
  text: z.string().optional(),
});

const ReviewSchema = z.object({
  decisions: z.array(DecisionSchema),
});

export type ReviewableEntity = {
  field: string;
  text: string;
  confidence: number;
  evidenceSpans: Array<{ start: number; end: number; text: string }>;
  needsConfirmation?: boolean;
  confirmMessage?: string;
};

function buildFieldGuide(): string {
  const fieldIds = new Set(getFieldIds());
  const fields = getDomainConfig().fields ?? [];
  return fields
    .filter((f) => fieldIds.has(f.id))
    .map((f) => {
      const vocab =
        f.vocabulary?.length && f.vocabulary.length <= 16
          ? ` Typical values include: ${f.vocabulary.join(", ")}.`
          : f.vocabulary?.length
            ? ` Examples: ${f.vocabulary.slice(0, 14).join(", ")}.`
            : "";
      return `- ${f.id} (${f.label}): ${f.type}.${vocab}`;
    })
    .join("\n");
}

/**
 * Quick LLM review of extractions before they drive the preferences sidebar.
 * On failure, returns entities unchanged.
 */
export async function reviewExtractionsForSidebar<T extends ReviewableEntity>(
  content: string,
  entities: T[],
  conversationId: string,
): Promise<T[]> {
  if (entities.length === 0) return entities;

  const allowed = new Set(getFieldIds());
  const fieldGuide = buildFieldGuide();
  const numbered = entities
    .map(
      (e, i) =>
        `${i}. field="${e.field}" value=${JSON.stringify(e.text)} (confidence ${e.confidence.toFixed(2)})`,
    )
    .join("\n");

  const prompt = `You validate whether extracted preferences belong in the correct sidebar category for an interior-design assistant. Only the user's message is evidence.

User message:
${JSON.stringify(content)}

Allowed fields (use exact field ids only):
${fieldGuide}

Guidelines:
- "style" is for named design aesthetics (e.g. scandinavian, industrial, minimalist, coastal). Do NOT store color palettes, paint colors, or "coordinating colors" talk here — use "color" instead.
- "color" is for hues, palettes, wall/accent colors, neutrals, warm/cool tones.
- "roomType" is which space they are designing.
- "budget" is monetary constraints.
- "furniture" is pieces, layouts, or furniture needs.
- "exclusion" is things they want to avoid.
- Drop items that are empty filler, or that do not express a preference in this user message (e.g. restating the assistant without committing).
- Use "adjust" when the value is reasonable but the field is wrong or the wording should be a shorter label for the sidebar. When adjusting, prefer fixing the field over rewriting text.
- When unsure but plausible, prefer "keep" over "drop".

Extracted entities (indices 0 through ${entities.length - 1}):
${numbered}

Return exactly ${entities.length} decisions in the same order (one decision per index).`;

  try {
    const result = await withFallback(
      () =>
        generateObject({
          model: openai(OPENAI_PRIMARY_MODEL),
          schema: zodSchema(ReviewSchema),
          prompt,
          maxRetries: 2,
        }),
      () =>
        generateObject({
          model: openai(OPENAI_FALLBACK_MODEL),
          schema: zodSchema(ReviewSchema),
          prompt,
          maxRetries: 1,
        }),
    );

    if (conversationId && result.usage) {
      const usage = toUsageLike(result.usage);
      const costUsd = computeCost(usage, OPENAI_PRIMARY_MODEL);
      void recordCost(
        conversationId,
        OPENAI_PRIMARY_MODEL,
        usage.promptTokens ?? 0,
        usage.completionTokens ?? 0,
        costUsd,
        "auxiliary",
      );
    }

    const { decisions } = result.object;
    if (decisions.length !== entities.length) {
      log({
        level: "warn",
        event: "field_review_decision_length_mismatch",
        conversationId,
        expected: entities.length,
        got: decisions.length,
      });
      return entities;
    }

    const out: T[] = [];
    for (let i = 0; i < entities.length; i++) {
      const entity = entities[i]!;
      const d = decisions[i]!;
      if (d.action === "drop") continue;
      if (d.action === "keep") {
        out.push(entity);
        continue;
      }
      const nextField =
        d.field && allowed.has(d.field) ? d.field : entity.field;
      let nextText =
        d.text !== undefined && String(d.text).trim().length > 0
          ? String(d.text).trim()
          : entity.text;
      const [normalized] = normalizeValue(nextText);
      nextText = Array.isArray(normalized) ? normalized.join(", ") : normalized;
      out.push({
        ...entity,
        field: nextField,
        text: nextText,
      });
    }
    return out;
  } catch (e) {
    log({
      level: "warn",
      event: "field_review_failed",
      conversationId,
      error: String(e),
    });
    return entities;
  }
}
