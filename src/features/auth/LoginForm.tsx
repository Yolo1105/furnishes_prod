"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { useSignIn } from "@clerk/nextjs";
import {
  accountRequest,
  isAccountApiError,
} from "@/features/account/account-api";
import { startRouteHandoff } from "@/components/route-handoff/start-route-handoff";
import { routes } from "@/lib/contracts/routes";
import { AuthSplit, GoogleMark } from "./AuthSplit";
import {
  clerkCallbackHref,
  clerkEnabled,
  clerkGoogleSso,
  messageFromClerkError,
} from "./clerk-custom";
import styles from "./auth.module.css";

const demoSignInVisible =
  process.env.NEXT_PUBLIC_ALLOW_DEMO_SIGNIN === "1" ||
  process.env.NODE_ENV !== "production";

export function LoginForm() {
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
      {clerkEnabled ? <ClerkLoginFields /> : <CookieLoginFields />}
    </AuthSplit>
  );
}

function useLoginNav() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || routes.account;

  function goNext() {
    const href = next.startsWith("/") ? next : routes.account;
    if (!startRouteHandoff(href, { replace: true })) {
      router.replace(href);
      router.refresh();
    }
  }

  return { next, searchParams, goNext };
}

function usePageShowReset(reset: () => void) {
  useEffect(() => {
    function onPageShow(event: PageTransitionEvent) {
      if (event.persisted) reset();
    }
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, [reset]);
}

function LoginMarkup({
  email,
  password,
  busy,
  error,
  captcha,
  onEmail,
  onPassword,
  onSubmit,
  onGoogle,
  onDemo,
}: {
  email: string;
  password: string;
  busy: "google" | "email" | "demo" | null;
  error: string | null;
  captcha?: boolean;
  onEmail: (value: string) => void;
  onPassword: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
  onGoogle: () => void;
  onDemo?: () => void;
}) {
  const pending = busy !== null;
  return (
    <>
      <button
        type="button"
        className={styles.googleBtn}
        disabled={pending}
        onClick={onGoogle}
      >
        <GoogleMark />
        {busy === "google" ? "Finishing sign-in…" : "Continue with Google"}
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
            onChange={(event) => onEmail(event.target.value)}
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
            onChange={(event) => onPassword(event.target.value)}
          />
        </div>
        <button className={styles.button} type="submit" disabled={pending}>
          {busy === "email" ? "Signing in…" : "Log in"}
        </button>
      </form>
      {demoSignInVisible && onDemo ? (
        <button
          type="button"
          className={styles.buttonGhost}
          onClick={onDemo}
          disabled={pending}
        >
          {busy === "demo" ? "Opening demo…" : "Demo sign in"}
        </button>
      ) : null}
      {captcha ? <div id="clerk-captcha" /> : null}
    </>
  );
}

function CookieLoginFields() {
  const { goNext } = useLoginNav();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<"google" | "email" | "demo" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy("email");
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
      setBusy(null);
    }
  }

  async function onDemoSignIn() {
    setBusy("demo");
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
      setBusy(null);
    }
  }

  return (
    <LoginMarkup
      email={email}
      password={password}
      busy={busy}
      error={error}
      onEmail={setEmail}
      onPassword={setPassword}
      onSubmit={onSubmit}
      onGoogle={() =>
        setError("Google sign-in is not available yet. Use email below.")
      }
      onDemo={onDemoSignIn}
    />
  );
}

function ClerkLoginFields() {
  const { next, searchParams, goNext } = useLoginNav();
  const { signIn } = useSignIn();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<"google" | "email" | "demo" | null>(null);
  const [error, setError] = useState<string | null>(null);

  usePageShowReset(() => setBusy(null));

  useEffect(() => {
    if (searchParams.get("clerk") === "aborted") {
      setBusy(null);
      setError("Google sign-in didn’t finish. Try again.");
    }
  }, [searchParams]);

  async function onGoogle() {
    setBusy("google");
    setError(null);
    try {
      const { error: oauthError } = await signIn.sso(clerkGoogleSso(next));
      if (oauthError) {
        setError(messageFromClerkError(oauthError, "Google sign-in failed."));
        setBusy(null);
      }
    } catch (caught) {
      setError(messageFromClerkError(caught, "Google sign-in failed."));
      setBusy(null);
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy("email");
    setError(null);
    try {
      const { error: passwordError } = await signIn.password({
        emailAddress: email,
        password,
      });
      if (passwordError) {
        setError(messageFromClerkError(passwordError, "Could not sign in."));
        setBusy(null);
        return;
      }
      if (signIn.status === "complete") {
        await signIn.finalize({
          navigate: () => {
            window.location.assign(clerkCallbackHref(next));
          },
        });
        return;
      }
      setError("Could not finish sign-in. Try Google, or check email.");
      setBusy(null);
    } catch (caught) {
      setError(messageFromClerkError(caught, "Could not sign in."));
      setBusy(null);
    }
  }

  async function onDemoSignIn() {
    setBusy("demo");
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
      setBusy(null);
    }
  }

  return (
    <LoginMarkup
      email={email}
      password={password}
      busy={busy}
      error={error}
      captcha
      onEmail={setEmail}
      onPassword={setPassword}
      onSubmit={onSubmit}
      onGoogle={onGoogle}
      onDemo={onDemoSignIn}
    />
  );
}
