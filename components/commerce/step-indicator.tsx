"use client";

import Link from "next/link";
import { Check } from "lucide-react";

type Step = {
  key: "shipping" | "delivery" | "review";
  label: string;
};

const STEPS: Step[] = [
  { key: "shipping", label: "Shipping" },
  { key: "delivery", label: "Delivery" },
  { key: "review", label: "Review" },
];

export function StepIndicator({ current }: { current: Step["key"] }) {
  const currentIdx = STEPS.findIndex((s) => s.key === current);

  return (
    <nav
      aria-label="Checkout progress"
      className="flex items-stretch border-b"
      style={{ borderColor: "var(--border)" }}
    >
      {STEPS.map((step, i) => {
        const state: "done" | "active" | "pending" =
          i < currentIdx ? "done" : i === currentIdx ? "active" : "pending";
        const href = state === "done" ? `/checkout/${step.key}` : undefined;
        const content = (
          <StepCell
            index={i + 1}
            total={STEPS.length}
            label={step.label}
            state={state}
          />
        );
        return href ? (
          <Link
            key={step.key}
            href={href}
            className="flex-1 transition-opacity hover:opacity-80"
          >
            {content}
          </Link>
        ) : (
          <div key={step.key} className="flex-1">
            {content}
          </div>
        );
      })}
    </nav>
  );
}

function StepCell({
  index,
  total,
  label,
  state,
}: {
  index: number;
  total: number;
  label: string;
  state: "done" | "active" | "pending";
}) {
  const color =
    state === "active" || state === "done"
      ? "var(--foreground)"
      : "var(--muted-foreground)";
  const border = state === "active" ? "var(--primary)" : "transparent";
  const fontWeight = state === "active" ? 600 : 500;

  return (
    <div
      className="flex h-14 items-center justify-center gap-3 px-4"
      style={{
        color,
        borderBottom: `2px solid ${border}`,
      }}
    >
      {state === "done" ? (
        <span
          className="inline-flex h-6 w-6 items-center justify-center"
          style={{
            background: "var(--primary)",
            color: "var(--primary-foreground)",
          }}
          aria-hidden
        >
          <Check className="h-3 w-3" />
        </span>
      ) : (
        <span
          className="font-ui inline-flex h-6 w-6 items-center justify-center border text-[10px] tabular-nums"
          style={{
            borderColor:
              state === "active" ? "var(--primary)" : "var(--border-strong)",
            color:
              state === "active" ? "var(--primary)" : "var(--muted-foreground)",
          }}
          aria-hidden
        >
          {index.toString().padStart(2, "0")}
        </span>
      )}
      <div className="flex flex-col items-start leading-tight">
        <span
          className="font-ui text-[9.5px] tracking-[0.22em] uppercase"
          style={{ color: "var(--muted-foreground)" }}
        >
          Step {index} / {total}
        </span>
        <span
          className="font-ui text-[13px] tracking-tight"
          style={{ fontWeight }}
        >
          {label}
        </span>
      </div>
    </div>
  );
}
