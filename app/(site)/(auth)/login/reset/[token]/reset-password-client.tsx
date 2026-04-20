"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export function ResetPasswordClient({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const canSubmit =
    password.length >= 12 && password === confirm && !submitting;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: password }),
      });
      if (!res.ok) {
        if (res.status === 410) {
          setError("This reset link has expired. Request a new one.");
        } else if (res.status === 404) {
          setError("This reset link is invalid.");
        } else {
          setError("Couldn't reset your password. Try again.");
        }
        return;
      }
      setDone(true);
      setTimeout(() => router.push("/login"), 2500);
    } catch {
      setError("Network error. Try again shortly.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div
        className="flex min-h-screen items-center justify-center px-6"
        style={{ background: "var(--background, #fcf2e8)" }}
      >
        <div className="max-w-sm text-center">
          <div
            className="mb-2 text-[10px] font-semibold tracking-[0.22em] uppercase"
            style={{ color: "var(--color-accent, #f24a12)" }}
          >
            [ ALL SET ]
          </div>
          <h1
            className="text-3xl leading-tight font-[var(--font-manrope)] tracking-tight"
            style={{ color: "var(--foreground, #171717)" }}
          >
            Password updated
          </h1>
          <p
            className="mt-3 text-sm"
            style={{ color: "var(--muted-foreground, #6b7280)" }}
          >
            Redirecting you to sign in…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex min-h-screen items-center justify-center px-6 py-12"
      style={{ background: "var(--background, #fcf2e8)" }}
    >
      <div className="w-full max-w-sm">
        <div
          className="mb-2 text-[10px] font-semibold tracking-[0.22em] uppercase"
          style={{ color: "var(--color-accent, #f24a12)" }}
        >
          [ RESET PASSWORD ]
        </div>
        <h1
          className="text-3xl leading-tight font-[var(--font-manrope)] tracking-tight"
          style={{ color: "var(--foreground, #171717)" }}
        >
          Set a new password
        </h1>
        <p
          className="mt-2 text-sm"
          style={{ color: "var(--muted-foreground, #6b7280)" }}
        >
          At least 12 characters. We recommend a passphrase.
        </p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <label
              htmlFor="rp-password"
              className="mb-1.5 block text-[10px] font-semibold tracking-[0.16em] uppercase"
              style={{ color: "var(--muted-foreground, #6b7280)" }}
            >
              New password
            </label>
            <input
              id="rp-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required
              minLength={12}
              className="h-11 w-full border px-3 text-sm outline-none"
              style={{
                background: "var(--input, #ffffff)",
                borderColor: "var(--border)",
                color: "var(--foreground)",
              }}
            />
          </div>

          <div>
            <label
              htmlFor="rp-confirm"
              className="mb-1.5 block text-[10px] font-semibold tracking-[0.16em] uppercase"
              style={{ color: "var(--muted-foreground, #6b7280)" }}
            >
              Confirm password
            </label>
            <input
              id="rp-confirm"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              required
              className="h-11 w-full border px-3 text-sm outline-none"
              style={{
                background: "var(--input, #ffffff)",
                borderColor: "var(--border)",
                color: "var(--foreground)",
              }}
            />
            {confirm && password !== confirm && (
              <p
                className="mt-1 text-[10px]"
                style={{ color: "var(--destructive, #dc2626)" }}
              >
                Passwords don't match.
              </p>
            )}
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
            disabled={!canSubmit}
            className="h-11 w-full cursor-pointer border text-[11px] font-semibold tracking-[0.18em] uppercase transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
            style={{
              background: "var(--color-accent, #f24a12)",
              color: "#ffffff",
              borderColor: "var(--color-accent, #f24a12)",
            }}
          >
            {submitting ? "Updating…" : "Set new password"}
          </button>
        </form>

        <div className="mt-6 text-center text-sm">
          <Link
            href="/login"
            className="cursor-pointer transition-opacity hover:opacity-70"
            style={{ color: "var(--muted-foreground, #6b7280)" }}
          >
            ← Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
