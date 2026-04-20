import { prisma } from "@/lib/db/prisma";
import { etaRangeForDeliveryMethod } from "@/lib/commerce/delivery-options";

/**
 * Creates a `Delivery` row when an order enters processing if none exists.
 * Idempotent — safe to call multiple times.
 */
export async function ensureDeliveryForProcessingOrder(
  orderId: string,
): Promise<void> {
  const order = await prisma.order.findFirst({
    where: { id: orderId },
    include: { delivery: true },
  });
  if (!order || order.delivery) return;

  const anchor = order.paidAt ?? order.placedAt;
  const { etaFrom, etaTo } = etaRangeForDeliveryMethod(
    order.deliveryMethod,
    anchor,
  );

  await prisma.delivery.create({
    data: {
      orderId: order.id,
      method: order.deliveryMethod,
      etaFrom,
      etaTo,
      status: "scheduled",
    },
  });
}
