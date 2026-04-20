import "server-only";

import type { Currency, DeliveryMethod, OrderStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { formatDeliveryStatusLabel } from "@/lib/site/account/commerce-labels";

/** Line item display — from OrderItem.snapshot JSON at order time. */
export type OrderItemPreview = {
  name: string;
  category?: string;
  qty: number;
  unitPriceCents: number;
  coverHue?: number;
};

/** One row for /account/orders. */
export type AccountOrderSummary = {
  id: string;
  number: string;
  status: OrderStatus;
  placedAt: Date;
  totalCents: number;
  currency: Currency;
  deliveryMethod: DeliveryMethod;
  items: OrderItemPreview[];
  hasDelivery: boolean;
  deliveryStatusLabel?: string;
};

function parseSnapshot(raw: unknown): OrderItemPreview {
  if (!raw || typeof raw !== "object") {
    return { name: "Item", qty: 1, unitPriceCents: 0 };
  }
  const o = raw as Record<string, unknown>;
  return {
    name: typeof o.name === "string" ? o.name : "Item",
    category: typeof o.category === "string" ? o.category : undefined,
    qty: typeof o.qty === "number" && o.qty > 0 ? o.qty : 1,
    unitPriceCents:
      typeof o.unitPriceCents === "number" && o.unitPriceCents >= 0
        ? o.unitPriceCents
        : 0,
    coverHue: typeof o.coverHue === "number" ? o.coverHue : undefined,
  };
}

export async function getAccountOrders(
  userId: string,
): Promise<AccountOrderSummary[]> {
  const rows = await prisma.order.findMany({
    where: { userId },
    orderBy: { placedAt: "desc" },
    include: {
      items: true,
      delivery: { select: { status: true } },
    },
  });

  return rows.map((o) => ({
    id: o.id,
    number: o.number,
    status: o.status,
    placedAt: o.placedAt,
    totalCents: o.totalCents,
    currency: o.currency,
    deliveryMethod: o.deliveryMethod,
    items: o.items.map((it) => parseSnapshot(it.snapshot)),
    hasDelivery: o.delivery != null,
    deliveryStatusLabel: o.delivery
      ? formatDeliveryStatusLabel(o.delivery.status)
      : undefined,
  }));
}
