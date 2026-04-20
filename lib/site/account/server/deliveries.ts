import "server-only";

import type {
  Currency,
  DeliveryMethod,
  DeliveryStatus,
  OrderStatus,
} from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

const PENDING_ORDER_STATUSES: OrderStatus[] = [
  "placed",
  "paid",
  "processing",
  "shipped",
  "delivered",
];

export type TrackedDeliveryRow = {
  deliveryId: string;
  orderId: string;
  orderNumber: string;
  orderStatus: OrderStatus;
  deliveryStatus: DeliveryStatus;
  method: DeliveryMethod;
  etaFrom: Date;
  etaTo: Date;
  courier: string | null;
  trackingNumber: string | null;
  scheduledAt: Date | null;
  dispatchedAt: Date | null;
  arrivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type PendingDeliveryOrderRow = {
  orderId: string;
  orderNumber: string;
  orderStatus: OrderStatus;
  placedAt: Date;
  totalCents: number;
  currency: Currency;
  deliveryMethod: DeliveryMethod;
  stateLabel: string;
};

export type AccountDeliveriesResult = {
  trackedDeliveries: TrackedDeliveryRow[];
  pendingDeliveryOrders: PendingDeliveryOrderRow[];
};

function pendingLabel(status: OrderStatus): string {
  switch (status) {
    case "placed":
      return "Awaiting scheduling";
    case "paid":
    case "processing":
      return "Preparing shipment";
    case "shipped":
      return "Awaiting tracking details";
    case "delivered":
      return "Completing delivery record";
    default:
      return "In progress";
  }
}

export async function getAccountDeliveries(
  userId: string,
): Promise<AccountDeliveriesResult> {
  const [deliveryRows, ordersNoDelivery] = await Promise.all([
    prisma.delivery.findMany({
      where: { order: { userId } },
      include: {
        order: { select: { id: true, number: true, status: true } },
      },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    }),
    prisma.order.findMany({
      where: {
        userId,
        delivery: null,
        status: { in: PENDING_ORDER_STATUSES },
      },
      orderBy: { placedAt: "desc" },
    }),
  ]);

  const trackedDeliveries: TrackedDeliveryRow[] = deliveryRows.map((d) => ({
    deliveryId: d.id,
    orderId: d.order.id,
    orderNumber: d.order.number,
    orderStatus: d.order.status,
    deliveryStatus: d.status,
    method: d.method,
    etaFrom: d.etaFrom,
    etaTo: d.etaTo,
    courier: d.courier,
    trackingNumber: d.trackingNumber,
    scheduledAt: d.scheduledAt,
    dispatchedAt: d.dispatchedAt,
    arrivedAt: d.arrivedAt,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  }));

  const pendingDeliveryOrders: PendingDeliveryOrderRow[] = ordersNoDelivery.map(
    (o) => ({
      orderId: o.id,
      orderNumber: o.number,
      orderStatus: o.status,
      placedAt: o.placedAt,
      totalCents: o.totalCents,
      currency: o.currency,
      deliveryMethod: o.deliveryMethod,
      stateLabel: pendingLabel(o.status),
    }),
  );

  return { trackedDeliveries, pendingDeliveryOrders };
}
