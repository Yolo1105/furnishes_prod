"use client";

import type { CartItem, OrderSummary } from "@/lib/site/commerce/types";
import { Eyebrow } from "@/components/eva-dashboard/account/shared";
import { formatSGD } from "@/lib/site/money";

export function OrderSummaryPanel({
  items,
  summary,
  ctaLabel,
  onContinue,
  continueDisabled,
}: {
  items: CartItem[];
  summary: OrderSummary;
  ctaLabel: string;
  onContinue: () => void;
  continueDisabled?: boolean;
}) {
  const active = items.filter((i) => !i.savedForLater);

  return (
    <aside
      className="border p-5"
      style={{
        background: "var(--card)",
        borderColor: "var(--border)",
      }}
    >
      <Eyebrow>ORDER SUMMARY</Eyebrow>

      <ul
        className="mt-4 space-y-3 border-b pb-4"
        style={{ borderColor: "var(--border)" }}
      >
        {active.map((i) => (
          <li key={i.id} className="flex gap-3">
            <div
              className="h-12 w-12 shrink-0 border"
              style={{
                background: `linear-gradient(135deg, oklch(0.88 0.08 ${i.coverHue}), oklch(0.62 0.14 ${i.coverHue}))`,
                borderColor: "var(--border)",
              }}
            />
            <div className="min-w-0 flex-1">
              <div
                className="font-ui truncate text-xs"
                style={{ color: "var(--foreground)" }}
              >
                {i.productName}
              </div>
              <div
                className="font-body text-[11px]"
                style={{ color: "var(--muted-foreground)" }}
              >
                Qty {i.qty}
              </div>
            </div>
            <div
              className="font-ui shrink-0 text-xs tabular-nums"
              style={{ color: "var(--foreground)" }}
            >
              {formatSGD(i.unitPriceCents * i.qty)}
            </div>
          </li>
        ))}
      </ul>

      <dl
        className="font-body mt-4 space-y-1.5 text-sm"
        style={{ color: "var(--foreground)" }}
      >
        <div className="flex justify-between">
          <dt style={{ color: "var(--muted-foreground)" }}>Subtotal</dt>
          <dd className="tabular-nums">{formatSGD(summary.subtotalCents)}</dd>
        </div>
        <div className="flex justify-between">
          <dt style={{ color: "var(--muted-foreground)" }}>Delivery</dt>
          <dd className="tabular-nums">
            {summary.deliveryCents === 0
              ? "—"
              : formatSGD(summary.deliveryCents)}
          </dd>
        </div>
        {summary.discountCents > 0 && (
          <div
            className="flex justify-between"
            style={{ color: "var(--primary)" }}
          >
            <dt>Discount</dt>
            <dd className="tabular-nums">
              −{formatSGD(summary.discountCents)}
            </dd>
          </div>
        )}
      </dl>

      <div
        className="mt-4 flex items-baseline justify-between border-t pt-3"
        style={{ borderColor: "var(--border)" }}
      >
        <span
          className="font-ui text-[10.5px] tracking-[0.22em] uppercase"
          style={{ color: "var(--muted-foreground)" }}
        >
          Total
        </span>
        <span
          className="font-display text-xl tabular-nums"
          style={{ color: "var(--foreground)" }}
        >
          {formatSGD(summary.totalCents)}
        </span>
      </div>

      <button
        type="button"
        onClick={onContinue}
        disabled={continueDisabled}
        className="font-ui mt-5 h-11 w-full border text-[11px] tracking-[0.18em] uppercase transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
        style={{
          background: "var(--primary)",
          color: "var(--primary-foreground)",
          borderColor: "var(--primary)",
        }}
      >
        {ctaLabel}
      </button>
    </aside>
  );
}
