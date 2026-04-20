"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { isMockAuthUiOffered } from "@/lib/auth/mock-auth";
import { authFieldControl } from "@/content/site/auth-field-styles";

export function SignupForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const strength = getStrength(password);
  const canSubmit =
    name.trim().length >= 2 &&
    /^\S+@\S+\.\S+$/.test(email) &&
    password.length >= 12 &&
    agreed &&
    !submitting;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          password,
          marketingOptIn: marketing,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: string;
          message?: string;
        } | null;
        if (res.status === 409) {
          setError("That email is already registered. Try signing in.");
        } else if (res.status === 422) {
          setError(body?.message ?? "Check your details and try again.");
        } else {
          setError("Couldn't create the account. Try again shortly.");
        }
        return;
      }

      // In dev / mock mode, the signup API doesn't establish a NextAuth
      // session. Set the mock cookie so the /account/welcome route doesn't
      // bounce them back to /login.
      if (isMockAuthUiOffered()) {
        document.cookie = `furnishes-mock-auth=1; path=/; max-age=${30 * 24 * 60 * 60}; SameSite=Lax`;
        // Full load so dev Webpack chunks stay in sync (see login-form mock path).
        window.location.assign("/account/welcome");
        return;
      }

      // Success — send to the welcome flow
      router.push("/account/welcome");
      router.refresh();
    } catch {
      setError("Network error. Try again in a moment.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-4">
      <div>
        <label
          htmlFor="su-name"
          className="mb-1.5 block text-[10px] font-semibold tracking-[0.16em] uppercase"
          style={{ color: "var(--muted-foreground, #6b7280)" }}
        >
          Full name
        </label>
        <input
          id="su-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
          required
          disabled={submitting}
          className="h-11 w-full border px-3 text-sm outline-none"
          style={{
            ...authFieldControl,
          }}
        />
      </div>

      <div>
        <label
          htmlFor="su-email"
          className="mb-1.5 block text-[10px] font-semibold tracking-[0.16em] uppercase"
          style={{ color: "var(--muted-foreground, #6b7280)" }}
        >
          Email
        </label>
        <input
          id="su-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
          disabled={submitting}
          className="h-11 w-full border px-3 text-sm outline-none"
          style={{
            ...authFieldControl,
          }}
        />
      </div>

      <div>
        <label
          htmlFor="su-password"
          className="mb-1.5 block text-[10px] font-semibold tracking-[0.16em] uppercase"
          style={{ color: "var(--muted-foreground, #6b7280)" }}
        >
          Password
        </label>
        <input
          id="su-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          required
          minLength={12}
          disabled={submitting}
          placeholder="At least 12 characters"
          className="h-11 w-full border px-3 text-sm outline-none"
          style={{
            ...authFieldControl,
          }}
        />
        {/* Strength meter */}
        <div className="mt-1.5 flex h-1 gap-0.5" aria-hidden="true">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex-1"
              style={{
                background:
                  strength.score > i ? strength.color : "var(--border)",
              }}
            />
          ))}
        </div>
        <p
          className="mt-1 text-[10px]"
          style={{ color: "var(--muted-foreground, #6b7280)" }}
        >
          {strength.label}
        </p>
      </div>

      {/* Terms consent */}
      <label
        htmlFor="su-agree"
        className="flex cursor-pointer items-start gap-2 text-xs"
        style={{ color: "var(--foreground)" }}
      >
        <input
          id="su-agree"
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          required
          className="mt-0.5 h-4 w-4 accent-[var(--color-accent,#f24a12)]"
        />
        <span>
          I agree to the{" "}
          <Link
            href="/terms"
            className="cursor-pointer underline hover:opacity-70"
          >
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link
            href="/privacy-policy"
            className="cursor-pointer underline hover:opacity-70"
          >
            Privacy Policy
          </Link>
          . PDPA-compliant for Singapore users.
        </span>
      </label>

      {/* Marketing opt-in */}
      <label
        htmlFor="su-marketing"
        className="flex cursor-pointer items-start gap-2 text-xs"
        style={{ color: "var(--muted-foreground, #6b7280)" }}
      >
        <input
          id="su-marketing"
          type="checkbox"
          checked={marketing}
          onChange={(e) => setMarketing(e.target.checked)}
          className="mt-0.5 h-4 w-4 accent-[var(--color-accent,#f24a12)]"
        />
        <span>
          Send me occasional emails about new collections and design ideas. You
          can unsubscribe anytime.
        </span>
      </label>

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
        {submitting ? "Creating account…" : "Create account"}
      </button>
    </form>
  );
}

function getStrength(pw: string): {
  score: number;
  label: string;
  color: string;
} {
  if (!pw)
    return {
      score: 0,
      label: "At least 12 characters",
      color: "var(--border)",
    };
  if (pw.length < 12)
    return { score: 1, label: "Too short — keep going", color: "#B4442A" };
  let score = 2;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score++;
  const map = [
    { label: "Weak", color: "#B4442A" },
    { label: "Fair", color: "#C9791F" },
    { label: "Good", color: "#7A9C4A" },
    { label: "Strong", color: "#4A7A3A" },
  ];
  const m = map[Math.min(3, score - 1)]!;
  return { score, label: m.label, color: m.color };
}
