import { z } from "zod";
import { fromServiceResult, jsonError, requireApiSession } from "@/server/http";
import {
  listConversationRecommendations,
  regenerateConversationRecommendations,
  saveRecommendationToInspiration,
} from "@/server/recommendations/service";

export const maxDuration = 60;

type Params = { params: Promise<{ conversationId: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { session, response } = await requireApiSession();
  if (!session) return response;
  const { conversationId } = await params;
  const result = await listConversationRecommendations({
    userId: session.user.id,
    conversationId,
  });
  return fromServiceResult(result, { disabled: 503 });
}

export async function POST(request: Request, { params }: Params) {
  const { session, response } = await requireApiSession();
  if (!session) return response;
  const { conversationId } = await params;

  let body: unknown = {};
  try {
    const text = await request.text();
    if (text.trim()) body = JSON.parse(text) as unknown;
  } catch {
    return jsonError(400, "validation", "Invalid JSON body.");
  }

  const parsed = z
    .object({
      action: z.enum(["regenerate", "save"]).default("regenerate"),
      stableId: z.string().min(1).optional(),
    })
    .safeParse(body);
  if (!parsed.success) {
    return jsonError(400, "validation", "Invalid recommendations payload.");
  }

  if (parsed.data.action === "save") {
    if (!parsed.data.stableId) {
      return jsonError(400, "validation", "stableId is required to save.");
    }
    return fromServiceResult(
      await saveRecommendationToInspiration({
        userId: session.user.id,
        conversationId,
        stableId: parsed.data.stableId,
      }),
      { disabled: 503 },
    );
  }

  return fromServiceResult(
    await regenerateConversationRecommendations({
      userId: session.user.id,
      conversationId,
    }),
    { disabled: 503 },
  );
}
