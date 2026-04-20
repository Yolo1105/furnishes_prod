"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { isMockAuthUiOffered } from "@/lib/auth/mock-auth";
import { authFieldControl } from "@/content/site/auth-field-styles";

/** Demo credentials — match `prisma/seed.ts`. */
const DEMO_EMAIL = "mohan@demo.furnishes.sg";
const DEMO_PASSWORD = "demopass-change-me-123";

/** Show the "Sign in as demo" button when NOT in production. Keep this
 *  condition simple — Next inlines NEXT_PUBLIC_* at build time. */
const SHOW_DEMO_BUTTON =
  process.env.NEXT_PUBLIC_SHOW_DEMO_LOGIN === "1" ||
  process.env.NODE_ENV !== "production";

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

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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

  async function handleDemoSignIn() {
    setError(null);
    setSubmitting(true);
    try {
      // In mock mode (default in dev + when DB isn't wired), set a
      // client cookie the account layout checks, then route to /account.
      // This lets visual reviewers see every page without Prisma setup.
      const mockMode = isMockAuthUiOffered();

      if (mockMode) {
        // Set a simple session cookie — 30-day lifetime
        document.cookie = `furnishes-mock-auth=1; path=/; max-age=${30 * 24 * 60 * 60}; SameSite=Lax`;
        // Full navigation avoids a dev-only Webpack error where client-side
        // route transitions load a stale/missing chunk ("Cannot read properties
        // of undefined (reading 'call')"). SPA transition is unnecessary for demo.
        window.location.assign(next);
        return;
      }

      // Real mode — hit the Credentials provider
      await doSignIn(DEMO_EMAIL, DEMO_PASSWORD);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-6">
      {/* ── DEMO / DEV — one-tap sign-in ──────────────────── */}
      {SHOW_DEMO_BUTTON && (
        <div
          className="mb-5 border p-4"
          style={{
            background: "rgba(242,74,18,0.04)",
            borderColor: "rgba(242,74,18,0.25)",
            borderStyle: "dashed",
          }}
        >
          <div
            className="mb-1 text-[10px] font-semibold tracking-[0.2em] uppercase"
            style={{ color: "var(--color-accent, #f24a12)" }}
          >
            [ DEV / DEMO ]
          </div>
          <p
            className="mb-3 text-xs"
            style={{ color: "var(--muted-foreground, #6b7280)" }}
          >
            Sign in as the seeded demo user (
            <code className="font-mono">{DEMO_EMAIL}</code>) — skip straight to
            the account dashboard.
          </p>
          <button
            type="button"
            onClick={handleDemoSignIn}
            disabled={submitting}
            className="h-10 w-full cursor-pointer border text-[11px] font-semibold tracking-[0.18em] uppercase transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
            style={{
              background: "var(--color-accent, #f24a12)",
              color: "#ffffff",
              borderColor: "var(--color-accent, #f24a12)",
            }}
          >
            {submitting ? "Signing in…" : "Sign in as demo →"}
          </button>
          <p
            className="mt-2 text-[10px] italic"
            style={{ color: "var(--muted-foreground, #6b7280)" }}
          >
            Only visible outside production. Set{" "}
            <code>NEXT_PUBLIC_SHOW_DEMO_LOGIN=0</code> to force-hide.
          </p>
        </div>
      )}

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
