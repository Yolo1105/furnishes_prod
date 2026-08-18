"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import {
  accountRequest,
  isAccountApiError,
} from "@/features/account/account-api";
import { routes } from "@/lib/contracts/routes";
import { AuthSplit } from "./AuthSplit";
import styles from "./auth.module.css";

const GENERIC_RECOVERY =
  "If an account exists for that email, recovery instructions have been sent.";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setStatus(null);
    try {
      await accountRequest("/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setStatus(GENERIC_RECOVERY);
    } catch (caught) {
      setError(
        isAccountApiError(caught)
          ? caught.message
          : "Could not start recovery.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthSplit
      kicker="Account"
      title="Forgot password"
      lede="We will email a one-time reset link if an account exists."
      footer={
        <div className={styles.footerRow}>
          <Link className={styles.linkAccent} href={routes.login}>
            Back to sign in →
          </Link>
        </div>
      }
    >
      <form onSubmit={onSubmit}>
        {error ? (
          <p className={styles.error} role="alert">
            {error}
          </p>
        ) : null}
        {status ? (
          <p className={styles.status} role="status">
            {status}
          </p>
        ) : null}
        <div className={styles.field}>
          <label className={styles.label} htmlFor="forgot-email">
            Email
          </label>
          <input
            id="forgot-email"
            className={styles.input}
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>
        <button className={styles.button} type="submit" disabled={pending}>
          {pending ? "Sending…" : "Send reset link"}
        </button>
      </form>
    </AuthSplit>
  );
}
