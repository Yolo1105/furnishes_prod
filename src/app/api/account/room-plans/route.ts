import { createRoomPlan, listRoomPlans } from "@/server/room-plan/service";
import { fromServiceResult, jsonError, requireApiSession } from "@/server/http";

export async function GET(request: Request) {
  const { session, response } = await requireApiSession();
  if (!session) return response;
  const projectId = new URL(request.url).searchParams.get("projectId");
  return fromServiceResult(
    await listRoomPlans({
      userId: session.user.id,
      ...(projectId ? { projectId } : {}),
    }),
    { disabled: 503 },
  );
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
  const record = (body ?? {}) as {
    name?: string;
    projectId?: string | null;
    budgetCapCents?: number | null;
    currency?: string;
    roomType?: string | null;
    seedItems?: Array<{
      label: string;
      category: string;
      priority?: string;
    }>;
  };
  return fromServiceResult(
    await createRoomPlan({
      userId: session.user.id,
      name: record.name ?? "",
      ...(record.projectId !== undefined
        ? { projectId: record.projectId }
        : {}),
      ...(record.budgetCapCents !== undefined
        ? { budgetCapCents: record.budgetCapCents }
        : {}),
      ...(record.currency !== undefined ? { currency: record.currency } : {}),
      ...(record.roomType !== undefined ? { roomType: record.roomType } : {}),
      ...(record.seedItems !== undefined
        ? { seedItems: record.seedItems }
        : {}),
    }),
    { disabled: 503, forbidden: 403 },
  );
}
