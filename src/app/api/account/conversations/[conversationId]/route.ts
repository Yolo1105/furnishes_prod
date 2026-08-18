import {
  deleteConversation,
  getConversation,
  updateConversation,
} from "@/server/conversations/service";
import { fromServiceResult, jsonError, requireApiSession } from "@/server/http";

type Params = { params: Promise<{ conversationId: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { session, response } = await requireApiSession();
  if (!session) return response;
  const { conversationId } = await params;
  return fromServiceResult(
    await getConversation(session.user.id, conversationId),
  );
}

export async function PATCH(request: Request, { params }: Params) {
  const { session, response } = await requireApiSession();
  if (!session) return response;
  const { conversationId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "validation", "Invalid JSON body.");
  }

  const record = (body ?? {}) as {
    title?: unknown;
    projectId?: unknown;
  };

  const input: { title?: string; projectId?: string | null } = {};
  if (typeof record.title === "string") {
    input.title = record.title;
  }
  if (record.projectId === null) {
    input.projectId = null;
  } else if (typeof record.projectId === "string") {
    input.projectId = record.projectId;
  }

  return fromServiceResult(
    await updateConversation(session.user.id, conversationId, input),
  );
}

export async function DELETE(_request: Request, { params }: Params) {
  const { session, response } = await requireApiSession();
  if (!session) return response;
  const { conversationId } = await params;
  return fromServiceResult(
    await deleteConversation(session.user.id, conversationId),
  );
}
