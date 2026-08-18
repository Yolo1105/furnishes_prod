"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import {
  accountRequest,
  isAccountApiError,
} from "@/features/account/account-api";
import { startRouteHandoff } from "@/components/route-handoff/start-route-handoff";
import { routes } from "@/lib/contracts/routes";
import { AuthSplit, GoogleMark } from "./AuthSplit";
import styles from "./auth.module.css";

const demoSignInVisible =
  process.env.NEXT_PUBLIC_ALLOW_DEMO_SIGNIN === "1" ||
  process.env.NODE_ENV !== "production";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || routes.account;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function goNext() {
    const href = next.startsWith("/") ? next : routes.account;
    if (!startRouteHandoff(href, { replace: true })) {
      router.replace(href);
      router.refresh();
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      await accountRequest("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      goNext();
    } catch (caught) {
      setError(
        isAccountApiError(caught) ? caught.message : "Could not sign in.",
      );
      setPending(false);
    }
  }

  async function onDemoSignIn() {
    setPending(true);
    setError(null);
    try {
      await accountRequest("/api/auth/demo", { method: "POST" });
      goNext();
    } catch (caught) {
      setError(
        isAccountApiError(caught)
          ? caught.message
          : "Demo sign-in is unavailable.",
      );
      setPending(false);
    }
  }

  return (
    <AuthSplit
      kicker="Sign in"
      title="Welcome back"
      lede="Sign in to pick up where you left off."
      footer={
        <div className={styles.footerRow}>
          <Link className={styles.link} href={routes.forgotPassword}>
            Forgot password?
          </Link>
          <p className={styles.footerNote}>
            New here?{" "}
            <Link className={styles.linkAccent} href={routes.signup}>
              Create account
            </Link>
          </p>
        </div>
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
          <label className={styles.label} htmlFor="login-email">
            Email
          </label>
          <input
            id="login-email"
            className={styles.input}
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="login-password">
            Password
          </label>
          <input
            id="login-password"
            className={styles.input}
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>
        <button className={styles.button} type="submit" disabled={pending}>
          {pending ? "Signing in…" : "Log in"}
        </button>
      </form>
      {demoSignInVisible ? (
        <button
          type="button"
          className={styles.buttonGhost}
          onClick={onDemoSignIn}
          disabled={pending}
        >
          {pending ? "Opening demo…" : "Demo sign in"}
        </button>
      ) : null}
    </AuthSplit>
  );
}
