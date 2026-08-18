"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  accountRequest,
  isAccountApiError,
} from "@/features/account/account-api";
import { routes } from "@/lib/contracts/routes";
import { AuthSplit } from "./AuthSplit";
import styles from "./auth.module.css";

export function VerifyEmailClient() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        await accountRequest("/api/auth/verify-email", {
          method: "POST",
          body: JSON.stringify({ token }),
        });
        if (!cancelled) setStatus("Email verified.");
      } catch (caught) {
        if (!cancelled) {
          setError(
            isAccountApiError(caught)
              ? caught.message
              : "Could not verify email.",
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <AuthSplit
      kicker="Account"
      title="Verify email"
      lede="Finish verifying this address to keep the workspace protected."
      footer={
        <div className={styles.footerRow}>
          <Link className={styles.link} href={routes.account}>
            Go to Account
          </Link>
          <Link className={styles.linkAccent} href={routes.login}>
            Sign in →
          </Link>
        </div>
      }
    >
      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
      {status ? (
        <p className={styles.status} role="status">
          {status}
        </p>
      ) : !token ? (
        <p className={styles.lede} role="status">
          Open the link in your verification email to finish. Lost it? Send a
          new one below.
        </p>
      ) : !error ? (
        <p className={styles.lede} role="status">
          Verifying…
        </p>
      ) : null}
      {!token || error ? (
        <button
          type="button"
          className={styles.button}
          disabled={resending}
          onClick={async () => {
            setResending(true);
            setError(null);
            try {
              await accountRequest(
                "/api/account/settings/resend-verification",
                { method: "POST" },
              );
              setStatus("Verification email sent.");
            } catch (caught) {
              setError(
                isAccountApiError(caught)
                  ? caught.message
                  : "Could not resend verification email.",
              );
            } finally {
              setResending(false);
            }
          }}
        >
          {resending ? "Sending…" : "Resend verification email"}
        </button>
      ) : null}
    </AuthSplit>
  );
}
