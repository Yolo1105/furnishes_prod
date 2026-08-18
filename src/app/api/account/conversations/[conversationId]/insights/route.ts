import { fromServiceResult, jsonError, requireApiSession } from "@/server/http";
import { getConversationInsights } from "@/server/conversations/chat-insights";

type Params = { params: Promise<{ conversationId: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { session, response } = await requireApiSession();
  if (!session) return response;
  const { conversationId } = await params;

  const result = await getConversationInsights({
    userId: session.user.id,
    conversationId,
  });
  if (!result.ok && result.error === "disabled") {
    return jsonError(503, "disabled", result.message ?? "Disabled.");
  }
  return fromServiceResult(result, {
    disabled: 503,
    provider_unavailable: 503,
  });
}
