"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

type Status = "working" | "done" | "invalid";

export default function UnsubscribePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const [status, setStatus] = useState<Status>("working");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        if (cancelled) return;
        if (res.ok) setStatus("done");
        else setStatus("invalid");
      } catch {
        if (!cancelled) setStatus("invalid");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#FDF5EC",
        color: "#2B1F18",
        fontFamily: "Manrope, ui-sans-serif, system-ui",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "3rem 1.5rem",
      }}
    >
      <div style={{ maxWidth: 480, textAlign: "center" }}>
        {status === "working" && (
          <>
            <Loader2
              size={32}
              className="animate-spin"
              style={{ color: "#f24a12", margin: "0 auto" }}
            />
            <h1
              style={{
                marginTop: 20,
                fontSize: 24,
                fontWeight: 600,
                letterSpacing: "-0.01em",
              }}
            >
              Unsubscribing…
            </h1>
          </>
        )}
        {status === "done" && (
          <>
            <CheckCircle2
              size={40}
              style={{ color: "#f24a12", margin: "0 auto" }}
            />
            <div
              style={{
                marginTop: 20,
                fontSize: 10.5,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: "#9E7A5E",
                fontWeight: 500,
              }}
            >
              <span style={{ color: "#f24a12" }}>[ </span>
              UNSUBSCRIBED
              <span style={{ color: "#f24a12" }}> ]</span>
            </div>
            <h1
              style={{
                marginTop: 16,
                fontSize: 28,
                fontWeight: 600,
                letterSpacing: "-0.015em",
              }}
            >
              You&apos;re off the marketing list.
            </h1>
            <p
              style={{
                marginTop: 12,
                fontSize: 14,
                color: "#9E7A5E",
                fontWeight: 300,
                lineHeight: 1.65,
              }}
            >
              You&apos;ll still receive transactional emails — order
              confirmations, account security — as required by law. Manage all
              preferences anytime in your account.
            </p>
            <div
              style={{
                marginTop: 28,
                display: "flex",
                flexWrap: "wrap",
                gap: 10,
                justifyContent: "center",
              }}
            >
              <Link
                href="/account/profile/contact"
                style={{
                  border: "1px solid #f24a12",
                  background: "#f24a12",
                  color: "#ffffff",
                  padding: "10px 16px",
                  fontSize: 10.5,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  fontWeight: 600,
                  textDecoration: "none",
                }}
              >
                Manage preferences
              </Link>
              <Link
                href="/"
                style={{
                  border: "1px solid rgba(43,31,24,0.14)",
                  background: "#ffffff",
                  color: "#2B1F18",
                  padding: "10px 16px",
                  fontSize: 10.5,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  fontWeight: 500,
                  textDecoration: "none",
                }}
              >
                Back to Furnishes
              </Link>
            </div>
          </>
        )}
        {status === "invalid" && (
          <>
            <XCircle size={40} style={{ color: "#B4442A", margin: "0 auto" }} />
            <h1
              style={{
                marginTop: 20,
                fontSize: 24,
                fontWeight: 600,
                letterSpacing: "-0.01em",
              }}
            >
              We couldn&apos;t process that link
            </h1>
            <p
              style={{
                marginTop: 12,
                fontSize: 14,
                color: "#9E7A5E",
                fontWeight: 300,
              }}
            >
              The link may have expired. Sign in and manage preferences
              directly.
            </p>
            <Link
              href="/login"
              style={{
                marginTop: 24,
                display: "inline-block",
                color: "#f24a12",
                fontSize: 13,
                fontWeight: 500,
                textDecoration: "underline",
              }}
            >
              Sign in →
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
