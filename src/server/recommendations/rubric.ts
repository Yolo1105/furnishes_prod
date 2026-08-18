/**
 * Optional LLM rubric for recommendation items (flag-friendly; fails open).
 * Re-derived from legacy `lib/eva/quality/recommendation-rubric.ts`.
 */

import { z } from "zod";
import { envMs } from "@/server/env";
import { generateStructured } from "@/server/structured-output/generate-structured";

export const RubricBatchSchema = z.object({
  results: z.array(
    z.object({
      index: z.number().int(),
      passed: z.boolean(),
      score: z.number().min(0).max(1),
      failures: z.array(z.string()),
      revised: z.string().nullable().optional(),
    }),
  ),
});

type GradedWhy = { why_it_fits: string };

type GradeItem = {
  name: string;
  category: string;
  why_it_fits: string;
  estimated_price?: number | null;
};

export async function gradeRecommendationItems(
  items: GradeItem[],
  preferences: Record<string, string>,
  costContext?: { userId: string; conversationId?: string | null },
): Promise<GradedWhy[]> {
  if (!process.env.OPENAI_API_KEY?.trim() || items.length === 0) {
    return items.map((i) => ({ why_it_fits: i.why_it_fits }));
  }

  const budgetMs = envMs("RECOMMENDATION_TOTAL_BUDGET_MS", 60_000);
  const deadline = AbortSignal.timeout(budgetMs);

  try {
    const result = await Promise.race([
      generateStructured({
        system: `You grade interior design recommendations as a set.
Checklist per item:
- Respects stated constraints (budget, room, style)
- Offers concrete archetype guidance (no invented SKUs)
- Avoids contradicting preferences
- Is not a near-duplicate of another item in the set
Return { results: [{ index, passed, score, failures[], revised? }] }, one per input index.`,
        user: `Preferences: ${JSON.stringify(preferences)}\n\nItems:\n${items
          .map((i, n) => `[${n}] ${i.name} (${i.category}): ${i.why_it_fits}`)
          .join("\n")}`,
        schema: RubricBatchSchema,
        temperature: 0,
        ...(costContext
          ? {
              costContext: {
                ...costContext,
                conversationId: costContext.conversationId ?? null,
                kind: "recommendation" as const,
              },
            }
          : {}),
      }),
      new Promise<never>((_, reject) => {
        const abort = () => reject(new Error("recommendation_grade_budget"));
        if (deadline.aborted) abort();
        else deadline.addEventListener("abort", abort, { once: true });
      }),
    ]);
    const byIndex = new Map(result.results.map((r) => [r.index, r]));
    return items.map((item, n) => {
      const g = byIndex.get(n);
      return {
        why_it_fits: !g?.passed && g?.revised ? g.revised : item.why_it_fits,
      };
    });
  } catch {
    return items.map((i) => ({ why_it_fits: i.why_it_fits }));
  }
}
