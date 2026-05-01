"use client";

import { useEffect } from "react";
import { captureException } from "@sentry/nextjs";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home as HomeIcon } from "lucide-react";

export default function CartError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[cart error]", error);
    captureException(error, {
      tags: { boundary: "cart" },
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
        CART ISSUE
        <span style={{ color: "var(--primary)" }}> ]</span>
      </div>
      <h1
        className="font-display mt-4 text-2xl md:text-3xl"
        style={{ color: "var(--foreground)" }}
      >
        We couldn&apos;t load your cart.
      </h1>
      <p
        className="font-body mt-3 max-w-md text-sm"
        style={{ color: "var(--muted-foreground)" }}
      >
        Nothing in your saved items is affected. Try again below.
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
          href="/account"
          className="font-ui inline-flex items-center gap-2 border px-4 py-2 text-[10.5px] tracking-[0.14em] uppercase"
          style={{
            background: "var(--card)",
            color: "var(--foreground)",
            borderColor: "var(--border-strong)",
          }}
        >
          <HomeIcon className="h-3.5 w-3.5" />
          Back to Studio
        </Link>
      </div>
    </div>
  );
}
