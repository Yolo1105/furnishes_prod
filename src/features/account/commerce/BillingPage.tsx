"use client";

import { useMemo, useState } from "react";
import { useAccountShellUser } from "@/features/account/shell/account-shell-user";
import { accountDisplayParts } from "@/features/account/shell/account-display";
import { AccountWireFrame } from "@/features/account/primitives/AccountWireFrame";
import { AccountWireHeader } from "@/features/account/primitives/AccountWireHeader";
import { DEFAULT_CURRENCY, formatMoney } from "@/lib/commerce/money";
import { shortOrderDate } from "./order-dates";
import type { OrderDto } from "@/server/commerce/order-service";

/**
 * Billing derived from real orders.
 *
 * Two things the wireframe showed are deliberately gone. Saved cards are not
 * listed, because card details are never stored here — they go straight to the
 * payment provider, and a list of "•••• 4242" rows implied a vault this app does
 * not have. The GST registration number is likewise omitted rather than shown as
 * a placeholder, since an invoice carrying a fake registration is worse than one
 * carrying none.
 */
export function BillingPage({ orders }: { orders: OrderDto[] }) {
  const user = useAccountShellUser();
  const { full } = accountDisplayParts(user.displayName, user.email);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // An invoice exists once money has actually moved.
  const invoiced = useMemo(
    () =>
      orders.filter(
        (order) =>
          order.status === "paid" ||
          order.status === "fulfilled" ||
          order.status === "refunded",
      ),
    [orders],
  );

  const currency = orders[0]?.currency ?? DEFAULT_CURRENCY;
  const year = new Date().getFullYear();

  const spent = useMemo(() => {
    const total = invoiced
      .filter(
        (order) =>
          order.status !== "refunded" &&
          new Date(order.placedAt).getFullYear() === year,
      )
      .reduce((sum, order) => sum + order.totalCents, 0);
    return formatMoney(total, currency);
  }, [invoiced, currency, year]);

  const lastPayment = invoiced
    .map((order) => order.paidAt)
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1);

  const outstanding = orders.filter(
    (order) => order.status === "pending_payment",
  );
  const outstandingTotal = outstanding.reduce(
    (sum, order) => sum + order.totalCents,
    0,
  );

  const selected = invoiced.find((order) => order.id === selectedId) ?? null;

  return (
    <AccountWireFrame>
      <AccountWireHeader
        eyebrow="Account"
        title="Billing"
        subtitle="Your invoices and billing details."
      />

      <div className="wf-conn">
        <div className="wf-facts wf-facts--lg wf-facts--4">
          <div className="wf-fact">
            <div className="wf-fact__l">Spent · {year}</div>
            <div className="wf-fact__v">{spent}</div>
          </div>
          <div className="wf-fact">
            <div className="wf-fact__l">Invoices</div>
            <div className="wf-fact__v">{invoiced.length}</div>
          </div>
          <div className="wf-fact">
            <div className="wf-fact__l">Last payment</div>
            <div className="wf-fact__v">
              {lastPayment ? shortOrderDate(lastPayment) : "—"}
            </div>
          </div>
          <div className="wf-fact">
            <div className="wf-fact__l">Outstanding</div>
            <div className="wf-fact__v">
              {outstanding.length === 0
                ? "None due"
                : formatMoney(outstandingTotal, currency)}
            </div>
          </div>
        </div>

        <div className="wf-sec">
          <p className="wf-sec__lbl">Payment methods</p>
        </div>
        <div className="wf-frows">
          <div className="wf-frow">
            <span className="wf-frow__l">Cards</span>
            <span className="wf-frow__v">
              Entered at checkout and held by our payment provider. Card numbers
              are never stored by Furnishes.
            </span>
          </div>
        </div>

        <div className="wf-sec">
          <p className="wf-sec__lbl">Invoices</p>
        </div>
        {invoiced.length === 0 ? (
          <p className="wf-row__p">
            No invoices yet. One is issued for each order you pay for.
          </p>
        ) : (
          <table className="wf-tbl">
            <thead>
              <tr>
                <th>Invoice</th>
                <th className="num">Date</th>
                <th className="num">Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {invoiced.map((order) => (
                <tr
                  key={order.id}
                  style={{ cursor: "pointer" }}
                  onClick={() => setSelectedId(order.id)}
                >
                  <td>
                    <div className="wf-tbl__t">{order.number}</div>
                    <div className="wf-tbl__d">{order.itemsSummary}</div>
                  </td>
                  <td className="num">
                    <span className="wf-tbl__m">
                      {shortOrderDate(order.paidAt ?? order.placedAt)}
                    </span>
                  </td>
                  <td className="num">
                    <span className="wf-tbl__n">{order.totalLabel}</span>
                  </td>
                  <td>
                    <span
                      className={
                        order.status === "refunded"
                          ? "wf-badge wf-badge--mut"
                          : "wf-badge wf-badge--on"
                      }
                    >
                      {order.status === "refunded" ? "Refunded" : "Paid"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="wf-sec">
          <p className="wf-sec__lbl">Billing details</p>
        </div>
        <div className="wf-frows">
          <div className="wf-frow">
            <span className="wf-frow__l">Billed to</span>
            <span className="wf-frow__v">{full}</span>
          </div>
          <div className="wf-frow">
            <span className="wf-frow__l">Currency</span>
            <span className="wf-frow__v">{currency}</span>
          </div>
        </div>

        {selected ? (
          <div className="wf-conn" style={{ marginTop: 28 }}>
            <p className="wf-sec__lbl">Invoice</p>
            <h2 className="wf-insp__t">{selected.number}</h2>
            <div className="wf-doc__head">
              <span
                className={
                  selected.status === "refunded"
                    ? "wf-badge wf-badge--mut"
                    : "wf-badge wf-badge--on"
                }
              >
                {selected.status === "refunded" ? "Refunded" : "Paid"}
              </span>
              <span className="wf-doc__date">
                {selected.paidAt
                  ? `Paid ${shortOrderDate(selected.paidAt)}`
                  : `Placed ${shortOrderDate(selected.placedAt)}`}
              </span>
            </div>
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
            <button
              type="button"
              className="wf-btn ghost"
              style={{ marginTop: 16 }}
              onClick={() => setSelectedId(null)}
            >
              Close
            </button>
          </div>
        ) : null}
      </div>
    </AccountWireFrame>
  );
}
