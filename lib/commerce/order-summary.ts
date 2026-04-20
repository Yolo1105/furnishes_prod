import type { CartItem, OrderSummary } from "@/lib/site/commerce/types";

export function computeOrderSummary(
  items: CartItem[],
  deliveryCents = 0,
  discountCents = 0,
): OrderSummary {
  const subtotalCents = items
    .filter((i) => !i.savedForLater)
    .reduce((s, i) => s + i.unitPriceCents * i.qty, 0);
  return {
    subtotalCents,
    deliveryCents,
    discountCents,
    totalCents: Math.max(0, subtotalCents + deliveryCents - discountCents),
    currency: "SGD",
  };
}
