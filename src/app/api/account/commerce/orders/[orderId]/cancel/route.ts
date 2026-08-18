import { cancelOrder } from "@/server/commerce/order-service";
import { fromServiceResult, requireApiSession } from "@/server/http";

export async function POST(
  _request: Request,
  context: { params: Promise<{ orderId: string }> },
) {
  const { session, response } = await requireApiSession();
  if (!session) return response;
  const { orderId } = await context.params;
  return fromServiceResult(await cancelOrder(session.user.id, orderId));
}
