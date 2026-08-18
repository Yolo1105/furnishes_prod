import { listPendingPreferenceProposals } from "@/server/preferences/preference-service";
import { jsonOk, requireApiSession } from "@/server/http";

export async function GET(request: Request) {
  const { session, response } = await requireApiSession();
  if (!session) return response;

  const url = new URL(request.url);
  const status = url.searchParams.get("status") ?? "pending";
  const conversationId =
    url.searchParams.get("conversationId")?.trim() || undefined;
  const cursor = url.searchParams.get("cursor")?.trim() || undefined;

  if (status !== "pending") {
    return jsonOk({ proposals: [] });
  }

  const proposals = await listPendingPreferenceProposals({
    userId: session.user.id,
    ...(conversationId ? { conversationId } : {}),
    ...(cursor ? { cursor } : {}),
  });

  return jsonOk({ proposals });
}
