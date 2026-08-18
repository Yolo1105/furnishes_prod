import { addRoomPlanItem } from "@/server/room-plan/service";
import { fromServiceResult, jsonError, requireApiSession } from "@/server/http";

type Params = { params: Promise<{ roomPlanId: string }> };

export async function POST(request: Request, { params }: Params) {
  const { session, response } = await requireApiSession();
  if (!session) return response;
  const { roomPlanId } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "validation", "Invalid JSON body.");
  }
  const record = (body ?? {}) as {
    label?: string;
    category?: string;
    priority?: string;
    status?: string;
    budgetCents?: number | null;
    recommendationId?: string | null;
    inspirationItemId?: string | null;
    notes?: string | null;
    conversationId?: string;
  };

  // Save-from-recommendation path
  if (record.recommendationId && record.conversationId) {
    const { saveRecommendationToRoomPlan } =
      await import("@/server/room-plan/service");
    return fromServiceResult(
      await saveRecommendationToRoomPlan({
        userId: session.user.id,
        roomPlanId,
        recommendationId: record.recommendationId,
        conversationId: record.conversationId,
      }),
      { disabled: 503, not_found: 404 },
    );
  }

  return fromServiceResult(
    await addRoomPlanItem({
      userId: session.user.id,
      roomPlanId,
      label: record.label ?? "",
      category: record.category ?? "",
      ...(record.priority !== undefined ? { priority: record.priority } : {}),
      ...(record.status !== undefined ? { status: record.status } : {}),
      ...(record.budgetCents !== undefined
        ? { budgetCents: record.budgetCents }
        : {}),
      ...(record.recommendationId !== undefined
        ? { recommendationId: record.recommendationId }
        : {}),
      ...(record.inspirationItemId !== undefined
        ? { inspirationItemId: record.inspirationItemId }
        : {}),
      ...(record.notes !== undefined ? { notes: record.notes } : {}),
    }),
    { disabled: 503, not_found: 404 },
  );
}
