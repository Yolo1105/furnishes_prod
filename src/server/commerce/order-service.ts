/**
 * Orders and their state machine. Flag COMMERCE_ENABLED.
 *
 *   pending_payment → paid → fulfilled
 *                   ↘ cancelled        paid|fulfilled → refunded
 *
 * Transitions are applied with a status guard in the WHERE clause rather than a
 * read-then-write, so a webhook redelivery racing an operator action cannot
 * move an order twice.
 */

import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/server/db";
import { err, ok, type ServiceResult } from "@/server/result";
import { formatMoney, type Currency } from "@/lib/commerce/money";
import { logOps } from "@/server/ops/log";
import { restoreCartFromOrder } from "./cart-service";
import { isCommerceEnabled } from "./commerce-config";

export type OrderStatus =
  "pending_payment" | "paid" | "fulfilled" | "cancelled" | "refunded";

/** Statuses a transition may move *from*, keyed by the target status. */
const ALLOWED_FROM: Record<OrderStatus, OrderStatus[]> = {
  pending_payment: [],
  paid: ["pending_payment"],
  fulfilled: ["paid"],
  cancelled: ["pending_payment"],
  refunded: ["paid", "fulfilled"],
};

type OrderItemDto = {
  id: string;
  sku: string;
  name: string;
  quantity: number;
  unitPriceLabel: string;
  totalLabel: string;
};

export type OrderDto = {
  id: string;
  number: string;
  status: OrderStatus;
  currency: Currency;
  subtotalLabel: string;
  shippingLabel: string;
  taxLabel: string;
  totalLabel: string;
  totalCents: number;
  itemCount: number;
  itemsSummary: string;
  shipping: {
    recipient: string;
    lines: string[];
    phone: string | null;
  };
  placedAt: string;
  paidAt: string | null;
  fulfilledAt: string | null;
  cancelledAt: string | null;
  refundedAt: string | null;
  items: OrderItemDto[];
};

type OrderRow = {
  id: string;
  number: string;
  status: string;
  currency: string;
  subtotalCents: number;
  shippingCents: number;
  taxCents: number;
  totalCents: number;
  shipRecipient: string;
  shipLine1: string;
  shipLine2: string | null;
  shipCity: string | null;
  shipPostalCode: string;
  shipCountry: string;
  shipPhone: string | null;
  placedAt: Date;
  paidAt: Date | null;
  fulfilledAt: Date | null;
  cancelledAt: Date | null;
  refundedAt: Date | null;
  items: Array<{
    id: string;
    sku: string;
    name: string;
    quantity: number;
    unitPriceCents: number;
    totalCents: number;
  }>;
};

/** Shared so checkout and order reads cannot drift into different shapes. */
export const ORDER_SELECT = {
  id: true,
  number: true,
  status: true,
  currency: true,
  subtotalCents: true,
  shippingCents: true,
  taxCents: true,
  totalCents: true,
  shipRecipient: true,
  shipLine1: true,
  shipLine2: true,
  shipCity: true,
  shipPostalCode: true,
  shipCountry: true,
  shipPhone: true,
  placedAt: true,
  paidAt: true,
  fulfilledAt: true,
  cancelledAt: true,
  refundedAt: true,
  items: {
    select: {
      id: true,
      sku: true,
      name: true,
      quantity: true,
      unitPriceCents: true,
      totalCents: true,
    },
  },
} as const;

export function mapOrder(row: OrderRow): OrderDto {
  const currency = row.currency as Currency;
  const itemCount = row.items.reduce((sum, item) => sum + item.quantity, 0);
  return {
    id: row.id,
    number: row.number,
    status: row.status as OrderStatus,
    currency,
    subtotalLabel: formatMoney(row.subtotalCents, currency),
    shippingLabel:
      row.shippingCents === 0
        ? "Free"
        : formatMoney(row.shippingCents, currency),
    taxLabel: formatMoney(row.taxCents, currency),
    totalLabel: formatMoney(row.totalCents, currency),
    totalCents: row.totalCents,
    itemCount,
    itemsSummary: row.items.map((item) => item.name).join(", "),
    shipping: {
      recipient: row.shipRecipient,
      lines: [
        row.shipLine1,
        row.shipLine2,
        [row.shipCity, row.shipPostalCode].filter(Boolean).join(" "),
        row.shipCountry,
      ].filter((line): line is string => Boolean(line && line.trim())),
      phone: row.shipPhone,
    },
    placedAt: row.placedAt.toISOString(),
    paidAt: row.paidAt?.toISOString() ?? null,
    fulfilledAt: row.fulfilledAt?.toISOString() ?? null,
    cancelledAt: row.cancelledAt?.toISOString() ?? null,
    refundedAt: row.refundedAt?.toISOString() ?? null,
    items: row.items.map((item) => ({
      id: item.id,
      sku: item.sku,
      name: item.name,
      quantity: item.quantity,
      unitPriceLabel: formatMoney(item.unitPriceCents, currency),
      totalLabel: formatMoney(item.totalCents, currency),
    })),
  };
}

type OrderError = "commerce_disabled" | "not_found" | "invalid_status";

export async function listOrders(
  userId: string,
): Promise<ServiceResult<{ orders: OrderDto[] }, OrderError>> {
  if (!isCommerceEnabled()) {
    return err("commerce_disabled", "The store is not available yet.");
  }
  const rows = await prisma.order.findMany({
    where: { userId },
    orderBy: { placedAt: "desc" },
    take: 50,
    select: ORDER_SELECT,
  });
  return ok({ orders: rows.map(mapOrder) });
}

function timestampField(status: OrderStatus): Record<string, Date> {
  const now = new Date();
  switch (status) {
    case "paid":
      return { paidAt: now };
    case "fulfilled":
      return { fulfilledAt: now };
    case "cancelled":
      return { cancelledAt: now };
    case "refunded":
      return { refundedAt: now };
    default:
      return {};
  }
}

/**
 * Matches whichever reference the provider happened to send.
 *
 * A hosted checkout stores the session id, but refunds arrive against the
 * payment intent, so an order has to be findable by either. Shared with the
 * webhook so those two lookups cannot drift onto only one of the columns.
 */
export function byPaymentRef(ref: string) {
  return { OR: [{ paymentRef: ref }, { paymentIntentRef: ref }] };
}

/**
 * Moves an order to `status` only from a legal predecessor. Returns false when
 * nothing matched, which means the order was already advanced — the normal case
 * for a duplicate webhook, not an error.
 */
type CommerceDb = PrismaClient | Prisma.TransactionClient;

async function transition(
  db: CommerceDb,
  where: { id: string } | ReturnType<typeof byPaymentRef>,
  status: OrderStatus,
  extra: Record<string, string> = {},
): Promise<boolean> {
  const from = ALLOWED_FROM[status];
  if (from.length === 0) return false;
  const { count } = await db.order.updateMany({
    where: { ...where, status: { in: from } },
    data: { status, ...timestampField(status), ...extra },
  });
  return count > 0;
}

/**
 * Called by the payment webhook, which has no user context.
 *
 * `paymentIntentRef` is recorded on the way through, because this is the only
 * moment a session-based order learns which intent it belongs to — and without
 * it a later refund event would match nothing.
 */
export async function markOrderPaidByPaymentRef(
  paymentRef: string,
  paymentIntentRef: string | null = null,
  db: CommerceDb = prisma,
): Promise<boolean> {
  const moved = await transition(
    db,
    byPaymentRef(paymentRef),
    "paid",
    paymentIntentRef ? { paymentIntentRef } : {},
  );
  if (moved) logOps("info", "commerce_order_paid", { paymentRef });
  return moved;
}

export async function markOrderRefundedByPaymentRef(
  paymentRef: string,
  db: CommerceDb = prisma,
): Promise<boolean> {
  const moved = await transition(db, byPaymentRef(paymentRef), "refunded");
  if (moved) logOps("info", "commerce_order_refunded", { paymentRef });
  return moved;
}

/** Payment failed upstream: release the order rather than leave it hanging. */
export async function markOrderFailedByPaymentRef(
  paymentRef: string,
  failureCode: string,
  db: CommerceDb = prisma,
): Promise<boolean> {
  const released = await db.order.findFirst({
    where: { ...byPaymentRef(paymentRef), status: "pending_payment" },
    select: { id: true },
  });
  if (!released) return false;

  const { count } = await db.order.updateMany({
    where: { id: released.id, status: "pending_payment" },
    data: { status: "cancelled", cancelledAt: new Date(), failureCode },
  });
  if (count === 0) return false;

  logOps("warn", "commerce_order_payment_failed", { paymentRef, failureCode });
  await restoreCartFromOrder(released.id);
  return true;
}

export async function markOrderFulfilled(
  orderId: string,
): Promise<ServiceResult<OrderDto, OrderError>> {
  const moved = await transition(prisma, { id: orderId }, "fulfilled");
  if (!moved) {
    return err("invalid_status", "Only a paid order can be fulfilled.");
  }
  const row = await prisma.order.findUnique({
    where: { id: orderId },
    select: ORDER_SELECT,
  });
  if (!row) return err("not_found", "That order no longer exists.");
  logOps("info", "commerce_order_fulfilled", { orderId });
  return ok(mapOrder(row));
}

/** A shopper may cancel only while payment is still outstanding. */
export async function cancelOrder(
  userId: string,
  orderId: string,
): Promise<ServiceResult<OrderDto, OrderError>> {
  if (!isCommerceEnabled()) {
    return err("commerce_disabled", "The store is not available yet.");
  }
  const owned = await prisma.order.findFirst({
    where: { id: orderId, userId },
    select: { id: true },
  });
  if (!owned) return err("not_found", "That order no longer exists.");

  const moved = await transition(prisma, { id: orderId }, "cancelled");
  if (!moved) {
    return err(
      "invalid_status",
      "This order can no longer be cancelled here — request a return instead.",
    );
  }
  // Cancelling an unpaid order is how a shopper backs out of a hosted checkout,
  // so the items go back to the cart for them to retry or edit.
  await restoreCartFromOrder(orderId);

  const row = await prisma.order.findUnique({
    where: { id: orderId },
    select: ORDER_SELECT,
  });
  if (!row) return err("not_found", "That order no longer exists.");
  return ok(mapOrder(row));
}
