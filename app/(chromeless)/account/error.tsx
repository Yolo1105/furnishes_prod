"use client";

import { useEffect } from "react";
import { captureException } from "@sentry/nextjs";
import Link from "next/link";
import { AlertTriangle, RefreshCw, LifeBuoy } from "lucide-react";
import { AccountShell } from "@/components/eva-dashboard/account/account-shell";
import {
  ToastProvider,
  Eyebrow,
} from "@/components/eva-dashboard/account/shared";

export default function AccountError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[account error]", error);
    captureException(error, {
      tags: { boundary: "account" },
      extra: { digest: error.digest },
    });
  }, [error]);
  return (
    <ToastProvider>
      <AccountShell>
        <div className="mx-auto flex min-h-[60vh] max-w-[640px] flex-col items-center justify-center px-6 py-16 text-center">
          <div
            className="inline-flex h-12 w-12 items-center justify-center"
            style={{
              background: "var(--primary)",
              color: "var(--primary-foreground)",
            }}
          >
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="mt-5">
            <Eyebrow>STUDIO HICCUP</Eyebrow>
          </div>
          <h1
            className="font-display mt-5 text-3xl"
            style={{ color: "var(--foreground)" }}
          >
            We hit a snag loading this page
          </h1>
          <p
            className="font-body mt-3 max-w-md text-sm"
            style={{ color: "var(--muted-foreground)" }}
          >
            The rest of Studio is unaffected. Try the action below — if it keeps
            happening, let us know via support and we'll dig in.
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
              href="/account/support"
              className="font-ui inline-flex items-center gap-2 border px-4 py-2 text-[10.5px] tracking-[0.14em] uppercase"
              style={{
                background: "var(--card)",
                color: "var(--foreground)",
                borderColor: "var(--border-strong)",
              }}
            >
              <LifeBuoy className="h-3.5 w-3.5" />
              Report this
            </Link>
          </div>
        </div>
      </AccountShell>
    </ToastProvider>
  );
}
