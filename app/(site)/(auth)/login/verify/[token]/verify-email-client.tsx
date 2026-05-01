"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

type Status = "verifying" | "verified" | "expired" | "invalid" | "error";

export function VerifyEmailClient({ token }: { token: string }) {
  const [status, setStatus] = useState<Status>("verifying");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/auth/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        if (cancelled) return;
        if (res.ok) setStatus("verified");
        else if (res.status === 410) setStatus("expired");
        else if (res.status === 404) setStatus("invalid");
        else setStatus("error");
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div
      className="flex min-h-screen items-center justify-center px-6 py-12"
      style={{ background: "var(--background, #fcf2e8)" }}
    >
      <div className="w-full max-w-sm text-center">
        <div
          className="mb-2 text-[10px] font-semibold tracking-[0.22em] uppercase"
          style={{ color: "var(--color-accent, #f24a12)" }}
        >
          [ EMAIL VERIFICATION ]
        </div>

        {status === "verifying" && (
          <>
            <Loader2
              className="mx-auto mt-4 h-8 w-8 animate-spin"
              style={{ color: "var(--color-accent, #f24a12)" }}
            />
            <h1
              className="mt-4 text-2xl font-[var(--font-manrope)] tracking-tight"
              style={{ color: "var(--foreground)" }}
            >
              Verifying your email…
            </h1>
          </>
        )}

        {status === "verified" && (
          <>
            <CheckCircle2
              className="mx-auto mt-4 h-10 w-10"
              style={{ color: "var(--color-accent, #f24a12)" }}
            />
            <h1
              className="mt-4 text-2xl font-[var(--font-manrope)] tracking-tight"
              style={{ color: "var(--foreground)" }}
            >
              You&apos;re verified
            </h1>
            <p
              className="mt-2 text-sm"
              style={{ color: "var(--muted-foreground)" }}
            >
              Thanks — your email address is confirmed.
            </p>
            <Link
              href="/account"
              className="mt-6 inline-block h-11 w-full cursor-pointer border px-4 py-3 text-[11px] font-semibold tracking-[0.18em] uppercase"
              style={{
                background: "var(--color-accent, #f24a12)",
                color: "#ffffff",
                borderColor: "var(--color-accent, #f24a12)",
              }}
            >
              Go to studio →
            </Link>
          </>
        )}

        {(status === "expired" ||
          status === "invalid" ||
          status === "error") && (
          <>
            <XCircle
              className="mx-auto mt-4 h-10 w-10"
              style={{ color: "var(--destructive, #dc2626)" }}
            />
            <h1
              className="mt-4 text-2xl font-[var(--font-manrope)] tracking-tight"
              style={{ color: "var(--foreground)" }}
            >
              {status === "expired" && "Link expired"}
              {status === "invalid" && "Invalid link"}
              {status === "error" && "Something went wrong"}
            </h1>
            <p
              className="mt-2 text-sm"
              style={{ color: "var(--muted-foreground)" }}
            >
              {status === "expired" &&
                "This verification link is past its 24-hour window."}
              {status === "invalid" &&
                "We couldn't find this verification token."}
              {status === "error" &&
                "A network error prevented verification. Try again."}
            </p>
            <Link
              href="/login"
              className="mt-6 inline-block cursor-pointer text-sm font-medium transition-opacity hover:opacity-70"
              style={{ color: "var(--color-accent, #f24a12)" }}
            >
              Back to sign in →
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
