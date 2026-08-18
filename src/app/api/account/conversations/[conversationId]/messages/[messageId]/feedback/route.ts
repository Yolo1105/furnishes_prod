import { setMessageFeedback } from "@/server/conversations/service";
import { fromServiceResult, jsonError, requireApiSession } from "@/server/http";

type Params = {
  params: Promise<{ conversationId: string; messageId: string }>;
};

export async function POST(request: Request, { params }: Params) {
  const { session, response } = await requireApiSession();
  if (!session) return response;
  const { messageId } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "validation", "Invalid JSON body.");
  }
  const rating = (body as { rating?: string }).rating;
  if (rating !== "up" && rating !== "down") {
    return jsonError(400, "validation", "Rating must be up or down.");
  }
  return fromServiceResult(
    await setMessageFeedback(session.user.id, messageId, rating),
  );
}
