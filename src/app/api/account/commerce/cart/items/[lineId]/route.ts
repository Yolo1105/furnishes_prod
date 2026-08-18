import { setCartLineQuantity } from "@/server/commerce/cart-service";
import { fromServiceResult, jsonError, requireApiSession } from "@/server/http";

/** PATCH with quantity 0 removes the line, so there is no separate DELETE. */
export async function PATCH(
  request: Request,
  context: { params: Promise<{ lineId: string }> },
) {
  const { session, response } = await requireApiSession();
  if (!session) return response;
  const { lineId } = await context.params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "validation", "Invalid JSON body.");
  }
  const record = (body ?? {}) as { quantity?: number };
  if (record.quantity === undefined) {
    return jsonError(400, "validation", "A quantity is required.");
  }
  return fromServiceResult(
    await setCartLineQuantity(session.user, {
      lineId,
      quantity: record.quantity,
    }),
  );
}
