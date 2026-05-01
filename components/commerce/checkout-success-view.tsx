"use client";

import Link from "next/link";
import { Check, AlertTriangle } from "lucide-react";
import type { OrderStatus } from "@prisma/client";
import {
  Eyebrow,
  SectionCard,
} from "@/components/eva-dashboard/account/shared";

export function CheckoutSuccessView({
  orderNumber,
  status,
}: {
  orderNumber: string;
  status: OrderStatus;
}) {
  if (status === "cancelled") {
    return (
      <div className="mx-auto w-full max-w-[720px] px-6 py-16 text-center sm:px-8 lg:px-10">
        <div
          className="mx-auto inline-flex h-16 w-16 items-center justify-center"
          style={{
            background: "var(--destructive)",
            color: "var(--destructive-foreground)",
          }}
        >
          <AlertTriangle className="h-7 w-7" />
        </div>
        <h1
          className="font-display mt-6 text-3xl"
          style={{ color: "var(--foreground)" }}
        >
          Payment didn&apos;t go through
        </h1>
        <p
          className="font-body mx-auto mt-3 max-w-md text-sm"
          style={{ color: "var(--muted-foreground)" }}
        >
          This order was cancelled after the payment attempt. You haven&apos;t
          been charged. You can return to your bag and try again.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/cart"
            className="font-ui inline-flex items-center gap-2 border px-4 py-2.5 text-[10.5px] tracking-[0.14em] uppercase"
            style={{
              background: "var(--primary)",
              color: "var(--primary-foreground)",
              borderColor: "var(--primary)",
            }}
          >
            Back to cart
          </Link>
          <Link
            href="/account/orders"
            className="font-ui inline-flex items-center gap-2 border px-4 py-2.5 text-[10.5px] tracking-[0.14em] uppercase"
            style={{
              background: "var(--card)",
              color: "var(--foreground)",
              borderColor: "var(--border-strong)",
            }}
          >
            Order history
          </Link>
        </div>
      </div>
    );
  }

  if (status === "placed") {
    return (
      <div className="mx-auto w-full max-w-[720px] px-6 py-16 text-center sm:px-8 lg:px-10">
        <Eyebrow>CONFIRMING PAYMENT</Eyebrow>
        <h1
          className="font-display mt-4 text-3xl"
          style={{ color: "var(--foreground)" }}
        >
          Hang tight — confirming your payment
        </h1>
        <p
          className="font-body mx-auto mt-3 max-w-md text-sm"
          style={{ color: "var(--muted-foreground)" }}
        >
          Order{" "}
          <span className="font-ui" style={{ color: "var(--foreground)" }}>
            {orderNumber}
          </span>{" "}
          is still being confirmed with your bank. This usually takes a few
          seconds. Refresh this page or check{" "}
          <Link href="/account/orders" className="underline">
            your orders
          </Link>
          .
        </p>
      </div>
    );
  }

  const confirmed =
    status === "paid" ||
    status === "processing" ||
    status === "shipped" ||
    status === "delivered";

  if (!confirmed) {
    return (
      <div className="mx-auto w-full max-w-[720px] px-6 py-16 text-center sm:px-8 lg:px-10">
        <p
          className="font-body text-sm"
          style={{ color: "var(--muted-foreground)" }}
        >
          Order {orderNumber} is in state &quot;{status}&quot;. See{" "}
          <Link href="/account/orders" className="underline">
            orders
          </Link>{" "}
          for updates.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[720px] px-6 py-16 text-center sm:px-8 lg:px-10">
      <div
        className="mx-auto inline-flex h-16 w-16 items-center justify-center"
        style={{
          background: "var(--primary)",
          color: "var(--primary-foreground)",
        }}
      >
        <Check className="h-7 w-7" />
      </div>

      <div className="mt-6">
        <Eyebrow>ORDER PLACED</Eyebrow>
      </div>
      <h1
        className="font-display mt-5 text-4xl"
        data-testid="order-confirmation"
        style={{ color: "var(--foreground)" }}
      >
        We&apos;ve got it from here.
      </h1>
      <p
        className="font-body mx-auto mt-3 max-w-md text-sm"
        style={{ color: "var(--muted-foreground)" }}
      >
        Order{" "}
        <span
          className="font-ui"
          data-testid="order-number"
          style={{ color: "var(--foreground)" }}
        >
          {orderNumber}
        </span>{" "}
        is confirmed. We&apos;ve sent a receipt to your email when payment
        cleared — we will follow up with any order updates we can share.
      </p>

      <SectionCard padding="lg" tone="soft" className="mt-8 text-left">
        <Eyebrow>WHAT HAPPENS NEXT</Eyebrow>
        <ol
          className="font-body mt-4 space-y-3 text-sm"
          style={{ color: "var(--foreground)" }}
        >
          <li className="flex gap-3">
            <span
              className="font-display shrink-0 tabular-nums"
              style={{ color: "var(--primary)" }}
            >
              01
            </span>
            <span>
              We send a confirmation email with your receipt and order summary.
            </span>
          </li>
          <li className="flex gap-3">
            <span
              className="font-display shrink-0 tabular-nums"
              style={{ color: "var(--primary)" }}
            >
              02
            </span>
            <span>
              Within 1 business day, we share a firm delivery window. If
              anything shifts, you&apos;ll know.
            </span>
          </li>
          <li className="flex gap-3">
            <span
              className="font-display shrink-0 tabular-nums"
              style={{ color: "var(--primary)" }}
            >
              03
            </span>
            <span>
              Your pieces arrive. White-glove? We assemble. Standard?
              You&apos;re the boss.
            </span>
          </li>
        </ol>
      </SectionCard>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          href="/account"
          className="font-ui inline-flex items-center gap-2 border px-4 py-2.5 text-[10.5px] tracking-[0.14em] uppercase"
          style={{
            background: "var(--primary)",
            color: "var(--primary-foreground)",
            borderColor: "var(--primary)",
          }}
        >
          Back to Studio
        </Link>
        <Link
          href="/collections"
          className="font-ui inline-flex items-center gap-2 border px-4 py-2.5 text-[10.5px] tracking-[0.14em] uppercase"
          style={{
            background: "var(--card)",
            color: "var(--foreground)",
            borderColor: "var(--border-strong)",
          }}
        >
          Keep browsing
        </Link>
      </div>
    </div>
  );
}
