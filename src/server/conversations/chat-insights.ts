/**
 * Conversation insights — preference/design trends for Discover-style UI.
 * Re-derived from legacy GET /api/conversations/[id]/insights.
 */

import { z } from "zod";
import { prisma } from "@/server/db";
import { err, ok, type ServiceResult } from "@/server/result";
import {
  CostLimitError,
  generateStructured,
} from "@/server/structured-output/generate-structured";
import { CHAT_FAILURE_COST_LIMIT } from "@/server/conversations/chat-copy";

export const MIN_MESSAGES_FOR_INSIGHTS = 3;

export const InsightsSchema = z.object({
  keyInsights: z.array(z.string()).max(8),
  topics: z.array(z.string()).max(12),
  recommendations: z.array(z.string()).max(8),
  exploreNext: z.array(z.string()).max(6),
});

type ConversationInsights = z.infer<typeof InsightsSchema> & {
  messageCount: number;
  insightsReady: boolean;
  insightsUnavailable: boolean;
};

export function isChatInsightsEnabled(): boolean {
  return process.env.CHAT_INSIGHTS_ENABLED === "1";
}

function emptyInsights(
  messageCount: number,
  flags: { insightsReady: boolean; insightsUnavailable: boolean },
): ConversationInsights {
  return {
    keyInsights: [],
    topics: [],
    recommendations: [],
    exploreNext: [],
    messageCount,
    insightsReady: flags.insightsReady,
    insightsUnavailable: flags.insightsUnavailable,
  };
}

export async function getConversationInsights(input: {
  userId: string;
  conversationId: string;
}): Promise<
  ServiceResult<
    ConversationInsights,
    "not_found" | "disabled" | "provider_unavailable" | "cost_limit"
  >
> {
  if (!isChatInsightsEnabled()) {
    return err("disabled", "Conversation insights are disabled.");
  }

  const conversation = await prisma.conversation.findFirst({
    where: { id: input.conversationId, userId: input.userId },
    select: {
      id: true,
      messages: {
        orderBy: { createdAt: "asc" },
        take: 80,
        select: { role: true, content: true },
      },
    },
  });
  if (!conversation) return err("not_found", "Conversation not found.");

  const messageCount = conversation.messages.length;
  if (messageCount < MIN_MESSAGES_FOR_INSIGHTS) {
    return ok(
      emptyInsights(messageCount, {
        insightsReady: false,
        insightsUnavailable: false,
      }),
    );
  }

  if (!process.env.OPENAI_API_KEY?.trim()) {
    return ok(
      emptyInsights(messageCount, {
        insightsReady: false,
        insightsUnavailable: true,
      }),
    );
  }

  const transcript = conversation.messages
    .map((message) => `${message.role}: ${message.content}`)
    .join("\n")
    .slice(0, 8000);

  try {
    const generated = await generateStructured({
      system: `You analyze interior-design conversations for the Account Discover surface.
Return JSON only. Never invent Product SKUs or shopping links.
keyInsights: 3-5 important established facts.
topics: short design topic tags.
recommendations: 3-4 actionable next steps (designer advice, not products).
exploreNext: 2-3 open questions the user has not answered.`,
      user: transcript,
      schema: InsightsSchema,
      costContext: {
        userId: input.userId,
        conversationId: input.conversationId,
        kind: "insight",
      },
    });
    return ok({
      ...generated,
      messageCount,
      insightsReady: true,
      insightsUnavailable: false,
    });
  } catch (error) {
    if (error instanceof CostLimitError) {
      return err("cost_limit", CHAT_FAILURE_COST_LIMIT);
    }
    return err("provider_unavailable", "Insights are temporarily unavailable.");
  }
}
