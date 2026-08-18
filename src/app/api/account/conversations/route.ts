import {
  createConversation,
  listConversations,
} from "@/server/conversations/service";
import { fromServiceResult, jsonOk, requireApiSession } from "@/server/http";

export async function GET(request: Request) {
  const { session, response } = await requireApiSession();
  if (!session) return response;
  const url = new URL(request.url);
  const cursor = url.searchParams.get("cursor");
  const query = url.searchParams.get("query");
  const status = url.searchParams.get("status");
  const limitRaw = url.searchParams.get("limit");
  const limit = limitRaw ? Number(limitRaw) : undefined;
  return jsonOk(
    await listConversations(session.user.id, {
      ...(cursor ? { cursor } : {}),
      ...(query ? { query } : {}),
      ...(status ? { status } : {}),
      ...(limit !== undefined && Number.isFinite(limit) ? { limit } : {}),
    }),
  );
}

export async function POST(request: Request) {
  const { session, response } = await requireApiSession();
  if (!session) return response;
  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const title = (body as { title?: string }).title;
  return fromServiceResult(await createConversation(session.user.id, title));
}
