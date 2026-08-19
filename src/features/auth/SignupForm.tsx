"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { useSignUp } from "@clerk/nextjs";
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

export function SignupForm() {
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
      {clerkEnabled ? <ClerkSignupFields /> : <CookieSignupFields />}
    </AuthSplit>
  );
}

function nameParts(displayName: string) {
  const bits = displayName.trim().split(/\s+/).filter(Boolean);
  return {
    firstName: bits[0],
    lastName: bits.slice(1).join(" ") || undefined,
  };
}

function CookieSignupFields() {
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
    <SignupMarkup
      displayName={displayName}
      email={email}
      password={password}
      busy={pending ? "email" : null}
      error={error}
      fieldErrors={fieldErrors}
      onDisplayName={setDisplayName}
      onEmail={setEmail}
      onPassword={setPassword}
      onSubmit={onSubmit}
      onGoogle={() =>
        setError("Google sign-in is not available yet. Use email below.")
      }
    />
  );
}

function ClerkSignupFields() {
  const { signUp } = useSignUp();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState<"google" | "email" | null>(null);
  const [needsCode, setNeedsCode] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function onPageShow(event: PageTransitionEvent) {
      if (event.persisted) setBusy(null);
    }
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  async function finish() {
    await signUp.finalize({
      navigate: () => {
        window.location.assign(clerkCallbackHref(routes.account));
      },
    });
  }

  async function onGoogle() {
    setBusy("google");
    setError(null);
    try {
      const { error: oauthError } = await signUp.sso(
        clerkGoogleSso(routes.account),
      );
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
      const names = nameParts(displayName);
      const { error: createError } = await signUp.password({
        emailAddress: email,
        password,
        ...(names.firstName ? { firstName: names.firstName } : {}),
        ...(names.lastName ? { lastName: names.lastName } : {}),
      });
      if (createError) {
        setError(
          messageFromClerkError(createError, "Could not create account."),
        );
        setBusy(null);
        return;
      }
      if (signUp.status === "complete") {
        await finish();
        return;
      }
      const { error: codeError } = await signUp.verifications.sendEmailCode();
      if (codeError) {
        setError(messageFromClerkError(codeError, "Could not send a code."));
        setBusy(null);
        return;
      }
      setNeedsCode(true);
      setBusy(null);
    } catch (caught) {
      setError(messageFromClerkError(caught, "Could not create account."));
      setBusy(null);
    }
  }

  async function onVerify(event: FormEvent) {
    event.preventDefault();
    setBusy("email");
    setError(null);
    try {
      const { error: verifyError } = await signUp.verifications.verifyEmailCode(
        { code },
      );
      if (verifyError) {
        setError(
          messageFromClerkError(verifyError, "Could not verify that code."),
        );
        setBusy(null);
        return;
      }
      if (signUp.status === "complete") {
        await finish();
        return;
      }
      setError("Could not verify that code.");
      setBusy(null);
    } catch (caught) {
      setError(messageFromClerkError(caught, "Could not verify that code."));
      setBusy(null);
    }
  }

  if (needsCode) {
    return (
      <form onSubmit={onVerify}>
        {error ? (
          <p className={styles.error} role="alert">
            {error}
          </p>
        ) : (
          <p className={styles.lede} role="status">
            Enter the code we sent to {email}.
          </p>
        )}
        <div className={styles.field}>
          <label className={styles.label} htmlFor="signup-code">
            Verification code
          </label>
          <input
            id="signup-code"
            className={styles.input}
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            value={code}
            onChange={(event) => setCode(event.target.value)}
          />
        </div>
        <button
          className={styles.button}
          type="submit"
          disabled={busy !== null}
        >
          {busy ? "Verifying…" : "Verify"}
        </button>
        <div id="clerk-captcha" />
      </form>
    );
  }

  return (
    <SignupMarkup
      displayName={displayName}
      email={email}
      password={password}
      busy={busy}
      error={error}
      fieldErrors={{}}
      onDisplayName={setDisplayName}
      onEmail={setEmail}
      onPassword={setPassword}
      onSubmit={onSubmit}
      onGoogle={onGoogle}
      captcha
    />
  );
}

function SignupMarkup({
  displayName,
  email,
  password,
  busy,
  error,
  fieldErrors,
  onDisplayName,
  onEmail,
  onPassword,
  onSubmit,
  onGoogle,
  captcha,
}: {
  displayName: string;
  email: string;
  password: string;
  busy: "google" | "email" | null;
  error: string | null;
  fieldErrors: Record<string, string>;
  onDisplayName: (value: string) => void;
  onEmail: (value: string) => void;
  onPassword: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
  onGoogle: () => void;
  captcha?: boolean;
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
          <label className={styles.label} htmlFor="signup-name">
            Display name
          </label>
          <input
            id="signup-name"
            className={styles.input}
            value={displayName}
            onChange={(event) => onDisplayName(event.target.value)}
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
            onChange={(event) => onEmail(event.target.value)}
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
            onChange={(event) => onPassword(event.target.value)}
            aria-invalid={Boolean(fieldErrors.password)}
          />
          {fieldErrors.password ? (
            <p className={styles.error} role="alert">
              {fieldErrors.password}
            </p>
          ) : null}
        </div>
        <button className={styles.button} type="submit" disabled={pending}>
          {busy === "email" ? "Creating…" : "Create account"}
        </button>
      </form>
      {captcha ? <div id="clerk-captcha" /> : null}
    </>
  );
}
