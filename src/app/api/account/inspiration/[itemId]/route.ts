import {
  deleteInspirationItem,
  updateInspirationItem,
} from "@/server/inspiration/inspiration-service";
import { fromServiceResult, jsonError, requireApiSession } from "@/server/http";

type Params = { params: Promise<{ itemId: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { session, response } = await requireApiSession();
  if (!session) return response;
  const { itemId } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "validation", "Invalid JSON body.");
  }
  return fromServiceResult(
    await updateInspirationItem(session.user.id, itemId, body),
  );
}

export async function DELETE(_request: Request, { params }: Params) {
  const { session, response } = await requireApiSession();
  if (!session) return response;
  const { itemId } = await params;
  return fromServiceResult(
    await deleteInspirationItem(session.user.id, itemId),
  );
}
