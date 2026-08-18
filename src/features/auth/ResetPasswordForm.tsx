"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import {
  accountRequest,
  isAccountApiError,
} from "@/features/account/account-api";
import { routes } from "@/lib/contracts/routes";
import { AuthSplit } from "./AuthSplit";
import styles from "./auth.module.css";

export function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setStatus(null);
    try {
      await accountRequest("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, password }),
      });
      setStatus("Password updated. You can sign in.");
    } catch (caught) {
      setError(
        isAccountApiError(caught)
          ? caught.message
          : "Could not reset password.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthSplit
      kicker="Account"
      title="Reset password"
      lede="Choose a new password for your account."
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
          <label className={styles.label} htmlFor="reset-password">
            New password
          </label>
          <input
            id="reset-password"
            className={styles.input}
            type="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>
        <button
          className={styles.button}
          type="submit"
          disabled={pending || !token}
        >
          {pending ? "Updating…" : "Update password"}
        </button>
      </form>
    </AuthSplit>
  );
}
