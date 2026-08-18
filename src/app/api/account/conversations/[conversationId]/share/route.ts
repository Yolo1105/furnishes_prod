import { fromServiceResult, jsonError, requireApiSession } from "@/server/http";
import {
  createConversationShare,
  revokeConversationShare,
} from "@/server/conversations/chat-share";

type Params = { params: Promise<{ conversationId: string }> };

export async function POST(request: Request, { params }: Params) {
  const { session, response } = await requireApiSession();
  if (!session) return response;
  const { conversationId } = await params;

  const result = await createConversationShare({
    userId: session.user.id,
    conversationId,
    request,
  });
  if (!result.ok && result.error === "disabled") {
    return jsonError(503, "disabled", result.message ?? "Disabled.");
  }
  return fromServiceResult(result, { disabled: 503 });
}

export async function DELETE(_request: Request, { params }: Params) {
  const { session, response } = await requireApiSession();
  if (!session) return response;
  const { conversationId } = await params;

  const result = await revokeConversationShare({
    userId: session.user.id,
    conversationId,
  });
  if (!result.ok && result.error === "disabled") {
    return jsonError(503, "disabled", result.message ?? "Disabled.");
  }
  return fromServiceResult(result, { disabled: 503 });
}
