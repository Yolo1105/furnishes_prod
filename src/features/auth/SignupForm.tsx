"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import {
  accountRequest,
  isAccountApiError,
} from "@/features/account/account-api";
import { startRouteHandoff } from "@/components/route-handoff/start-route-handoff";
import { routes } from "@/lib/contracts/routes";
import { AuthSplit, GoogleMark } from "./AuthSplit";
import styles from "./auth.module.css";

export function SignupForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setFieldErrors({});
    try {
      await accountRequest("/api/auth/signup", {
        method: "POST",
        body: JSON.stringify({ email, password, displayName }),
      });
      if (!startRouteHandoff(routes.account, { replace: true })) {
        router.replace(routes.account);
        router.refresh();
      }
    } catch (caught) {
      if (isAccountApiError(caught)) {
        setError(caught.message);
        setFieldErrors(caught.fieldErrors ?? {});
      } else {
        setError("Could not create account.");
      }
      setPending(false);
    }
  }

  return (
    <AuthSplit
      kicker="Create account"
      title="Create account"
      lede="Start a workspace Eva can remember."
      footer={
        <p className={styles.footerNote}>
          Already have an account?{" "}
          <Link className={styles.linkAccent} href={routes.login}>
            Sign in
          </Link>
        </p>
      }
    >
      <button
        type="button"
        className={styles.googleBtn}
        disabled={pending}
        onClick={() =>
          setError("Google sign-in is not available yet. Use email below.")
        }
      >
        <GoogleMark />
        Continue with Google
      </button>
      <p className={styles.divider}>Or with email</p>
      <form onSubmit={onSubmit}>
        {error ? (
          <p className={styles.error} role="alert">
            {error}
          </p>
        ) : null}
        <div className={styles.field}>
          <label className={styles.label} htmlFor="signup-name">
            Display name
          </label>
          <input
            id="signup-name"
            className={styles.input}
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            autoComplete="nickname"
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="signup-email">
            Email
          </label>
          <input
            id="signup-email"
            className={styles.input}
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            aria-invalid={Boolean(fieldErrors.email)}
          />
          {fieldErrors.email ? (
            <p className={styles.error} role="alert">
              {fieldErrors.email}
            </p>
          ) : null}
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="signup-password">
            Password
          </label>
          <input
            id="signup-password"
            className={styles.input}
            type="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            aria-invalid={Boolean(fieldErrors.password)}
          />
          {fieldErrors.password ? (
            <p className={styles.error} role="alert">
              {fieldErrors.password}
            </p>
          ) : null}
        </div>
        <button className={styles.button} type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create account"}
        </button>
      </form>
    </AuthSplit>
  );
}
