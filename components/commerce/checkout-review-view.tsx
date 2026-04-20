"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Edit3 } from "lucide-react";
import { DeliveryMethod } from "@prisma/client";
import {
  Eyebrow,
  SectionCard,
  useToast,
} from "@/components/eva-dashboard/account/shared";
import { StepIndicator } from "@/components/commerce/step-indicator";
import { formatSGD } from "@/lib/site/money";
import {
  formatETARange,
  getDeliveryOptionByPrismaMethod,
} from "@/lib/commerce/delivery-options";
import { computeOrderSummary } from "@/lib/commerce/order-summary";
import { formatAddressPostalLine } from "@/lib/commerce/region";
import type {
  Address,
  Cart,
  CartItem,
  DeliveryOption,
  OrderSummary,
} from "@/lib/site/commerce/types";
import { useCheckoutBootstrap } from "@/hooks/use-checkout-bootstrap";
import {
  CHECKOUT_SESSION_KEYS,
  readCheckoutDelivery,
} from "@/lib/site/commerce/checkout-session-storage";
import type { CheckoutBootstrap } from "@/hooks/use-checkout-bootstrap";

function buildReviewDisplay(bootstrap: CheckoutBootstrap): {
  cart: Cart;
  addr: Address | null;
  delivery: DeliveryOption | null;
  summary: OrderSummary;
} | null {
  const cart: Cart | null = bootstrap.cart;
  if (!cart || cart.items.filter((i) => !i.savedForLater).length === 0) {
    return null;
  }

  const shipId =
    typeof sessionStorage !== "undefined"
      ? sessionStorage.getItem(CHECKOUT_SESSION_KEYS.shippingAddressId)
      : null;

  let addr: Address | null = null;
  if (shipId && bootstrap.addresses.length > 0) {
    addr =
      bootstrap.addresses.find((a) => a.id === shipId) ??
      bootstrap.addresses.find((a) => a.isDefault) ??
      bootstrap.addresses[0] ??
      null;
  } else if (bootstrap.addresses.length > 0) {
    addr =
      bootstrap.addresses.find((a) => a.isDefault) ??
      bootstrap.addresses[0] ??
      null;
  }

  const delPayload =
    typeof window !== "undefined" ? readCheckoutDelivery() : null;
  let delivery: DeliveryOption | null = null;
  if (delPayload) {
    const base = getDeliveryOptionByPrismaMethod(
      delPayload.deliveryMethod as DeliveryMethod,
    );
    delivery = {
      ...base,
      priceCents: delPayload.deliveryCents,
    };
  }

  const activeItems = cart.items.filter((i) => !i.savedForLater);
  const summary = computeOrderSummary(
    activeItems,
    delivery?.priceCents ?? 0,
    cart.giftDiscountCents ?? 0,
  );

  return { cart, addr, delivery, summary };
}

const stripePublishableConfigured = Boolean(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim(),
);

export function CheckoutReviewView() {
  const router = useRouter();
  const bootstrap = useCheckoutBootstrap();
  const [display, setDisplay] = useState<{
    cart: Cart;
    addr: Address | null;
    delivery: DeliveryOption | null;
    summary: OrderSummary;
  } | null>(null);
  const [placing, setPlacing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (bootstrap.loading) return;
    setDisplay(buildReviewDisplay(bootstrap));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bootstrap.loading, bootstrap.cart, bootstrap.addresses]);

  const ready =
    display &&
    display.addr &&
    display.delivery &&
    display.cart.items.filter((i) => !i.savedForLater).length > 0;

  const handlePlace = async () => {
    if (!bootstrap.commerceBackendEnabled) {
      toast.error("Commerce checkout is not enabled on this deployment.");
      return;
    }

    if (!bootstrap.authenticated) {
      toast.error("Sign in to place an order.");
      router.push("/login?next=/checkout/review");
      return;
    }

    const shippingAddressId = sessionStorage.getItem(
      CHECKOUT_SESSION_KEYS.shippingAddressId,
    );
    const del = readCheckoutDelivery();

    if (!shippingAddressId || !del) {
      toast.error("Complete shipping and delivery steps first.");
      return;
    }

    if (!stripePublishableConfigured) {
      toast.error(
        "Online payment is not configured on this deployment (missing NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY).",
      );
      return;
    }

    setPlacing(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shippingAddressId,
          deliveryMethod: del.deliveryMethod,
          deliveryCents: del.deliveryCents,
        }),
      });
      const data = (await res.json()) as {
        orderId?: string;
        message?: string;
        error?: string;
      };
      if (!res.ok) {
        toast.error(
          typeof data.message === "string"
            ? data.message
            : (data.error ?? "Could not create order"),
        );
        return;
      }
      const orderId = data.orderId;
      if (!orderId) {
        toast.error("Invalid response from server.");
        return;
      }

      router.push(`/checkout/pay/${orderId}`);
    } catch {
      toast.error("Network error.");
    } finally {
      setPlacing(false);
    }
  };

  if (bootstrap.loading) {
    return (
      <>
        <StepIndicator current="review" />
        <div className="mx-auto max-w-[880px] px-6 py-10">
          <p
            className="font-body text-sm"
            style={{ color: "var(--muted-foreground)" }}
          >
            Loading…
          </p>
        </div>
      </>
    );
  }

  if (!display || !ready) {
    return (
      <>
        <StepIndicator current="review" />
        <div className="mx-auto max-w-[880px] px-6 py-10">
          <SectionCard padding="lg" tone="muted">
            <p
              className="font-body text-sm"
              style={{ color: "var(--foreground)" }}
            >
              {!bootstrap.cart?.items.length
                ? "Your cart is empty."
                : "Choose a shipping address and delivery option first."}
            </p>
            <Link
              href={
                !bootstrap.cart?.items.length
                  ? "/collections"
                  : "/checkout/shipping"
              }
              className="font-ui mt-4 inline-block text-[11px] tracking-[0.18em] uppercase underline"
              style={{ color: "var(--primary)" }}
            >
              {!bootstrap.cart?.items.length ? "Browse" : "Back to shipping"}
            </Link>
          </SectionCard>
        </div>
      </>
    );
  }

  if (!stripePublishableConfigured) {
    return (
      <>
        <StepIndicator current="review" />
        <div className="mx-auto max-w-[880px] px-6 py-10">
          <SectionCard padding="lg" tone="muted">
            <Eyebrow>PAYMENT NOT AVAILABLE</Eyebrow>
            <p
              className="font-body mt-3 text-sm leading-relaxed"
              style={{ color: "var(--foreground)" }}
            >
              Checkout cannot continue because online payments are not
              configured. The site needs{" "}
              <span className="font-mono text-xs">
                NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
              </span>{" "}
              (and Stripe server keys) before orders can be placed.
            </p>
            <Link
              href="/cart"
              className="font-ui mt-6 inline-block text-[11px] tracking-[0.18em] uppercase underline"
              style={{ color: "var(--primary)" }}
            >
              Back to cart
            </Link>
          </SectionCard>
        </div>
      </>
    );
  }

  const { cart, addr, delivery, summary } = display;

  return (
    <>
      <StepIndicator current="review" />

      <div className="mx-auto w-full max-w-[880px] px-6 py-8 sm:px-8 md:py-10 lg:px-10">
        <header className="mb-8">
          <Eyebrow>03 · REVIEW</Eyebrow>
          <h1
            className="font-display mt-3 text-3xl md:text-[32px]"
            style={{ color: "var(--foreground)" }}
          >
            Does everything look right?
          </h1>
          <p
            className="font-body mt-2 max-w-xl text-sm"
            style={{ color: "var(--muted-foreground)" }}
          >
            After you place the order, you&apos;ll pay securely with Stripe
            (card or PayNow). Nothing is charged until you complete payment on
            the next screen.
          </p>
        </header>

        <div className="space-y-4">
          <ReviewBlock eyebrow="ITEMS" editHref="/cart">
            <ul className="space-y-2">
              {cart.items
                .filter((i) => !i.savedForLater)
                .map((i: CartItem) => (
                  <li key={i.id} className="flex items-center gap-3">
                    <div
                      className="h-10 w-10 shrink-0 border"
                      style={{
                        background: `linear-gradient(135deg, oklch(0.88 0.08 ${i.coverHue}), oklch(0.62 0.14 ${i.coverHue}))`,
                        borderColor: "var(--border)",
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <div
                        className="font-ui truncate text-sm"
                        style={{ color: "var(--foreground)" }}
                      >
                        {i.productName}
                      </div>
                      <div
                        className="font-body text-xs"
                        style={{ color: "var(--muted-foreground)" }}
                      >
                        Qty {i.qty}
                      </div>
                    </div>
                    <div
                      className="font-ui shrink-0 tabular-nums"
                      style={{ color: "var(--foreground)" }}
                    >
                      {formatSGD(i.unitPriceCents * i.qty)}
                    </div>
                  </li>
                ))}
            </ul>
          </ReviewBlock>

          <ReviewBlock eyebrow="SHIPPING TO" editHref="/checkout/shipping">
            <p
              className="font-body text-sm leading-relaxed"
              style={{ color: "var(--foreground)" }}
            >
              <span className="font-ui">{addr!.recipientName}</span> ·{" "}
              {addr!.phone}
              <br />
              {addr!.street}
              {addr!.unit ? `, ${addr!.unit}` : ""}
              <br />
              {formatAddressPostalLine(addr!.postalCode)}
            </p>
          </ReviewBlock>

          <ReviewBlock eyebrow="DELIVERY" editHref="/checkout/delivery">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div
                  className="font-ui text-sm"
                  style={{ color: "var(--foreground)" }}
                >
                  {delivery!.label}
                </div>
                <div
                  className="font-body text-xs"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  Arrives {formatETARange(delivery!.etaFrom, delivery!.etaTo)}
                </div>
              </div>
              <span
                className="font-ui tabular-nums"
                style={{ color: "var(--foreground)" }}
              >
                {delivery!.priceCents === 0
                  ? "Free"
                  : formatSGD(delivery!.priceCents)}
              </span>
            </div>
          </ReviewBlock>

          <SectionCard padding="lg" tone="muted">
            <Eyebrow>PAYMENT</Eyebrow>
            <p
              className="font-body mt-2 text-sm"
              style={{ color: "var(--foreground)" }}
            >
              You&apos;ll enter card details or complete PayNow on the secure
              Stripe page after you place this order. We don&apos;t store your
              full card number on Furnishes servers.
            </p>
          </SectionCard>

          <SectionCard padding="lg">
            <dl
              className="font-body space-y-1.5 text-sm"
              style={{ color: "var(--foreground)" }}
            >
              <div className="flex justify-between">
                <dt style={{ color: "var(--muted-foreground)" }}>Subtotal</dt>
                <dd className="tabular-nums">
                  {formatSGD(summary.subtotalCents)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt style={{ color: "var(--muted-foreground)" }}>Delivery</dt>
                <dd className="tabular-nums">
                  {summary.deliveryCents === 0
                    ? "Free"
                    : formatSGD(summary.deliveryCents)}
                </dd>
              </div>
            </dl>
            <div
              className="mt-4 flex items-baseline justify-between border-t pt-3"
              style={{ borderColor: "var(--border)" }}
            >
              <span
                className="font-ui text-[10.5px] tracking-[0.22em] uppercase"
                style={{ color: "var(--muted-foreground)" }}
              >
                Total
              </span>
              <span
                className="font-display text-2xl tabular-nums"
                style={{ color: "var(--foreground)" }}
              >
                {formatSGD(summary.totalCents)}
              </span>
            </div>
          </SectionCard>

          <p
            className="font-body text-xs"
            style={{ color: "var(--muted-foreground)" }}
          >
            By placing this order you agree to Furnishes&apos;{" "}
            <Link href="/terms" className="underline">
              terms of service
            </Link>{" "}
            and{" "}
            <Link href="/privacy-policy" className="underline">
              PDPA consent
            </Link>
            .
          </p>

          <button
            type="button"
            onClick={() => void handlePlace()}
            disabled={placing}
            className="font-ui h-12 w-full border text-[11px] tracking-[0.18em] uppercase transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
            style={{
              background: "var(--primary)",
              color: "var(--primary-foreground)",
              borderColor: "var(--primary)",
            }}
          >
            {placing
              ? "Placing order…"
              : `Place order · ${formatSGD(summary.totalCents)}`}
          </button>
        </div>
      </div>
    </>
  );
}

function ReviewBlock({
  eyebrow,
  editHref,
  children,
}: {
  eyebrow: string;
  editHref?: string;
  children: React.ReactNode;
}) {
  return (
    <SectionCard padding="lg">
      <div className="mb-3 flex items-center justify-between">
        <Eyebrow>{eyebrow}</Eyebrow>
        {editHref && (
          <Link
            href={editHref}
            className="font-ui inline-flex items-center gap-1 text-[10px] tracking-[0.18em] uppercase hover:underline"
            style={{ color: "var(--primary)" }}
          >
            <Edit3 className="h-3 w-3" />
            Edit
          </Link>
        )}
      </div>
      {children}
    </SectionCard>
  );
}
