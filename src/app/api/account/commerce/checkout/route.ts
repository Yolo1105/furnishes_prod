import {
  placeOrder,
  type AddressInput,
} from "@/server/commerce/checkout-service";
import { fromServiceResult, jsonError, requireApiSession } from "@/server/http";

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
    address?: Partial<AddressInput>;
    idempotencyKey?: string;
  };
  const address = record.address ?? {};

  return fromServiceResult(
    await placeOrder(session.user, {
      address: {
        recipient: address.recipient ?? "",
        line1: address.line1 ?? "",
        ...(address.line2 !== undefined ? { line2: address.line2 } : {}),
        ...(address.city !== undefined ? { city: address.city } : {}),
        postalCode: address.postalCode ?? "",
        country: address.country ?? "",
        ...(address.phone !== undefined ? { phone: address.phone } : {}),
      },
      idempotencyKey: record.idempotencyKey ?? "",
    }),
  );
}
