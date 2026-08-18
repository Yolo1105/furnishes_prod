import {
  createStudioPieceFromInput,
  listStudioPieces,
} from "@/server/studio/piece-service";
import {
  fromServiceResult,
  jsonError,
  jsonOk,
  requireApiSession,
} from "@/server/http";

export async function GET(request: Request) {
  const { session, response } = await requireApiSession();
  if (!session) return response;
  const cursor = new URL(request.url).searchParams.get("cursor");
  const result = await listStudioPieces(session.user.id, { cursor });
  if (!result.ok) return fromServiceResult(result);
  return jsonOk(result.value);
}

export async function POST(request: Request) {
  const { session, response } = await requireApiSession();
  if (!session) return response;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "validation", "Invalid JSON body.");
  }
  return fromServiceResult(
    await createStudioPieceFromInput(session.user.id, body),
  );
}
