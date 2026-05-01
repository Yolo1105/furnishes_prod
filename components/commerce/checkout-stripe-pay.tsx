"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import {
  Eyebrow,
  SectionCard,
} from "@/components/eva-dashboard/account/shared";

const publishableKey =
  typeof process !== "undefined"
    ? (process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim() ?? "")
    : "";

const stripePromise = publishableKey ? loadStripe(publishableKey) : null;

function PayForm({ orderId }: { orderId: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setBusy(true);
    setErr(null);
    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/checkout/success/${orderId}`,
      },
    });
    setBusy(false);
    if (error) {
      setErr(error.message ?? "Payment could not be completed.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div data-testid="stripe-element">
        <PaymentElement />
      </div>
      {err && (
        <p className="font-body text-sm text-red-600" role="alert">
          {err}
        </p>
      )}
      <button
        type="submit"
        disabled={!stripe || busy}
        data-testid="stripe-pay-submit"
        className="font-ui h-12 w-full border text-[11px] tracking-[0.18em] uppercase transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
        style={{
          background: "var(--primary)",
          color: "var(--primary-foreground)",
          borderColor: "var(--primary)",
        }}
      >
        {busy ? "Processing…" : "Pay securely"}
      </button>
    </form>
  );
}

export function CheckoutStripePay({ orderId }: { orderId: string }) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const options = useMemo(
    () => (clientSecret ? { clientSecret } : undefined),
    [clientSecret],
  );

  useEffect(() => {
    let cancelled = false;
    fetch("/api/checkout/intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId }),
    })
      .then(async (res) => {
        const data = (await res.json()) as {
          clientSecret?: string;
          message?: string;
          error?: string;
        };
        if (!res.ok) {
          throw new Error(
            data.message ?? data.error ?? "Could not start payment",
          );
        }
        if (!data.clientSecret) throw new Error("Missing client secret");
        return data.clientSecret;
      })
      .then((cs) => {
        if (!cancelled) setClientSecret(cs);
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Payment setup failed");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  if (!stripePromise || !publishableKey) {
    return (
      <SectionCard padding="lg" tone="muted">
        <p className="font-body text-sm" style={{ color: "var(--foreground)" }}>
          Set{" "}
          <code className="text-xs">NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</code> to
          enable card / PayNow collection.
        </p>
      </SectionCard>
    );
  }

  if (error) {
    return (
      <SectionCard padding="lg" tone="muted">
        <p className="font-body text-sm text-red-700">{error}</p>
        <Link
          href="/checkout/review"
          className="font-ui mt-4 inline-block text-[11px] tracking-[0.18em] uppercase underline"
          style={{ color: "var(--primary)" }}
        >
          Back to review
        </Link>
      </SectionCard>
    );
  }

  if (!options) {
    return (
      <p
        className="font-body text-sm"
        style={{ color: "var(--muted-foreground)" }}
      >
        Preparing secure checkout…
      </p>
    );
  }

  return (
    <Elements stripe={stripePromise} options={options}>
      <PayForm orderId={orderId} />
    </Elements>
  );
}

export function CheckoutPayHeader() {
  return (
    <header className="mb-8">
      <Eyebrow>PAYMENT</Eyebrow>
      <h1
        className="font-display mt-3 text-3xl md:text-[32px]"
        style={{ color: "var(--foreground)" }}
      >
        Complete payment
      </h1>
      <p
        className="font-body mt-2 max-w-xl text-sm"
        style={{ color: "var(--muted-foreground)" }}
      >
        Secured by Stripe. You’ll return here after PayNow or 3D Secure if
        required.
      </p>
    </header>
  );
}
