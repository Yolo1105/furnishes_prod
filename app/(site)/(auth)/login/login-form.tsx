"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { authFieldControl } from "@/content/site/auth-field-styles";

/** Default login values — match seeded `demo@example.com` (`prisma/seed.ts`, DEMO_SEED_PASSWORD). */
const DEFAULT_LOGIN_EMAIL =
  process.env.NEXT_PUBLIC_LOGIN_DEFAULT_EMAIL?.trim() || "demo@example.com";
const DEFAULT_LOGIN_PASSWORD =
  process.env.NEXT_PUBLIC_LOGIN_DEFAULT_PASSWORD?.trim() ||
  "demopass-change-me-123";

/** Open redirects: only allow same-origin paths for `?next=`. */
function safeNextPath(raw: string | null | undefined): string {
  const fallback = "/account";
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return fallback;
  return raw;
}

export function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const next = safeNextPath(search?.get("next"));

  const [email, setEmail] = useState(DEFAULT_LOGIN_EMAIL);
  const [password, setPassword] = useState(DEFAULT_LOGIN_PASSWORD);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await doSignIn(email, password);
  }

  async function doSignIn(emailArg: string, passwordArg: string) {
    setError(null);
    setSubmitting(true);
    try {
      const result = await signIn("credentials", {
        email: emailArg,
        password: passwordArg,
        redirect: false,
      });
      if (!result) {
        setError("Sign-in service is unavailable. Try again shortly.");
        return;
      }
      if (result.error) {
        setError(
          result.error === "CredentialsSignin"
            ? "Email or password doesn't match."
            : "Something went wrong. Try again.",
        );
        return;
      }
      router.push(next);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-6">
      {/* ── Google (optional) ─────────────────────────────── */}
      <button
        type="button"
        onClick={() => signIn("google", { callbackUrl: next })}
        disabled={submitting}
        className="mb-4 flex h-11 w-full cursor-pointer items-center justify-center gap-2 border text-sm font-medium transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-60"
        style={{
          ...authFieldControl,
        }}
      >
        <GoogleIcon />
        Continue with Google
      </button>

      <div className="mb-4 flex items-center gap-3">
        <div className="h-px flex-1" style={{ background: "var(--border)" }} />
        <span
          className="text-[10px] tracking-[0.22em] uppercase"
          style={{ color: "var(--muted-foreground, #6b7280)" }}
        >
          OR WITH EMAIL
        </span>
        <div className="h-px flex-1" style={{ background: "var(--border)" }} />
      </div>

      {/* ── Credentials form ──────────────────────────────── */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="login-email"
            className="mb-1.5 block text-[10px] font-semibold tracking-[0.16em] uppercase"
            style={{ color: "var(--muted-foreground, #6b7280)" }}
          >
            Email
          </label>
          <input
            id="login-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
            disabled={submitting}
            className="h-11 w-full border px-3 text-sm transition-colors outline-none"
            style={{
              ...authFieldControl,
            }}
          />
        </div>

        <div>
          <label
            htmlFor="login-password"
            className="mb-1.5 block text-[10px] font-semibold tracking-[0.16em] uppercase"
            style={{ color: "var(--muted-foreground, #6b7280)" }}
          >
            Password
          </label>
          <input
            id="login-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
            disabled={submitting}
            className="h-11 w-full border px-3 text-sm transition-colors outline-none"
            style={{
              ...authFieldControl,
            }}
          />
        </div>

        {error && (
          <div
            className="border px-3 py-2 text-xs"
            style={{
              background: "rgba(220,38,38,0.06)",
              borderColor: "rgba(220,38,38,0.25)",
              color: "var(--destructive, #dc2626)",
            }}
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="h-11 w-full cursor-pointer border text-[11px] font-semibold tracking-[0.18em] uppercase transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
          style={{
            background: "var(--color-accent, #f24a12)",
            color: "#ffffff",
            borderColor: "var(--color-accent, #f24a12)",
          }}
        >
          {submitting ? "Signing in…" : "Continue"}
        </button>
      </form>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A10.99 10.99 0 0 0 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.99 10.99 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"
        fill="#EA4335"
      />
    </svg>
  );
}
