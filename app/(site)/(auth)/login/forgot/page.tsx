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
import { ForgotForm } from "./forgot-form";

export const metadata = {
  title: "Reset your password",
  description: "Send a password reset link to your email.",
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return (
    <div className={authSplitGridRoot}>
      {/* Left — editorial poster (same treatment as /login) */}
      <aside
        aria-hidden="true"
        className={authPosterAsideShell}
        style={{ background: "#141110" }}
      >
        <div className={authPosterAbsoluteCover}>
          <AuthPosterImage
            src={AUTH_POSTER_LOGIN}
            alt="Furnishes — interior design for your home"
          />
          {/* Tone overlay so copy is always legible */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, rgba(23,23,23,0.15) 0%, rgba(23,23,23,0.55) 100%)",
            }}
          />

          {/* Copy block bottom-left */}
          <div className="absolute inset-x-10 bottom-12 max-w-md">
            <div
              className="mb-2 text-[10px] tracking-[0.22em] uppercase"
              style={authPosterKickerSx}
            >
              [ ACCOUNT RECOVERY ]
            </div>
            <h2
              className="text-4xl leading-tight font-[var(--font-manrope)] tracking-tight"
              style={authPosterHeadlineSx}
            >
              Lost your way in?
            </h2>
            <p
              className="mt-3 text-sm leading-relaxed"
              style={authPosterBodySx}
            >
              Drop your email and we'll send a one-time link to set a new
              password. Links expire after 30 minutes for your security.
            </p>
          </div>
        </div>
      </aside>

      {/* Right — reset form */}
      <section
        className={`flex flex-col justify-center px-6 py-12 sm:px-10 ${authFormSectionClearHeader}`}
      >
        <div className="mx-auto w-full max-w-sm">
          <div
            className="mb-2 text-[10px] font-semibold tracking-[0.22em] uppercase"
            style={{ color: "var(--color-accent, #f24a12)" }}
          >
            [ RESET PASSWORD ]
          </div>
          <h1
            className="text-3xl leading-tight font-[var(--font-manrope)] tracking-tight"
            style={{ color: "var(--foreground)" }}
          >
            Get a reset link
          </h1>
          <p
            className="mt-2 text-sm"
            style={{ color: "var(--muted-foreground, #6b7280)" }}
          >
            Enter the email you signed up with. We'll email a link valid for 30
            minutes.
          </p>

          <ForgotForm />

          <div
            className="mt-8 border-t pt-5 text-sm"
            style={{ borderColor: "var(--border)" }}
          >
            <Link
              href="/login"
              className="inline-flex cursor-pointer items-center gap-1 font-medium transition-opacity hover:opacity-70"
              style={{ color: "var(--color-accent, #f24a12)" }}
            >
              ← Back to sign in
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
