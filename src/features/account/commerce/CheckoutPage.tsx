"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  accountRequest,
  isAccountApiError,
} from "@/features/account/account-api";
import { AccountWireFrame } from "@/features/account/primitives/AccountWireFrame";
import { AccountWireHeader } from "@/features/account/primitives/AccountWireHeader";
import { useAccountShellUser } from "@/features/account/shell/account-shell-user";
import { accountDisplayParts } from "@/features/account/shell/account-display";
import type { CartDto } from "@/server/commerce/cart-service";
import type { OrderDto } from "@/server/commerce/order-service";

type Step = "Delivery" | "Payment" | "Review";

type PlaceOrderResponse = { order: OrderDto; redirectUrl: string | null };

const FIELDS = [
  { key: "line1", label: "Address", placeholder: "12 Holland Drive" },
  { key: "line2", label: "Unit", placeholder: "#08-21" },
  { key: "city", label: "City", placeholder: "Singapore" },
  { key: "postalCode", label: "Postal code", placeholder: "271012" },
  { key: "country", label: "Country", placeholder: "SG" },
  { key: "phone", label: "Phone", placeholder: "+65 8123 4567" },
] as const;

type FieldKey = (typeof FIELDS)[number]["key"];

/**
 * Real checkout. The total is never sent from here — the server recomputes it
 * from the stored cart, so a tampered client cannot choose its own price.
 *
 * `idempotencyKey` is minted once per mounted attempt, so a double-click or a
 * retried request resolves to the same order instead of charging twice.
 */
export function CheckoutPage({
  initialCart,
  paymentProvider,
}: {
  initialCart: CartDto;
  paymentProvider: string;
}) {
  const router = useRouter();
  const user = useAccountShellUser();
  const { full } = accountDisplayParts(user.displayName, user.email);

  const [step, setStep] = useState<Step>("Delivery");
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [placed, setPlaced] = useState<OrderDto | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [idempotencyKey, setIdempotencyKey] = useState(() =>
    globalThis.crypto.randomUUID(),
  );
  const [address, setAddress] = useState<Record<FieldKey, string>>({
    line1: "",
    line2: "",
    city: "",
    postalCode: "",
    country: "SG",
    phone: "",
  });

  const cart = initialCart;
  const empty = cart.lines.length === 0;

  function flash(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 2600);
  }

  async function placeOrder() {
    setBusy(true);
    setFieldErrors({});
    try {
      const result = await accountRequest<PlaceOrderResponse>(
        "/api/account/commerce/checkout",
        {
          method: "POST",
          body: JSON.stringify({
            address: { recipient: full, ...address },
            idempotencyKey,
          }),
        },
      );
      if (result.redirectUrl) {
        // Hosted checkout: hand off to the provider. Staying `busy` keeps the
        // button dead during the navigation so the order cannot be re-placed.
        window.location.assign(result.redirectUrl);
        return;
      }
      setPlaced(result.order);
      // Refresh so the cart badge and orders list reflect the placed order.
      router.refresh();
    } catch (caught) {
      if (isAccountApiError(caught)) {
        setFieldErrors(caught.fieldErrors ?? {});
        flash(caught.message);
        if (caught.fieldErrors) setStep("Delivery");
        // A rejected attempt must not reuse the key, or a corrected retry would
        // return the (nonexistent) original order.
        if (caught.code === "validation") {
          setIdempotencyKey(globalThis.crypto.randomUUID());
        }
      } else {
        flash("Could not place the order.");
      }
    } finally {
      setBusy(false);
    }
  }

  if (placed) {
    return (
      <AccountWireFrame>
        <AccountWireHeader
          eyebrow="Account"
          title="Order placed"
          subtitle={`${placed.number} · ${placed.totalLabel}`}
        />
        <div className="wf-form" style={{ maxWidth: "none" }}>
          <div className="wf-field">
            <span className="wf-field__lbl">Status</span>
            <span className="wf-field__val">
              {placed.status === "paid"
                ? "Paid"
                : "Awaiting payment confirmation"}
            </span>
          </div>
          <div className="wf-field">
            <span className="wf-field__lbl">Items</span>
            <span className="wf-field__val">{placed.itemsSummary}</span>
          </div>
          <div className="wf-field">
            <span className="wf-field__lbl">Delivering to</span>
            <span className="wf-field__val">
              {[placed.shipping.recipient, ...placed.shipping.lines].join(", ")}
            </span>
          </div>
        </div>
        <Link
          className="wf-btn"
          href="/account/orders"
          style={{ marginTop: 18 }}
        >
          View orders →
        </Link>
      </AccountWireFrame>
    );
  }

  return (
    <AccountWireFrame>
      <AccountWireHeader
        eyebrow="Account"
        title="Checkout"
        subtitle="Confirm delivery and payment."
      />

      <div className="wf-tools">
        {(["Delivery", "Payment", "Review"] as const).map((chip) => (
          <button
            key={chip}
            type="button"
            className={step === chip ? "wf-chip on" : "wf-chip"}
            onClick={() => setStep(chip)}
          >
            {chip}
          </button>
        ))}
      </div>

      <div className="wf-cart">
        <div className="wf-form" style={{ maxWidth: "none" }}>
          {step === "Delivery" ? (
            <>
              <p className="wf-sec__lbl" style={{ margin: "0 0 13px" }}>
                Delivery
              </p>
              <div className="wf-field">
                <span className="wf-field__lbl">Recipient</span>
                <span className="wf-field__val">{full}</span>
              </div>
              {FIELDS.map((field) => (
                <label className="wf-field" key={field.key}>
                  <span className="wf-field__lbl">{field.label}</span>
                  <input
                    className="wf-input"
                    value={address[field.key]}
                    placeholder={field.placeholder}
                    aria-invalid={fieldErrors[field.key] ? "true" : undefined}
                    onChange={(event) =>
                      setAddress((prev) => ({
                        ...prev,
                        [field.key]: event.target.value,
                      }))
                    }
                  />
                </label>
              ))}
              {Object.keys(fieldErrors).length > 0 ? (
                <p className="wf-row__p" role="alert">
                  {Object.values(fieldErrors).join(" ")}
                </p>
              ) : null}
            </>
          ) : step === "Payment" ? (
            <>
              <p className="wf-sec__lbl" style={{ margin: "0 0 13px" }}>
                Payment
              </p>
              <div className="wf-field">
                <span className="wf-field__lbl">Method</span>
                <span className="wf-field__val">
                  {paymentProvider === "stripe"
                    ? "Card, collected securely by Stripe"
                    : paymentProvider === "test"
                      ? "Test provider — no card is charged"
                      : "Unavailable"}
                </span>
              </div>
              <p className="wf-row__p">
                {paymentProvider === "stripe"
                  ? "Placing the order opens Stripe's secure page for your card details, then returns you here. No card details are entered on this site."
                  : "This environment settles orders without taking payment."}
              </p>
            </>
          ) : (
            <>
              <p className="wf-sec__lbl" style={{ margin: "0 0 13px" }}>
                Review
              </p>
              {cart.lines.map((line) => (
                <div className="wf-field" key={line.id}>
                  <span className="wf-field__lbl">
                    {line.productName} — {line.variantName} × {line.quantity}
                  </span>
                  <span className="wf-field__val">{line.lineTotalLabel}</span>
                </div>
              ))}
            </>
          )}
        </div>

        <aside className="wf-sum">
          <p className="wf-sec__lbl" style={{ margin: "0 0 13px" }}>
            Review
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
          <button
            type="button"
            className="wf-btn"
            disabled={busy || empty || paymentProvider === "disabled"}
            style={{
              marginTop: 18,
              width: "100%",
              justifyContent: "center",
              height: 38,
            }}
            onClick={() => void placeOrder()}
          >
            {busy
              ? paymentProvider === "stripe"
                ? "Opening secure payment…"
                : "Placing…"
              : empty
                ? "Cart is empty"
                : paymentProvider === "stripe"
                  ? `Pay ${cart.totalLabel} securely`
                  : `Place order · ${cart.totalLabel}`}
          </button>
        </aside>
      </div>

      <div className={`wf-toast${toast ? " show" : ""}`}>{toast ?? ""}</div>
    </AccountWireFrame>
  );
}
