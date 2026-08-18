import { updateRoomPlanItem } from "@/server/room-plan/service";
import { fromServiceResult, jsonError, requireApiSession } from "@/server/http";

type Params = {
  params: Promise<{ roomPlanId: string; itemId: string }>;
};

export async function PATCH(request: Request, { params }: Params) {
  const { session, response } = await requireApiSession();
  if (!session) return response;
  const { roomPlanId, itemId } = await params;
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
    actualCents?: number | null;
    notes?: string | null;
  };
  return fromServiceResult(
    await updateRoomPlanItem({
      userId: session.user.id,
      roomPlanId,
      itemId,
      ...(record.label !== undefined ? { label: record.label } : {}),
      ...(record.category !== undefined ? { category: record.category } : {}),
      ...(record.priority !== undefined ? { priority: record.priority } : {}),
      ...(record.status !== undefined ? { status: record.status } : {}),
      ...(record.budgetCents !== undefined
        ? { budgetCents: record.budgetCents }
        : {}),
      ...(record.actualCents !== undefined
        ? { actualCents: record.actualCents }
        : {}),
      ...(record.notes !== undefined ? { notes: record.notes } : {}),
    }),
    { disabled: 503, not_found: 404 },
  );
}
