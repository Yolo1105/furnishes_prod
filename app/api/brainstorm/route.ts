import { generateText } from "ai";
import { z } from "zod";
import { prisma } from "@/lib/eva/db";
import { messagesToTranscript } from "@/lib/eva/api/helpers";
import {
  getOpenAIKey,
  OPENAI_KEY_MISSING_MESSAGE,
  withFallback,
  openai,
  OPENAI_PRIMARY_MODEL,
  OPENAI_FALLBACK_MODEL,
  computeCost,
  toUsageLike,
} from "@/lib/eva/core/openai";
import { recordCost } from "@/lib/eva/core/cost-logger";
import { apiError, ErrorCodes } from "@/lib/eva/api/error";
import { requireConversationAccess } from "@/lib/eva/auth/helpers";
import {
  getAssistantById,
  normalizeAssistantId,
} from "@/lib/eva/assistants/catalog";
import { mergeAssistantIntoSystemPrompt } from "@/lib/eva/assistants/prompt";

export const dynamic = "force-dynamic";

const BrainstormRequestSchema = z.object({
  conversationId: z.string(),
  preferences: z.record(z.string(), z.string()).optional(),
});

export async function POST(req: Request) {
  if (!getOpenAIKey()) {
    return apiError(
      ErrorCodes.LLM_UNAVAILABLE,
      OPENAI_KEY_MISSING_MESSAGE,
      503,
    );
  }
  const body = await req.json();
  const parsed = BrainstormRequestSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(
      ErrorCodes.VALIDATION_ERROR,
      "Invalid request",
      400,
      parsed.error.flatten(),
    );
  }
  const { conversationId, preferences } = parsed.data;

  const access = await requireConversationAccess(conversationId, req);
  if (access.error) {
    return apiError(
      access.status === 404 ? ErrorCodes.NOT_FOUND : ErrorCodes.FORBIDDEN,
      access.error,
      access.status,
    );
  }

  const prefs = preferences
    ? Object.entries(preferences)
        .filter(([, v]) => v)
        .map(([k, v]) => `${k}: ${v}`)
        .join(", ")
    : "none";

  const [messages, conversation] = await Promise.all([
    prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" },
      take: 15,
    }),
    prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { assistantId: true },
    }),
  ]);
  const transcript = messagesToTranscript(messages);

  const assistantDef = getAssistantById(
    normalizeAssistantId(conversation?.assistantId),
  );
  const systemBase = `You are helping through the Furnishes app. Summarize design ideas and suggest next steps in a single short paragraph (2-3 sentences). Speak directly to the user. Keep it under 80 words. Match the assistant persona in the overlay below.`;
  const systemPrompt = mergeAssistantIntoSystemPrompt(systemBase, assistantDef);

  const prompt = `${systemPrompt}

Preferences: ${prefs}

Conversation:
${transcript}`;
  const brainstormResult = await withFallback(
    () =>
      generateText({
        model: openai(OPENAI_PRIMARY_MODEL),
        prompt,
        maxRetries: 3,
      }),
    () =>
      generateText({
        model: openai(OPENAI_FALLBACK_MODEL),
        prompt,
        maxRetries: 2,
      }),
  );

  if (brainstormResult.usage) {
    const u = toUsageLike(brainstormResult.usage);
    const costUsd = computeCost(u, OPENAI_PRIMARY_MODEL);
    void recordCost(
      conversationId,
      OPENAI_PRIMARY_MODEL,
      u.promptTokens ?? 0,
      u.completionTokens ?? 0,
      costUsd,
      "auxiliary",
    );
  }

  return Response.json({ summary: brainstormResult.text.trim() });
}
