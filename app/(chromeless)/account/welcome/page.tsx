"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  PiggyBank,
  MessagesSquare,
  ArrowRight,
  Check,
  SkipForward,
} from "lucide-react";
import {
  PageHeader,
  Eyebrow,
  SectionCard,
} from "@/components/eva-dashboard/account/shared";

/**
 * /account/welcome — first-time user onboarding.
 *
 * Three guided steps, non-blocking (user can skip any). Each step has a
 * clear CTA to the relevant feature; tracking which are completed happens
 * server-side via User.createdAt + quiz/preference counts.
 */
export default function WelcomePage() {
  const router = useRouter();
  const [stepsDone, setStepsDone] = useState<Set<string>>(new Set());

  const markDone = (key: string) => {
    setStepsDone((s) => new Set(s).add(key));
  };

  return (
    <div
      className="eva-dashboard-root font-[var(--font-manrope)]"
      style={{
        minHeight: "100vh",
        background: "var(--background)",
        color: "var(--foreground)",
      }}
    >
      <div className="mx-auto w-full max-w-[920px] px-6 py-12 sm:px-8 md:py-16 lg:px-10">
        <PageHeader
          eyebrow="WELCOME"
          title="Let's set up your workspace."
          subtitle="Three quick things to get Eva useful. None of this is required — skip anything and come back when you're ready."
        />

        {/* Progress */}
        <div
          className="mb-8 flex items-center gap-4 border px-4 py-3"
          style={{
            background: "var(--card)",
            borderColor: "var(--border)",
          }}
        >
          <div
            className="font-ui text-[10px] tracking-[0.22em] uppercase"
            style={{ color: "var(--muted-foreground)" }}
          >
            PROGRESS
          </div>
          <div
            className="font-ui flex-1 text-sm tabular-nums"
            style={{ color: "var(--foreground)" }}
          >
            {stepsDone.size} / 3 complete
          </div>
          <div className="h-1 w-32" style={{ background: "var(--muted)" }}>
            <div
              className="h-full transition-all"
              style={{
                width: `${(stepsDone.size / 3) * 100}%`,
                background: "var(--primary)",
              }}
            />
          </div>
        </div>

        <div className="space-y-4">
          <WelcomeStep
            number="01"
            eyebrow="STYLE PROFILE"
            title="Take the Style Explorer"
            body="A 2-minute quiz surfaces your design language — anchors every recommendation Eva makes from here on."
            Icon={Sparkles}
            ctaLabel="Start the quiz"
            ctaHref="/quiz"
            skipLabel="Skip for now"
            onSkip={() => markDone("style")}
            done={stepsDone.has("style")}
          />

          <WelcomeStep
            number="02"
            eyebrow="BUDGET"
            title="Set a budget range"
            body="Tells Eva and Collections to only surface pieces you can actually afford. Ranges are fine — you can refine later."
            Icon={PiggyBank}
            ctaLabel="Set a budget"
            ctaHref="/account/budget"
            skipLabel="Skip for now"
            onSkip={() => markDone("budget")}
            done={stepsDone.has("budget")}
          />

          <WelcomeStep
            number="03"
            eyebrow="CONVERSATION"
            title="Brief Eva about a room"
            body="Tell Eva about the space you're working on — layout, what's there, what's frustrating you. She'll take it from there."
            Icon={MessagesSquare}
            ctaLabel="Open Eva"
            ctaHref="/chatbot"
            skipLabel="Skip for now"
            onSkip={() => markDone("chat")}
            done={stepsDone.has("chat")}
          />
        </div>

        {/* Skip all */}
        <div
          className="mt-10 flex items-center justify-between border-t pt-6"
          style={{ borderColor: "var(--border)" }}
        >
          <p
            className="font-body text-xs"
            style={{ color: "var(--muted-foreground)" }}
          >
            You can always come back to these from the dashboard.
          </p>
          <button
            type="button"
            onClick={() => router.push("/account")}
            className="font-ui inline-flex items-center gap-2 border px-4 py-2 text-[10.5px] tracking-[0.14em] uppercase"
            style={{
              background: "var(--primary)",
              color: "var(--primary-foreground)",
              borderColor: "var(--primary)",
            }}
          >
            Go to Studio
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function WelcomeStep({
  number,
  eyebrow,
  title,
  body,
  Icon,
  ctaLabel,
  ctaHref,
  skipLabel,
  onSkip,
  done,
}: {
  number: string;
  eyebrow: string;
  title: string;
  body: string;
  Icon: React.ComponentType<{ className?: string }>;
  ctaLabel: string;
  ctaHref: string;
  skipLabel: string;
  onSkip: () => void;
  done: boolean;
}) {
  return (
    <SectionCard padding="lg">
      <div className="flex items-start gap-5">
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center border"
          style={{
            background: done ? "var(--primary)" : "var(--accent-soft)",
            color: done ? "var(--primary-foreground)" : "var(--primary)",
            borderColor: done ? "var(--primary)" : "var(--border)",
          }}
        >
          {done ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-3">
            <span
              className="font-display text-sm tabular-nums"
              style={{ color: "var(--primary)" }}
            >
              {number}
            </span>
            <Eyebrow>{eyebrow}</Eyebrow>
          </div>
          <h3
            className="font-display mt-1 text-lg"
            style={{
              color: "var(--foreground)",
              textDecoration: done ? "line-through" : "none",
              opacity: done ? 0.6 : 1,
            }}
          >
            {title}
          </h3>
          <p
            className="font-body mt-1 text-sm"
            style={{ color: "var(--muted-foreground)" }}
          >
            {body}
          </p>

          {!done && (
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href={ctaHref}
                className="font-ui inline-flex items-center gap-1.5 border px-4 py-2 text-[10.5px] tracking-[0.14em] uppercase"
                style={{
                  background: "var(--primary)",
                  color: "var(--primary-foreground)",
                  borderColor: "var(--primary)",
                }}
              >
                {ctaLabel}
                <ArrowRight className="h-3 w-3" />
              </Link>
              <button
                type="button"
                onClick={onSkip}
                className="font-ui inline-flex items-center gap-1.5 border px-4 py-2 text-[10.5px] tracking-[0.14em] uppercase"
                style={{
                  background: "var(--card)",
                  color: "var(--muted-foreground)",
                  borderColor: "var(--border-strong)",
                }}
              >
                <SkipForward className="h-3 w-3" />
                {skipLabel}
              </button>
            </div>
          )}
        </div>
      </div>
    </SectionCard>
  );
}
