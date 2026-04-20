import { generateObject, zodSchema } from "ai";
import { z } from "zod";
import { prisma } from "@/lib/eva/db";
import { requireConversationAccess } from "@/lib/eva/auth/helpers";
import { apiError, ErrorCodes } from "@/lib/eva/api/error";
import { messagesToTranscript } from "@/lib/eva/api/helpers";
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
import { MIN_MESSAGES_FOR_INSIGHTS } from "@/lib/eva-dashboard/insights-config";

export const dynamic = "force-dynamic";

/**
 * Discover insights (including the high-level "Recommendations" strings) use this route.
 * - Early 200 with empty arrays + `insightsReady: false` → not enough messages yet (honest).
 * - 200 with `insightsUnavailable: true` → AI not configured (honest).
 * - 200 with populated arrays → success.
 * - 503 → generation failed — never disguised as an empty successful summary.
 */
const InsightsSchema = z.object({
  keyInsights: z.array(z.string()),
  topics: z.array(z.string()),
  recommendations: z.array(z.string()),
  exploreNext: z.array(z.string()),
});

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
  const messages = await prisma.message.findMany({
    where: { conversationId: id },
    orderBy: { createdAt: "asc" },
  });

  if (messages.length < MIN_MESSAGES_FOR_INSIGHTS) {
    return Response.json({
      keyInsights: [],
      topics: [],
      recommendations: [],
      exploreNext: [],
      messageCount: messages.length,
      insightsReady: false,
      insightsUnavailable: false,
    });
  }

  const transcript = messagesToTranscript(messages);

  if (!getOpenAIKey()) {
    return Response.json({
      keyInsights: [],
      topics: [],
      recommendations: [],
      exploreNext: [],
      messageCount: messages.length,
      insightsReady: false,
      insightsUnavailable: true,
    });
  }

  const prompt = `Analyze this interior design conversation and extract:
- keyInsights: 3-5 most important facts established
- topics: design topics covered (as short tags)
- recommendations: 3-4 actionable next steps
- exploreNext: 2-3 questions the user hasn't answered yet

Conversation:
${transcript}`;

  try {
    const result = await withFallback(
      () =>
        generateObject({
          model: openai(OPENAI_PRIMARY_MODEL),
          schema: zodSchema(InsightsSchema),
          prompt,
          maxRetries: 3,
        }),
      () =>
        generateObject({
          model: openai(OPENAI_FALLBACK_MODEL),
          schema: zodSchema(InsightsSchema),
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

    return Response.json({
      ...object,
      messageCount: messages.length,
      insightsReady: true,
      insightsUnavailable: false,
    });
  } catch (e) {
    return apiError(
      ErrorCodes.LLM_UNAVAILABLE,
      e instanceof Error ? e.message : "Failed to generate insights",
      503,
    );
  }
}
