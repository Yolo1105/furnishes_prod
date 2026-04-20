import { generateText } from "ai";

import { openai } from "@/lib/eva/core/openai";
import { prisma } from "@/lib/eva/db";
import { requireConversationAccess } from "@/lib/eva/auth/helpers";
import { apiError, ErrorCodes } from "@/lib/eva/api/error";
import { messagesToTranscript } from "@/lib/eva/api/helpers";
import {
  withFallback,
  OPENAI_PRIMARY_MODEL,
  OPENAI_FALLBACK_MODEL,
  computeCost,
  toUsageLike,
} from "@/lib/eva/core/openai";
import { recordCost } from "@/lib/eva/core/cost-logger";

export const dynamic = "force-dynamic";

export async function POST(
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
    take: 4,
  });

  const preview = messagesToTranscript(messages);
  const prompt = `Generate a 4-6 word title for this interior design conversation. Return ONLY the title, no quotes:\n\n${preview}`;

  const titleResult = await withFallback(
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
  const title = titleResult.text;
  if (titleResult.usage) {
    const u = toUsageLike(titleResult.usage);
    const costUsd = computeCost(u, OPENAI_PRIMARY_MODEL);
    void recordCost(
      id,
      OPENAI_PRIMARY_MODEL,
      u.promptTokens ?? 0,
      u.completionTokens ?? 0,
      costUsd,
      "auxiliary",
    );
  }

  const trimmed = title.trim().slice(0, 60);
  await prisma.conversation.update({
    where: { id },
    data: { title: trimmed },
  });

  return Response.json({ title: trimmed });
}
