import { addToCart, clearCart, getCart } from "@/server/commerce/cart-service";
import { fromServiceResult, jsonError, requireApiSession } from "@/server/http";

export async function GET() {
  const { session, response } = await requireApiSession();
  if (!session) return response;
  return fromServiceResult(await getCart(session.user));
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
  const record = (body ?? {}) as { variantId?: string; quantity?: number };
  return fromServiceResult(
    await addToCart(session.user, {
      variantId: record.variantId ?? "",
      ...(record.quantity !== undefined ? { quantity: record.quantity } : {}),
    }),
  );
}

export async function DELETE() {
  const { session, response } = await requireApiSession();
  if (!session) return response;
  return fromServiceResult(await clearCart(session.user));
}
