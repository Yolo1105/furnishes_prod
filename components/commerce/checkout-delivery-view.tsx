"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Truck, Calendar, Package, Clock } from "lucide-react";
import Link from "next/link";
import {
  Eyebrow,
  SectionCard,
  useToast,
} from "@/components/eva-dashboard/account/shared";
import { StepIndicator } from "@/components/commerce/step-indicator";
import { OrderSummaryPanel } from "@/components/commerce/order-summary-panel";
import {
  listDeliveryOptions,
  formatETARange,
} from "@/lib/commerce/delivery-options";
import { computeOrderSummary } from "@/lib/commerce/order-summary";
import type { DeliveryOption } from "@/lib/site/commerce/types";
import { formatSGD } from "@/lib/site/money";
import { useCheckoutBootstrap } from "@/hooks/use-checkout-bootstrap";
import {
  CHECKOUT_SESSION_KEYS,
  deliveryOptionToPayload,
} from "@/lib/site/commerce/checkout-session-storage";

const ICON_MAP: Record<
  DeliveryOption["kind"],
  React.ComponentType<{ className?: string }>
> = {
  standard: Truck,
  scheduled: Calendar,
  "white-glove": Package,
};

export function CheckoutDeliveryView() {
  const router = useRouter();
  const bootstrap = useCheckoutBootstrap();
  const options = listDeliveryOptions();
  const [selectedId, setSelectedId] = useState<string | null>(
    options[0]?.id ?? null,
  );
  const { toast } = useToast();

  const cartItems = bootstrap.cart?.items ?? [];
  const selected = options.find((o) => o.id === selectedId);
  const summary = computeOrderSummary(
    cartItems,
    selected?.priceCents ?? 0,
    bootstrap.cart?.giftDiscountCents ?? 0,
  );

  const blocked =
    !bootstrap.loading && (!bootstrap.authenticated || cartItems.length === 0);

  return (
    <>
      <StepIndicator current="delivery" />

      <div className="mx-auto w-full max-w-[1320px] px-6 py-8 sm:px-8 md:py-10 lg:px-10">
        <header className="mb-8">
          <Eyebrow>02 · DELIVERY</Eyebrow>
          <h1
            className="font-display mt-3 text-3xl md:text-[32px]"
            style={{ color: "var(--foreground)" }}
          >
            How soon, how carefully?
          </h1>
          <p
            className="font-body mt-2 max-w-xl text-sm"
            style={{ color: "var(--muted-foreground)" }}
          >
            Large items like sofas and wardrobes are eligible for white-glove
            installation — our team delivers, assembles, and clears the boxes.
          </p>
        </header>

        {bootstrap.loading ? (
          <p
            className="font-body text-sm"
            style={{ color: "var(--muted-foreground)" }}
          >
            Loading…
          </p>
        ) : blocked ? (
          <SectionCard padding="lg" tone="muted">
            <p
              className="font-body text-sm"
              style={{ color: "var(--foreground)" }}
            >
              {!bootstrap.authenticated
                ? "Sign in to continue checkout."
                : "Your cart is empty."}
            </p>
            <Link
              href={
                !bootstrap.authenticated
                  ? "/login?next=/checkout/delivery"
                  : "/collections"
              }
              className="font-ui mt-4 inline-block text-[11px] tracking-[0.18em] uppercase underline"
              style={{ color: "var(--primary)" }}
            >
              {!bootstrap.authenticated ? "Sign in" : "Browse collections"}
            </Link>
          </SectionCard>
        ) : (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)]">
            <div className="space-y-3">
              {options.map((option) => (
                <DeliveryOptionCard
                  key={option.id}
                  option={option}
                  selected={selectedId === option.id}
                  onSelect={() => setSelectedId(option.id)}
                />
              ))}

              <SectionCard padding="lg" tone="muted" className="mt-4">
                <div className="flex items-start gap-3">
                  <Clock
                    className="mt-0.5 h-4 w-4 shrink-0"
                    style={{ color: "var(--primary)" }}
                  />
                  <div>
                    <h4
                      className="font-ui text-sm"
                      style={{ color: "var(--foreground)" }}
                    >
                      A note on lead times
                    </h4>
                    <p
                      className="font-body mt-1 text-xs"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      Some pieces are made to order. We&apos;ll share a firm
                      delivery window after you place the order — if anything
                      shifts by more than 3 days, we&apos;ll email and give you
                      the option to cancel with a full refund.
                    </p>
                  </div>
                </div>
              </SectionCard>
            </div>

            <OrderSummaryPanel
              items={cartItems}
              summary={summary}
              ctaLabel="Continue to review"
              onContinue={() => {
                if (!selectedId) {
                  toast.error("Pick a delivery option");
                  return;
                }
                const option = options.find((o) => o.id === selectedId);
                if (option) {
                  try {
                    sessionStorage.setItem(
                      CHECKOUT_SESSION_KEYS.delivery,
                      JSON.stringify(deliveryOptionToPayload(option)),
                    );
                  } catch {
                    // ignore
                  }
                }
                router.push("/checkout/review");
              }}
              continueDisabled={!selectedId}
            />
          </div>
        )}
      </div>
    </>
  );
}

function DeliveryOptionCard({
  option,
  selected,
  onSelect,
}: {
  option: DeliveryOption;
  selected: boolean;
  onSelect: () => void;
}) {
  const Icon = ICON_MAP[option.kind];
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className="flex w-full items-start gap-4 border p-5 text-left transition-colors"
      style={{
        background: selected ? "var(--accent-soft)" : "var(--card)",
        borderColor: selected ? "var(--primary)" : "var(--border)",
      }}
    >
      <div
        className="inline-flex h-10 w-10 shrink-0 items-center justify-center border"
        style={{
          background: selected ? "var(--primary)" : "var(--muted)",
          borderColor: selected ? "var(--primary)" : "var(--border)",
          color: selected ? "var(--primary-foreground)" : "var(--foreground)",
        }}
      >
        <Icon className="h-4 w-4" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <h3
            className="font-display text-base"
            style={{ color: "var(--foreground)" }}
          >
            {option.label}
          </h3>
          <div
            className="font-ui shrink-0 tabular-nums"
            style={{ color: "var(--foreground)" }}
          >
            {option.priceCents === 0 ? "Free" : formatSGD(option.priceCents)}
          </div>
        </div>
        <p
          className="font-body mt-1 text-sm"
          style={{ color: "var(--muted-foreground)" }}
        >
          {option.subtitle}
        </p>
        <div
          className="font-ui mt-2 text-xs tracking-wide"
          style={{ color: "var(--muted-foreground)" }}
        >
          Arrives {formatETARange(option.etaFrom, option.etaTo)}
        </div>
      </div>

      <div className="shrink-0 self-center">
        {selected ? (
          <span
            className="inline-flex h-5 w-5 items-center justify-center"
            style={{
              background: "var(--primary)",
              color: "var(--primary-foreground)",
            }}
          >
            <Check className="h-3 w-3" />
          </span>
        ) : (
          <span
            className="inline-block h-5 w-5 border"
            style={{ borderColor: "var(--border-strong)" }}
          />
        )}
      </div>
    </button>
  );
}
