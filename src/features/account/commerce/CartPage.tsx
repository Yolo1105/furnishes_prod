"use client";

import Link from "next/link";
import { useState } from "react";
import {
  accountRequest,
  isAccountApiError,
} from "@/features/account/account-api";
import { AccountWireFrame } from "@/features/account/primitives/AccountWireFrame";
import { AccountWireHeader } from "@/features/account/primitives/AccountWireHeader";
import type { CartDto } from "@/server/commerce/cart-service";

/**
 * Cart backed by the server cart. Quantities and removals write through, so a
 * refresh shows the same basket — the wireframe it replaces kept items in local
 * state and lost them.
 */
export function CartPage({ initialCart }: { initialCart: CartDto }) {
  const [cart, setCart] = useState(initialCart);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  function flash(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 2000);
  }

  async function setQuantity(lineId: string, quantity: number) {
    setBusy(true);
    try {
      setCart(
        await accountRequest<CartDto>(
          `/api/account/commerce/cart/items/${lineId}`,
          { method: "PATCH", body: JSON.stringify({ quantity }) },
        ),
      );
    } catch (caught) {
      flash(
        isAccountApiError(caught)
          ? caught.message
          : "Could not update the cart.",
      );
    } finally {
      setBusy(false);
    }
  }

  const empty = cart.lines.length === 0;

  return (
    <AccountWireFrame>
      <AccountWireHeader
        eyebrow="Account"
        title="Cart"
        subtitle="Pieces ready for checkout, across your projects."
      />

      <div className="wf-cart">
        <div className="wf-list">
          {empty ? (
            <p className="wf-row__p" style={{ padding: "18px 0" }}>
              Your cart is empty.{" "}
              <Link href="/account/collections">Browse the collection →</Link>
            </p>
          ) : (
            cart.lines.map((line) => (
              <div className="wf-row" key={line.id}>
                <div className="wf-thumb" />
                <div className="wf-row__main">
                  <span className="wf-row__t">
                    {line.productName} — {line.variantName}
                  </span>
                  <span className="wf-row__p">
                    {line.unitPriceLabel} each
                    {line.catalogPriceLabel
                      ? ` · now ${line.catalogPriceLabel} in the catalog, yours held`
                      : ""}
                  </span>
                </div>
                <div className="wf-qty">
                  <button
                    type="button"
                    className="wf-x"
                    aria-label={`Decrease ${line.productName}`}
                    disabled={busy}
                    onClick={() => void setQuantity(line.id, line.quantity - 1)}
                  >
                    −
                  </button>
                  <span className="wf-num" aria-live="polite">
                    {line.quantity}
                  </span>
                  <button
                    type="button"
                    className="wf-x"
                    aria-label={`Increase ${line.productName}`}
                    disabled={busy}
                    onClick={() => void setQuantity(line.id, line.quantity + 1)}
                  >
                    +
                  </button>
                </div>
                <span className="wf-row__m">{line.lineTotalLabel}</span>
                <button
                  type="button"
                  className="wf-x"
                  aria-label={`Remove ${line.productName}`}
                  disabled={busy}
                  onClick={() => void setQuantity(line.id, 0)}
                >
                  ✕
                </button>
              </div>
            ))
          )}
        </div>
        <aside className="wf-sum">
          <p className="wf-sec__lbl" style={{ margin: "0 0 13px" }}>
            Order summary
          </p>
          <div className="wf-sum__row">
            <span>Subtotal</span>
            <span className="wf-num">{cart.subtotalLabel}</span>
          </div>
          <div className="wf-sum__row">
            <span>Delivery</span>
            <span className="wf-num">{cart.shippingLabel}</span>
          </div>
          {cart.totals.taxPercent > 0 ? (
            <div className="wf-sum__row">
              <span>
                {cart.totals.taxLabel} ({cart.totals.taxPercent}%)
              </span>
              <span className="wf-num">{cart.taxAmountLabel}</span>
            </div>
          ) : null}
          <div className="wf-sum__total">
            <span>Total</span>
            <span>{cart.totalLabel}</span>
          </div>
          {empty ? (
            <span
              className="wf-btn"
              aria-disabled="true"
              style={{
                marginTop: 18,
                width: "100%",
                justifyContent: "center",
                height: 38,
                opacity: 0.5,
              }}
            >
              Checkout →
            </span>
          ) : (
            <Link
              className="wf-btn"
              href="/account/checkout"
              style={{
                marginTop: 18,
                width: "100%",
                justifyContent: "center",
                height: 38,
              }}
            >
              Checkout →
            </Link>
          )}
        </aside>
      </div>

      <div className={`wf-toast${toast ? " show" : ""}`}>{toast ?? ""}</div>
    </AccountWireFrame>
  );
}
