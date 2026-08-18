"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  accountRequest,
  isAccountApiError,
} from "@/features/account/account-api";
import { AccountWireFrame } from "@/features/account/primitives/AccountWireFrame";
import { AccountWireHeader } from "@/features/account/primitives/AccountWireHeader";
import { AccountInspector } from "@/features/account/primitives/AccountInspector";
import { DEFAULT_CURRENCY, formatMoney } from "@/lib/commerce/money";
import { longOrderDate, shortOrderDate } from "./order-dates";
import type { OrderDto, OrderStatus } from "@/server/commerce/order-service";

type Filter = "All" | OrderStatus;

const FILTERS: Filter[] = [
  "All",
  "pending_payment",
  "paid",
  "fulfilled",
  "cancelled",
  "refunded",
];

/** Shopper-facing wording; the stored status stays machine-readable. */
const STATUS_LABEL: Record<OrderStatus, string> = {
  pending_payment: "Awaiting payment",
  paid: "Paid",
  fulfilled: "Delivered",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

/** Maps a status onto the wireframe's badge variants. */
const STATUS_VARIANT: Record<OrderStatus, string> = {
  pending_payment: "",
  paid: "",
  fulfilled: "on",
  cancelled: "mut",
  refunded: "mut",
};

/** The most recent milestone, shown where the wireframe showed an ETA. */
function milestone(order: OrderDto): string {
  if (order.refundedAt) return `Refunded ${shortOrderDate(order.refundedAt)}`;
  if (order.cancelledAt)
    return `Cancelled ${shortOrderDate(order.cancelledAt)}`;
  if (order.fulfilledAt)
    return `Delivered ${shortOrderDate(order.fulfilledAt)}`;
  if (order.paidAt) return `Paid ${shortOrderDate(order.paidAt)}`;
  return "Awaiting payment";
}

/** How long to keep waiting for the webhook before saying so plainly. */
const CONFIRM_POLL_ATTEMPTS = 6;
const CONFIRM_POLL_MS = 2000;

export function OrdersPage({
  initialOrders,
  checkoutOutcome = null,
  checkoutOrderNumber = null,
}: {
  initialOrders: OrderDto[];
  checkoutOutcome?: "success" | "cancelled" | null;
  checkoutOrderNumber?: string | null;
}) {
  const router = useRouter();
  const [orders, setOrders] = useState(initialOrders);
  const [filter, setFilter] = useState<Filter>("All");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const counts = useMemo(() => {
    const base: Record<string, number> = { All: orders.length };
    for (const status of FILTERS) {
      if (status === "All") continue;
      base[status] = orders.filter((order) => order.status === status).length;
    }
    return base;
  }, [orders]);

  const rows =
    filter === "All"
      ? orders
      : orders.filter((order) => order.status === filter);

  const selected = orders.find((order) => order.id === selectedId) ?? null;

  // Spend counts settled money only: pending and cancelled orders never left
  // the shopper's account, and refunds came back.
  const spentThisYear = useMemo(() => {
    const year = new Date().getFullYear();
    const settled = orders.filter(
      (order) =>
        (order.status === "paid" || order.status === "fulfilled") &&
        new Date(order.placedAt).getFullYear() === year,
    );
    const total = settled.reduce((sum, order) => sum + order.totalCents, 0);
    return formatMoney(total, settled[0]?.currency ?? DEFAULT_CURRENCY);
  }, [orders]);

  const returning = checkoutOrderNumber
    ? (orders.find((order) => order.number === checkoutOrderNumber) ?? null)
    : null;
  const awaitingWebhook =
    checkoutOutcome === "success" && returning?.status === "pending_payment";

  const [pollsLeft, setPollsLeft] = useState(
    awaitingWebhook ? CONFIRM_POLL_ATTEMPTS : 0,
  );

  const reload = useCallback(async () => {
    const fresh = await accountRequest<{ orders: OrderDto[] }>(
      "/api/account/commerce/orders",
    );
    setOrders(fresh.orders);
  }, []);

  /**
   * The shopper's redirect and the provider's webhook are independent, so the
   * browser often arrives first. Poll briefly rather than claiming an unpaid
   * order is paid, and stop either way so this never spins forever.
   */
  useEffect(() => {
    if (!awaitingWebhook || pollsLeft <= 0) return;
    const timer = window.setTimeout(() => {
      void reload().catch(() => {
        // A failed refresh is not worth surfacing; the next attempt or a manual
        // reload will pick the status up.
      });
      setPollsLeft((remaining) => remaining - 1);
    }, CONFIRM_POLL_MS);
    return () => window.clearTimeout(timer);
  }, [awaitingWebhook, pollsLeft, reload]);

  function checkoutNotice(): string | null {
    if (!checkoutOutcome || !returning) return null;
    if (checkoutOutcome === "cancelled") {
      return `Payment for ${returning.number} was not completed. Cancel the order to return the items to your cart.`;
    }
    if (returning.status === "paid" || returning.status === "fulfilled") {
      return `Payment confirmed for ${returning.number}.`;
    }
    if (returning.status === "cancelled" || returning.status === "refunded") {
      return `${returning.number} is ${STATUS_LABEL[returning.status].toLowerCase()}.`;
    }
    return pollsLeft > 0
      ? `Thanks — confirming payment for ${returning.number} with the payment provider…`
      : `${returning.number} is still awaiting confirmation from the payment provider. It will update here on its own; nothing further is needed from you.`;
  }

  function flash(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 2400);
  }

  async function cancel(orderId: string) {
    setBusy(true);
    try {
      const updated = await accountRequest<OrderDto>(
        `/api/account/commerce/orders/${orderId}/cancel`,
        { method: "POST" },
      );
      setOrders((prev) =>
        prev.map((order) => (order.id === updated.id ? updated : order)),
      );
      flash(`${updated.number} cancelled`);
      router.refresh();
    } catch (caught) {
      flash(
        isAccountApiError(caught)
          ? caught.message
          : "Could not cancel the order.",
      );
    } finally {
      setBusy(false);
    }
  }

  const notice = checkoutNotice();

  return (
    <AccountWireFrame
      inspector={
        selected ? (
          <AccountInspector
            open
            eye="Order"
            title={selected.number}
            onClose={() => setSelectedId(null)}
            actions={
              selected.status === "pending_payment" ? (
                <button
                  type="button"
                  className="wf-btn"
                  disabled={busy}
                  onClick={() => void cancel(selected.id)}
                >
                  {busy ? "Cancelling…" : "Cancel order"}
                </button>
              ) : (
                <button
                  type="button"
                  className="wf-btn ghost"
                  onClick={() => setSelectedId(null)}
                >
                  Close
                </button>
              )
            }
          >
            <div className="wf-doc__head">
              <span
                className={
                  STATUS_VARIANT[selected.status]
                    ? `wf-badge wf-badge--${STATUS_VARIANT[selected.status]}`
                    : "wf-badge"
                }
              >
                {STATUS_LABEL[selected.status]}
              </span>
              <span className="wf-doc__date">
                Placed {longOrderDate(selected.placedAt)}
              </span>
            </div>

            <p className="wf-field__lbl" style={{ marginTop: 16 }}>
              Items
            </p>
            {selected.items.map((item) => (
              <div className="wf-doc__line" key={item.id}>
                <span className="wf-doc__nm">{item.name}</span>
                <span className="wf-doc__q">×{item.quantity}</span>
                <span className="wf-doc__p">{item.totalLabel}</span>
              </div>
            ))}

            <div className="wf-doc__rule" />
            <div className="wf-doc__tot">
              <span>Subtotal</span>
              <span className="v">{selected.subtotalLabel}</span>
            </div>
            <div className="wf-doc__tot">
              <span>Delivery</span>
              <span className="v">{selected.shippingLabel}</span>
            </div>
            <div className="wf-doc__tot">
              <span>Tax</span>
              <span className="v">{selected.taxLabel}</span>
            </div>
            <div className="wf-doc__tot wf-doc__tot--grand">
              <span>Total</span>
              <span className="v">{selected.totalLabel}</span>
            </div>

            <p className="wf-field__lbl" style={{ marginTop: 16 }}>
              Delivery
            </p>
            <p className="wf-doc__addr">
              {[selected.shipping.recipient, ...selected.shipping.lines].join(
                ", ",
              )}
            </p>
            <p className="wf-doc__addr wf-doc__addr--track">
              {milestone(selected)}
            </p>
          </AccountInspector>
        ) : null
      }
    >
      <AccountWireHeader
        eyebrow="Account"
        title="Orders"
        subtitle="Orders, deliveries, and returns in one place."
      />

      {notice ? (
        <p className="wf-row__p" role="status" style={{ marginBottom: 14 }}>
          {notice}
        </p>
      ) : null}

      <div className="wf-tools">
        {FILTERS.map((chip) => (
          <button
            key={chip}
            type="button"
            className={filter === chip ? "wf-chip on" : "wf-chip"}
            onClick={() => setFilter(chip)}
          >
            {chip === "All" ? "All" : STATUS_LABEL[chip]}
            <span className="ct">{counts[chip] ?? 0}</span>
          </button>
        ))}
      </div>

      {orders.length === 0 ? (
        <p className="wf-row__p">
          No orders yet. Anything you buy will appear here.
        </p>
      ) : (
        <div className="wf-conn">
          <div className="wf-facts wf-facts--lg wf-facts--4">
            <div className="wf-fact">
              <div className="wf-fact__l">Awaiting payment</div>
              <div className="wf-fact__v">{counts.pending_payment ?? 0}</div>
            </div>
            <div className="wf-fact">
              <div className="wf-fact__l">Paid</div>
              <div className="wf-fact__v">{counts.paid ?? 0}</div>
            </div>
            <div className="wf-fact">
              <div className="wf-fact__l">Delivered</div>
              <div className="wf-fact__v">{counts.fulfilled ?? 0}</div>
            </div>
            <div className="wf-fact">
              <div className="wf-fact__l">
                Spent · {new Date().getFullYear()}
              </div>
              <div className="wf-fact__v">{spentThisYear}</div>
            </div>
          </div>

          <table className="wf-tbl">
            <thead>
              <tr>
                <th>Order</th>
                <th>Items</th>
                <th className="num">Total</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((order) => (
                <tr
                  key={order.id}
                  style={{ cursor: "pointer" }}
                  onClick={() => setSelectedId(order.id)}
                >
                  <td>
                    <div className="wf-tbl__t">{order.number}</div>
                    <div className="wf-tbl__d">
                      Placed {shortOrderDate(order.placedAt)}
                    </div>
                  </td>
                  <td>
                    <div className="wf-tbl__t" style={{ fontWeight: 500 }}>
                      {order.itemsSummary}
                    </div>
                    <div className="wf-tbl__d">
                      {order.itemCount} {order.itemCount > 1 ? "items" : "item"}
                    </div>
                  </td>
                  <td className="num">
                    <span className="wf-tbl__n">{order.totalLabel}</span>
                  </td>
                  <td>
                    <span
                      className={
                        STATUS_VARIANT[order.status]
                          ? `wf-badge wf-badge--${STATUS_VARIANT[order.status]}`
                          : "wf-badge"
                      }
                    >
                      {STATUS_LABEL[order.status]}
                    </span>
                    <div className="wf-tbl__d" style={{ marginTop: 6 }}>
                      {milestone(order)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className={`wf-toast${toast ? " show" : ""}`}>{toast ?? ""}</div>
    </AccountWireFrame>
  );
}
