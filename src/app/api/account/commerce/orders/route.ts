import { listOrders } from "@/server/commerce/order-service";
import { fromServiceResult, requireApiSession } from "@/server/http";

export async function GET() {
  const { session, response } = await requireApiSession();
  if (!session) return response;
  return fromServiceResult(await listOrders(session.user.id));
}
