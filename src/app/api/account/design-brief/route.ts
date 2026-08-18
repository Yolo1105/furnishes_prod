import { getDesignBrief } from "@/server/design-brief/build-design-brief";
import { fromServiceResult, requireApiSession } from "@/server/http";

export async function GET(request: Request) {
  const { session, response } = await requireApiSession();
  if (!session) return response;

  const url = new URL(request.url);
  const roomPlanId = url.searchParams.get("roomPlanId");
  const conversationId = url.searchParams.get("conversationId");

  return fromServiceResult(
    await getDesignBrief({
      userId: session.user.id,
      ...(roomPlanId ? { roomPlanId } : {}),
      ...(conversationId ? { conversationId } : {}),
    }),
    {
      disabled: 503,
      not_found: 404,
      forbidden: 403,
      cost_limit: 429,
      provider_unavailable: 503,
    },
  );
}
