import { generateObject, zodSchema } from "ai";
import { z } from "zod";
import {
  getOpenAIKey,
  openai,
  OPENAI_PRIMARY_MODEL,
} from "@/lib/eva/core/openai";

const RubricResultSchema = z.object({
  passed: z.boolean(),
  score: z.number().min(0).max(1),
  failures: z.array(z.string()),
  revised: z.string().optional(),
});

const rubricChecklist = `
- Does it mention or respect the user's stated constraints (budget, room type, style)?
- Does it offer 2-3 options or variety, not just one?
- Does it include a clarifying question or next step when appropriate?
- Are prices or dimensions mentioned where relevant?
- Does it avoid contradicting stored preferences?
`;

export interface GradeResult {
  passed: boolean;
  score: number;
  failures: string[];
  revised?: string;
}

export async function gradeRecommendation(
  recommendation: string,
  preferences: Record<string, string>,
): Promise<GradeResult> {
  if (!getOpenAIKey()) return { passed: true, score: 1, failures: [] };

  const prefsStr = JSON.stringify(preferences, null, 0);
  const prompt = `You are grading a design recommendation.

Stored user preferences:
${prefsStr}

Recommendation to grade:
${recommendation}

Checklist:${rubricChecklist}

Respond with: passed (true if it meets the checklist, false otherwise), score (0-1), failures (list of checklist items that were not met), and if passed is false, provide a revised short recommendation text that fixes the failures.`;

  const result = await generateObject({
    model: openai(OPENAI_PRIMARY_MODEL),
    schema: zodSchema(RubricResultSchema),
    prompt,
    maxRetries: 1,
  });

  const o = result.object;
  return {
    passed: o.passed,
    score: o.score,
    failures: o.failures ?? [],
    revised: o.revised,
  };
}

export async function gradeRecommendationItem(
  item: {
    name: string;
    category: string;
    why_it_fits: string;
    estimated_price?: number | null;
  },
  preferences: Record<string, string>,
): Promise<{ why_it_fits: string }> {
  const text = `${item.name} (${item.category}): ${item.why_it_fits}${item.estimated_price != null ? ` ~$${item.estimated_price}` : ""}`;
  const grade = await gradeRecommendation(text, preferences);
  if (!grade.passed && grade.revised) {
    return { why_it_fits: grade.revised };
  }
  return { why_it_fits: item.why_it_fits };
}
