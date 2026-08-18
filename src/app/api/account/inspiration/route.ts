import {
  createInspirationItem,
  listInspirationItems,
} from "@/server/inspiration/inspiration-service";
import {
  fromServiceResult,
  jsonError,
  jsonOk,
  requireApiSession,
} from "@/server/http";

export async function GET(request: Request) {
  const { session, response } = await requireApiSession();
  if (!session) return response;
  const url = new URL(request.url);
  const projectId = url.searchParams.get("projectId");
  const source = url.searchParams.get("source");
  const cursor = url.searchParams.get("cursor");
  if (source && source !== "generated" && source !== "uploaded") {
    return jsonError(400, "validation", "Invalid source filter.");
  }
  const result = await listInspirationItems(session.user.id, {
    projectId,
    source: source as "generated" | "uploaded" | null,
    cursor,
  });
  return jsonOk(result);
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
  return fromServiceResult(await createInspirationItem(session.user.id, body));
}
