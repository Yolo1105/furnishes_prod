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
import { AUTH_POSTER_LOGIN } from "@/content/site/auth-posters";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Sign in — Furnishes",
  description: "Sign in to your Furnishes account.",
};

export default function LoginPage() {
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
            src={AUTH_POSTER_LOGIN}
            alt="Furnishes — interior design for your home"
            priority
          />
          {/* Tone overlay so copy is always legible on any image */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, rgba(23,23,23,0.15) 0%, rgba(23,23,23,0.55) 100%)",
            }}
          />

          {/* Copy block bottom */}
          <div className="absolute inset-x-10 bottom-12 max-w-md">
            <div
              className="mb-2 text-[10px] tracking-[0.22em] uppercase"
              style={authPosterKickerSx}
            >
              [ YOUR DESIGN WORKSPACE ]
            </div>
            <h2
              className="text-4xl leading-tight font-[var(--font-manrope)] tracking-tight md:text-5xl"
              style={authPosterHeadlineSx}
            >
              A room that thinks with you.
            </h2>
            <p
              className="mt-3 max-w-md text-sm leading-relaxed"
              style={authPosterBodySx}
            >
              Eva remembers your style, your budget, your must-haves and
              deal-breakers — and pulls pieces from our collections that fit.
            </p>
          </div>
        </div>
      </aside>

      {/* ── Right — sign-in form ────────────────────────────── */}
      <section
        className={`flex flex-col justify-center px-6 py-12 sm:px-10 ${authFormSectionClearHeader}`}
      >
        <div className="mx-auto w-full max-w-sm">
          <div
            className="mb-2 text-[10px] font-semibold tracking-[0.22em] uppercase"
            style={{ color: "var(--color-accent, #f24a12)" }}
          >
            [ SIGN IN ]
          </div>
          <h1
            className="text-3xl leading-tight font-[var(--font-manrope)] tracking-tight"
            style={{ color: "var(--foreground, #171717)" }}
          >
            Welcome back
          </h1>
          <p
            className="mt-2 text-sm"
            style={{ color: "var(--muted-foreground, #6b7280)" }}
          >
            Sign in to pick up where you left off.
          </p>

          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>

          <div
            className="mt-6 flex items-center justify-between text-sm"
            style={{ color: "var(--muted-foreground, #6b7280)" }}
          >
            <Link
              href="/login/forgot"
              className="cursor-pointer transition-opacity hover:opacity-70"
            >
              Forgot password?
            </Link>
            <Link
              href="/signup"
              className="cursor-pointer font-medium transition-opacity hover:opacity-70"
              style={{ color: "var(--color-accent, #f24a12)" }}
            >
              Create account →
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
