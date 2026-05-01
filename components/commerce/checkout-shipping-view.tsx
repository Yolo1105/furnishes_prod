"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Home as HomeIcon, Briefcase, MapPin } from "lucide-react";
import {
  Eyebrow,
  SectionCard,
  Field,
  Toggle,
  useToast,
} from "@/components/eva-dashboard/account/shared";
import { StepIndicator } from "@/components/commerce/step-indicator";
import { OrderSummaryPanel } from "@/components/commerce/order-summary-panel";
import { computeOrderSummary } from "@/lib/commerce/order-summary";
import {
  COMMERCE_DEFAULT_COUNTRY_LABEL,
  formatAddressPostalLine,
} from "@/lib/commerce/region";
import type { Address, CartItem } from "@/lib/site/commerce/types";
import { useCheckoutBootstrap } from "@/hooks/use-checkout-bootstrap";
import { CHECKOUT_SESSION_KEYS } from "@/lib/site/commerce/checkout-session-storage";

export function CheckoutShippingView() {
  const router = useRouter();
  const bootstrap = useCheckoutBootstrap();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [billingSame, setBillingSame] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (bootstrap.loading) return;
    queueMicrotask(() => {
      setAddresses(bootstrap.addresses);
      if (bootstrap.addresses.length > 0) {
        setSelectedId(
          bootstrap.addresses.find((a) => a.isDefault)?.id ??
            bootstrap.addresses[0]!.id,
        );
      } else {
        setSelectedId(null);
      }
    });
  }, [bootstrap.loading, bootstrap.addresses]);

  const cartItems: CartItem[] = bootstrap.cart?.items ?? [];
  const summary = computeOrderSummary(
    cartItems,
    0,
    bootstrap.cart?.giftDiscountCents ?? 0,
  );

  const handleContinue = () => {
    if (!selectedId) {
      toast.error("Pick a saved address to continue");
      return;
    }
    try {
      sessionStorage.setItem(
        CHECKOUT_SESSION_KEYS.shippingAddressId,
        selectedId,
      );
    } catch {
      // ignore
    }
    router.push("/checkout/delivery");
  };

  const blocked =
    !bootstrap.loading && (!bootstrap.authenticated || cartItems.length === 0);

  return (
    <>
      <StepIndicator current="shipping" />

      <div className="mx-auto w-full max-w-[1320px] px-6 py-8 sm:px-8 md:py-10 lg:px-10">
        <header className="mb-8">
          <Eyebrow>01 · SHIPPING</Eyebrow>
          <h1
            className="font-display mt-3 text-3xl md:text-[32px]"
            style={{ color: "var(--foreground)" }}
          >
            Where should we send it?
          </h1>
          <p
            className="font-body mt-2 max-w-xl text-sm"
            style={{ color: "var(--muted-foreground)" }}
          >
            Pick a saved address. {COMMERCE_DEFAULT_COUNTRY_LABEL} only, for
            now. Add or edit addresses in your profile.
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
                : "Your cart is empty — add something before checkout."}
            </p>
            <Link
              href={
                !bootstrap.authenticated
                  ? "/login?next=/checkout/shipping"
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
            <div className="space-y-4">
              {addresses.length === 0 ? (
                <SectionCard padding="lg" tone="muted">
                  <p
                    className="font-body text-sm"
                    style={{ color: "var(--foreground)" }}
                  >
                    You don&apos;t have a saved address yet. Add one in your
                    profile, then return here.
                  </p>
                  <Link
                    href="/account/profile/addresses"
                    className="font-ui mt-4 inline-block text-[11px] tracking-[0.18em] uppercase underline"
                    style={{ color: "var(--primary)" }}
                  >
                    Manage addresses
                  </Link>
                </SectionCard>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {addresses.map((a) => (
                    <AddressPickerCard
                      key={a.id}
                      address={a}
                      selected={selectedId === a.id}
                      onSelect={() => setSelectedId(a.id)}
                    />
                  ))}
                </div>
              )}

              <SectionCard padding="lg">
                <Field label="Billing address same as shipping" layout="inline">
                  <Toggle
                    checked={billingSame}
                    onChange={setBillingSame}
                    label="Billing same as shipping"
                  />
                </Field>
              </SectionCard>
            </div>

            <OrderSummaryPanel
              items={cartItems}
              summary={summary}
              ctaLabel="Continue to delivery"
              onContinue={handleContinue}
              continueDisabled={!selectedId || addresses.length === 0}
              continueTestId="shipping-continue"
            />
          </div>
        )}
      </div>
    </>
  );
}

function AddressPickerCard({
  address,
  selected,
  onSelect,
}: {
  address: Address;
  selected: boolean;
  onSelect: () => void;
}) {
  const Icon =
    address.label === "Home"
      ? HomeIcon
      : address.label === "Work"
        ? Briefcase
        : MapPin;
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className="relative flex flex-col items-start border p-4 text-left transition-colors"
      style={{
        background: selected ? "var(--accent-soft)" : "var(--card)",
        borderColor: selected ? "var(--primary)" : "var(--border)",
      }}
    >
      <div className="flex w-full items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon
            className="h-3.5 w-3.5"
            style={{
              color: selected ? "var(--primary)" : "var(--muted-foreground)",
            }}
          />
          <span
            className="font-ui text-[10.5px] tracking-[0.2em] uppercase"
            style={{
              color: selected ? "var(--primary)" : "var(--muted-foreground)",
            }}
          >
            {address.label}
          </span>
          {address.isDefault && (
            <span
              className="font-ui border px-1.5 py-0.5 text-[9px] tracking-[0.16em] uppercase"
              style={{
                borderColor: "var(--border-strong)",
                color: "var(--muted-foreground)",
              }}
            >
              Default
            </span>
          )}
        </div>
        {selected && (
          <span
            className="inline-flex h-5 w-5 items-center justify-center"
            style={{
              background: "var(--primary)",
              color: "var(--primary-foreground)",
            }}
          >
            <Check className="h-3 w-3" />
          </span>
        )}
      </div>
      <p
        className="font-body mt-3 text-sm leading-relaxed"
        style={{ color: "var(--foreground)" }}
      >
        <span className="font-ui" style={{ color: "var(--foreground)" }}>
          {address.recipientName}
        </span>
        <br />
        {address.street}
        {address.unit ? `, ${address.unit}` : ""}
        <br />
        {formatAddressPostalLine(address.postalCode)}
      </p>
    </button>
  );
}
