"use client";

import { useState } from "react";
import {
  authCardSoft,
  authFieldControl,
} from "@/content/site/auth-field-styles";

export function ForgotForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      setErrorMsg("Enter a valid email address.");
      return;
    }
    setStatus("sending");
    try {
      const res = await fetch("/api/auth/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      // We always succeed to the user (don't leak which emails are registered)
      if (!res.ok && res.status !== 404) {
        throw new Error("Request failed");
      }
      setStatus("sent");
    } catch {
      setStatus("error");
      setErrorMsg("Something went wrong. Try again in a moment.");
    }
  };

  if (status === "sent") {
    return (
      <div
        className="mt-6 border p-5"
        style={{
          ...authCardSoft,
        }}
      >
        <div
          className="text-[10px] font-semibold tracking-[0.22em] uppercase"
          style={{ color: "var(--color-accent, #f24a12)" }}
        >
          ✓ CHECK YOUR INBOX
        </div>
        <p
          className="mt-2 text-sm leading-relaxed"
          style={{ color: "var(--foreground)" }}
        >
          If <strong>{email}</strong> matches an account, we&apos;ve sent a
          reset link. It&apos;s valid for the next 30 minutes.
        </p>
        <p
          className="mt-3 text-xs"
          style={{ color: "var(--muted-foreground, #6b7280)" }}
        >
          Didn&apos;t get it? Check spam, or{" "}
          <button
            type="button"
            onClick={() => setStatus("idle")}
            className="cursor-pointer underline hover:no-underline"
            style={{ color: "var(--color-accent, #f24a12)" }}
          >
            try again
          </button>
          .
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-4">
      <div>
        <label
          htmlFor="forgot-email"
          className="mb-1.5 block text-[10px] font-semibold tracking-[0.16em] uppercase"
          style={{ color: "var(--muted-foreground, #6b7280)" }}
        >
          Email
        </label>
        <input
          id="forgot-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          placeholder="you@email.com"
          required
          disabled={status === "sending"}
          className="h-11 w-full border px-3 text-sm transition-colors outline-none"
          style={{
            ...authFieldControl,
          }}
        />
      </div>

      {errorMsg && (
        <div
          className="border px-3 py-2 text-xs"
          style={{
            background: "rgba(220,38,38,0.06)",
            borderColor: "rgba(220,38,38,0.25)",
            color: "var(--destructive, #dc2626)",
          }}
        >
          {errorMsg}
        </div>
      )}

      <button
        type="submit"
        disabled={status === "sending"}
        className="h-11 w-full cursor-pointer border text-[11px] font-semibold tracking-[0.18em] uppercase transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
        style={{
          background: "var(--color-accent, #f24a12)",
          color: "var(--color-on-accent-fg, #ffffff)",
          borderColor: "var(--color-accent, #f24a12)",
        }}
      >
        {status === "sending" ? "Sending link…" : "Send reset link"}
      </button>
    </form>
  );
}
