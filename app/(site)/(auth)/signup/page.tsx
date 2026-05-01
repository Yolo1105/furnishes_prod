import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { AuthPosterImage } from "@/components/site/auth-poster-image";
import {
  authPosterBodySx,
  authPosterHeadlineSx,
  authPosterKickerSx,
} from "@/content/site/auth-poster-copy";
import {
  authFormSectionClearHeader,
  authPosterAbsoluteCover,
  authPosterAsideShell,
  authSplitGridRoot,
} from "@/content/site/auth-split-classes";
import { AUTH_POSTER_SIGNUP } from "@/content/site/auth-posters";
import { SignupForm } from "./signup-form";

export const metadata: Metadata = {
  title: "Create your account — Furnishes",
  description: "Sign up for a free Furnishes account.",
};

export default function SignupPage() {
  return (
    <div className={authSplitGridRoot}>
      {/* ── Left — editorial poster ─────────────────────────── */}
      <aside
        aria-hidden="true"
        className={authPosterAsideShell}
        style={{ background: "#141110" }}
      >
        <div className={authPosterAbsoluteCover}>
          <AuthPosterImage
            src={AUTH_POSTER_SIGNUP}
            alt="Furnishes — create your design workspace"
            priority
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, rgba(23,23,23,0.15) 0%, rgba(23,23,23,0.55) 100%)",
            }}
          />

          <div className="absolute inset-x-10 bottom-12 max-w-md">
            <div
              className="mb-2 text-[10px] tracking-[0.22em] uppercase"
              style={authPosterKickerSx}
            >
              [ WELCOME ]
            </div>
            <h2
              className="text-4xl leading-tight font-[var(--font-manrope)] tracking-tight md:text-5xl"
              style={authPosterHeadlineSx}
            >
              Let&apos;s build a room together.
            </h2>
            <p
              className="mt-3 max-w-md text-sm leading-relaxed"
              style={authPosterBodySx}
            >
              Take the Style Explorer, brief Eva, save what you love. Your
              account is free — forever, for that part.
            </p>
          </div>
        </div>
      </aside>

      {/* ── Right — form ──────────────────────────────────── */}
      <section
        className={`flex flex-col justify-center px-6 py-12 sm:px-10 ${authFormSectionClearHeader}`}
      >
        <div className="mx-auto w-full max-w-sm">
          <div
            className="mb-2 text-[10px] font-semibold tracking-[0.22em] uppercase"
            style={{ color: "var(--color-accent, #f24a12)" }}
          >
            [ CREATE ACCOUNT ]
          </div>
          <h1
            className="text-3xl leading-tight font-[var(--font-manrope)] tracking-tight"
            style={{ color: "var(--foreground, #171717)" }}
          >
            Make your workspace
          </h1>
          <p
            className="mt-2 text-sm"
            style={{ color: "var(--muted-foreground, #6b7280)" }}
          >
            Takes under a minute. We&apos;ll send a one-time verification email.
          </p>

          <Suspense fallback={null}>
            <SignupForm />
          </Suspense>

          <div
            className="mt-8 border-t pt-5 text-sm"
            style={{
              borderColor: "var(--border)",
              color: "var(--muted-foreground)",
            }}
          >
            Already have an account?{" "}
            <Link
              href="/login"
              className="cursor-pointer font-medium transition-opacity hover:opacity-70"
              style={{ color: "var(--color-accent, #f24a12)" }}
            >
              Sign in →
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
