import {
  deleteStudioPiece,
  getStudioPiece,
  updateStudioPiece,
} from "@/server/studio/piece-service";
import { fromServiceResult, jsonError, requireApiSession } from "@/server/http";

type Params = { params: Promise<{ pieceId: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { session, response } = await requireApiSession();
  if (!session) return response;
  const { pieceId } = await params;
  return fromServiceResult(await getStudioPiece(session.user.id, pieceId));
}

export async function PATCH(request: Request, { params }: Params) {
  const { session, response } = await requireApiSession();
  if (!session) return response;
  const { pieceId } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "validation", "Invalid JSON body.");
  }
  return fromServiceResult(
    await updateStudioPiece(session.user.id, pieceId, body),
  );
}

export async function DELETE(_request: Request, { params }: Params) {
  const { session, response } = await requireApiSession();
  if (!session) return response;
  const { pieceId } = await params;
  return fromServiceResult(await deleteStudioPiece(session.user.id, pieceId));
}
