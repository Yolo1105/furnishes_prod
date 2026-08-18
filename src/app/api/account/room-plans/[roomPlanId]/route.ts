import { getRoomPlan, updateRoomPlan } from "@/server/room-plan/service";
import { fromServiceResult, jsonError, requireApiSession } from "@/server/http";

type Params = { params: Promise<{ roomPlanId: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { session, response } = await requireApiSession();
  if (!session) return response;
  const { roomPlanId } = await params;
  return fromServiceResult(
    await getRoomPlan({ userId: session.user.id, roomPlanId }),
    { disabled: 503, not_found: 404 },
  );
}

export async function PATCH(request: Request, { params }: Params) {
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
    name?: string;
    budgetCapCents?: number | null;
    currency?: string;
  };
  return fromServiceResult(
    await updateRoomPlan({
      userId: session.user.id,
      roomPlanId,
      ...(record.name !== undefined ? { name: record.name } : {}),
      ...(record.budgetCapCents !== undefined
        ? { budgetCapCents: record.budgetCapCents }
        : {}),
      ...(record.currency !== undefined ? { currency: record.currency } : {}),
    }),
    { disabled: 503, not_found: 404 },
  );
}
