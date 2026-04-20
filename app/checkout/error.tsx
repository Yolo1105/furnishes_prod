"use client";

import { useEffect } from "react";
import { captureException } from "@sentry/nextjs";
import Link from "next/link";
import { AlertTriangle, RefreshCw, ShoppingBag } from "lucide-react";

export default function CheckoutError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[checkout error]", error);
    captureException(error, {
      tags: { boundary: "checkout" },
      extra: { digest: error.digest },
    });
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-[600px] flex-col items-center justify-center px-6 py-16 text-center">
      <div
        className="inline-flex h-12 w-12 items-center justify-center border"
        style={{
          background: "var(--primary)",
          color: "var(--primary-foreground)",
          borderColor: "var(--primary)",
        }}
      >
        <AlertTriangle className="h-5 w-5" />
      </div>
      <div
        className="font-ui mt-5 text-[10.5px] tracking-[0.22em] uppercase"
        style={{ color: "var(--muted-foreground)" }}
      >
        <span style={{ color: "var(--primary)" }}>[ </span>
        CHECKOUT INTERRUPTED
        <span style={{ color: "var(--primary)" }}> ]</span>
      </div>
      <h1
        className="font-display mt-4 text-2xl md:text-3xl"
        style={{ color: "var(--foreground)" }}
      >
        Something broke mid-checkout.
      </h1>
      <p
        className="font-body mt-3 max-w-md text-sm"
        style={{ color: "var(--muted-foreground)" }}
      >
        Your cart is safe and no payment was taken. Retry, or head back to cart
        and try again in a moment.
      </p>

      {error.digest && (
        <p
          className="mt-4 font-mono text-[11px]"
          style={{ color: "var(--muted-foreground)" }}
        >
          Reference: {error.digest}
        </p>
      )}

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="font-ui inline-flex items-center gap-2 border px-4 py-2 text-[10.5px] tracking-[0.14em] uppercase"
          style={{
            background: "var(--primary)",
            color: "var(--primary-foreground)",
            borderColor: "var(--primary)",
          }}
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Retry
        </button>
        <Link
          href="/cart"
          className="font-ui inline-flex items-center gap-2 border px-4 py-2 text-[10.5px] tracking-[0.14em] uppercase"
          style={{
            background: "var(--card)",
            color: "var(--foreground)",
            borderColor: "var(--border-strong)",
          }}
        >
          <ShoppingBag className="h-3.5 w-3.5" />
          Back to cart
        </Link>
      </div>
    </div>
  );
}
