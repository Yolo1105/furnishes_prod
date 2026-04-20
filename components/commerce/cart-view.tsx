"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  Plus,
  Minus,
  Trash2,
  Bookmark,
  AlertCircle,
  ArrowRight,
  FolderKanban,
} from "lucide-react";
import {
  PageHeader,
  Eyebrow,
  LinkButton,
  SectionCard,
  EmptyState,
  useToast,
} from "@/components/eva-dashboard/account/shared";
import { computeOrderSummary } from "@/lib/commerce/order-summary";
import type { CartItem } from "@/lib/site/commerce/types";
import { formatSGD } from "@/lib/site/money";

export function CartView() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [giftDiscountCents, setGiftDiscountCents] = useState(0);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const refresh = useCallback(async () => {
    const res = await fetch("/api/cart");
    if (!res.ok) {
      setItems([]);
      setGiftDiscountCents(0);
      return;
    }
    const data = (await res.json()) as {
      cart: { items: CartItem[]; giftDiscountCents?: number };
    };
    setItems(data.cart.items);
    setGiftDiscountCents(data.cart.giftDiscountCents ?? 0);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    refresh()
      .catch(() => {
        if (!cancelled) {
          setItems([]);
          setGiftDiscountCents(0);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  const active = items.filter((i) => !i.savedForLater);
  const saved = items.filter((i) => i.savedForLater);
  const summary = computeOrderSummary(active, 0, giftDiscountCents);

  const updateQty = async (id: string, delta: number) => {
    const row = items.find((i) => i.id === id);
    if (!row) return;
    const next = row.qty + delta;
    const max = row.maxQty ?? 99;
    if (next < 1) return;
    if (next > max) {
      toast.error(`Only ${max} available`);
      return;
    }
    const res = await fetch(`/api/cart/items/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ qty: next }),
    });
    if (!res.ok) {
      toast.error("Could not update quantity");
      return;
    }
    const data = (await res.json()) as { items: CartItem[] };
    setItems(data.items);
  };

  const removeItem = async (id: string) => {
    const res = await fetch(`/api/cart/items/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Could not remove item");
      return;
    }
    const data = (await res.json()) as { items: CartItem[] };
    setItems(data.items);
    toast.info("Removed from cart");
  };

  const saveForLater = async (id: string) => {
    const row = items.find((i) => i.id === id);
    if (!row) return;
    const res = await fetch(`/api/cart/items/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ savedForLater: !row.savedForLater }),
    });
    if (!res.ok) {
      toast.error("Could not update item");
      return;
    }
    const data = (await res.json()) as { items: CartItem[] };
    setItems(data.items);
  };

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-[1320px] px-6 py-8 sm:px-8 md:py-10 lg:px-10">
        <PageHeader
          eyebrow="CART"
          title="Your bag"
          subtitle="Loading your cart…"
        />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto w-full max-w-[1320px] px-6 py-8 sm:px-8 md:py-10 lg:px-10">
        <PageHeader
          eyebrow="CART"
          title="Your bag"
          subtitle="Pieces ready to head home with you."
        />
        <EmptyState
          icon={Bookmark}
          title="Your cart is empty"
          body="Browse collections and add something you love."
          cta={
            <LinkButton href="/collections" variant="primary">
              Browse collections
            </LinkButton>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[1320px] flex-col px-6 py-8 sm:px-8 md:py-10 lg:min-h-0 lg:flex-1 lg:px-10">
      <div className="shrink-0">
        <PageHeader
          eyebrow="CART"
          title="Your bag"
          subtitle={`${active.length} ${active.length === 1 ? "item" : "items"} · ${formatSGD(summary.subtotalCents)}`}
        />
      </div>

      <div className="mt-6 flex min-h-0 flex-col gap-5 max-lg:flex-none lg:mt-8 lg:flex-1 lg:flex-row lg:items-stretch lg:gap-6">
        <div className="flex-1 overflow-visible overscroll-contain lg:min-h-0 lg:overflow-y-auto">
          <div className="space-y-5 pb-1">
            <SectionCard padding="none">
              <ul>
                {active.map((item, index) => (
                  <li
                    key={item.id}
                    className="p-5"
                    style={
                      index > 0
                        ? { borderTop: "1px solid var(--border)" }
                        : undefined
                    }
                  >
                    <CartItemRow
                      item={item}
                      onUpdateQty={(delta) => void updateQty(item.id, delta)}
                      onRemove={() => void removeItem(item.id)}
                      onSaveForLater={() => void saveForLater(item.id)}
                    />
                  </li>
                ))}
              </ul>
            </SectionCard>

            {saved.length > 0 && (
              <SectionCard padding="none">
                <div
                  className="border-b px-5 py-3"
                  style={{ borderColor: "var(--border)" }}
                >
                  <div className="flex items-baseline gap-2">
                    <Eyebrow>SAVED FOR LATER</Eyebrow>
                    <span
                      className="font-ui text-xs tabular-nums"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      {saved.length}
                    </span>
                  </div>
                </div>
                <ul>
                  {saved.map((item, index) => (
                    <li
                      key={item.id}
                      className="p-5 opacity-75"
                      style={
                        index > 0
                          ? { borderTop: "1px solid var(--border)" }
                          : undefined
                      }
                    >
                      <CartItemRow
                        item={item}
                        onUpdateQty={(delta) => void updateQty(item.id, delta)}
                        onRemove={() => void removeItem(item.id)}
                        onSaveForLater={() => void saveForLater(item.id)}
                        isSaved
                      />
                    </li>
                  ))}
                </ul>
              </SectionCard>
            )}
          </div>
        </div>

        <aside className="w-full shrink-0 lg:w-[380px] lg:max-w-[380px]">
          <SectionCard padding="lg">
            <Eyebrow>ORDER SUMMARY</Eyebrow>

            <dl
              className="font-body mt-5 space-y-2 text-sm"
              style={{ color: "var(--foreground)" }}
            >
              <div className="flex justify-between">
                <dt style={{ color: "var(--muted-foreground)" }}>Subtotal</dt>
                <dd className="tabular-nums">
                  {formatSGD(summary.subtotalCents)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt style={{ color: "var(--muted-foreground)" }}>Delivery</dt>
                <dd className="tabular-nums">
                  {summary.deliveryCents === 0
                    ? "Calculated at checkout"
                    : formatSGD(summary.deliveryCents)}
                </dd>
              </div>
              {summary.discountCents > 0 && (
                <div
                  className="flex justify-between"
                  style={{ color: "var(--primary)" }}
                >
                  <dt>Gift code</dt>
                  <dd className="tabular-nums">
                    −{formatSGD(summary.discountCents)}
                  </dd>
                </div>
              )}
            </dl>

            <div
              className="mt-5 border-t pt-4"
              style={{ borderColor: "var(--border)" }}
            >
              <div className="flex items-baseline justify-between">
                <span
                  className="font-ui text-[10.5px] tracking-[0.22em] uppercase"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  Total
                </span>
                <span
                  className="font-display text-2xl tabular-nums"
                  style={{ color: "var(--foreground)" }}
                >
                  {formatSGD(summary.totalCents)}
                </span>
              </div>
            </div>

            <LinkButton
              href="/checkout/shipping"
              variant="primary"
              className="mt-5 w-full justify-center"
              icon={<ArrowRight className="h-3.5 w-3.5" />}
            >
              Checkout
            </LinkButton>
            <LinkButton
              href="/collections"
              variant="secondary"
              className="mt-2 w-full justify-center"
            >
              Continue shopping
            </LinkButton>

            <p
              className="font-body mt-5 border-t pt-4 text-xs"
              style={{
                borderColor: "var(--border)",
                color: "var(--muted-foreground)",
              }}
            >
              Promotional and gift codes are not applied at checkout yet.
            </p>

            <ul
              className="font-body mt-5 space-y-1.5 border-t pt-4 text-xs"
              style={{
                borderColor: "var(--border)",
                color: "var(--muted-foreground)",
              }}
            >
              <li>✓ Eva-vetted for your style</li>
              <li>✓ SG-based fulfilment</li>
              <li>✓ 14-day returns on unused items</li>
            </ul>
          </SectionCard>
        </aside>
      </div>
    </div>
  );
}

function CartItemRow({
  item,
  onUpdateQty,
  onRemove,
  onSaveForLater,
  isSaved,
}: {
  item: CartItem;
  onUpdateQty: (delta: number) => void;
  onRemove: () => void;
  onSaveForLater: () => void;
  isSaved?: boolean;
}) {
  return (
    <div className="flex gap-4">
      <div
        className="h-28 w-28 shrink-0 border"
        style={{
          background: `linear-gradient(135deg, oklch(0.88 0.08 ${item.coverHue}), oklch(0.62 0.14 ${item.coverHue}))`,
          borderColor: "var(--border)",
        }}
        aria-label={`${item.productName} thumbnail`}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div
              className="font-ui text-[9.5px] tracking-[0.16em] uppercase"
              style={{ color: "var(--muted-foreground)" }}
            >
              {item.productCategory}
            </div>
            <h3
              className="font-display mt-0.5 text-base"
              style={{ color: "var(--foreground)" }}
            >
              {item.productName}
            </h3>
            {item.variantLabel && (
              <p
                className="font-body mt-0.5 text-xs"
                style={{ color: "var(--muted-foreground)" }}
              >
                {item.variantLabel}
              </p>
            )}
            {item.subline && (
              <p
                className="font-body mt-0.5 text-xs"
                style={{ color: "var(--muted-foreground)" }}
              >
                {item.subline}
              </p>
            )}
            {item.projectName && item.projectId && (
              <Link
                href={`/account/projects/${item.projectId}`}
                className="font-ui mt-1.5 inline-flex items-center gap-1 text-[10px] tracking-[0.16em] uppercase hover:underline"
                style={{ color: "var(--primary)" }}
              >
                <FolderKanban className="h-2.5 w-2.5" />
                {item.projectName}
              </Link>
            )}
          </div>
          <div
            className="font-display shrink-0 text-base tabular-nums"
            style={{ color: "var(--foreground)" }}
          >
            {formatSGD(item.unitPriceCents * item.qty)}
          </div>
        </div>

        {item.stockWarning && (
          <div
            className="font-ui mt-2 inline-flex items-center gap-1 self-start border px-2 py-0.5 text-[9px] tracking-[0.16em] uppercase"
            style={{
              background: "var(--accent-soft)",
              borderColor: "var(--primary)",
              color: "var(--primary)",
            }}
          >
            <AlertCircle className="h-2.5 w-2.5" />
            {item.stockWarning}
          </div>
        )}

        <div className="mt-auto flex items-center justify-between pt-3">
          {!isSaved ? (
            <div
              className="inline-flex items-center border"
              style={{ borderColor: "var(--border-strong)" }}
            >
              <button
                type="button"
                onClick={() => onUpdateQty(-1)}
                disabled={item.qty <= 1}
                aria-label="Decrease quantity"
                className="inline-flex h-8 w-8 items-center justify-center transition-colors disabled:opacity-30"
                style={{ color: "var(--foreground)" }}
              >
                <Minus className="h-3 w-3" />
              </button>
              <span
                className="font-ui w-8 text-center text-sm tabular-nums"
                style={{ color: "var(--foreground)" }}
              >
                {item.qty}
              </span>
              <button
                type="button"
                onClick={() => onUpdateQty(1)}
                aria-label="Increase quantity"
                className="inline-flex h-8 w-8 items-center justify-center transition-colors"
                style={{ color: "var(--foreground)" }}
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <span
              className="font-ui text-[10px] tracking-[0.18em] uppercase"
              style={{ color: "var(--muted-foreground)" }}
            >
              Saved for later
            </span>
          )}

          <div className="flex gap-1">
            <button
              type="button"
              onClick={onSaveForLater}
              className="font-ui inline-flex items-center gap-1 px-2 py-1 text-[10px] tracking-[0.16em] uppercase hover:underline"
              style={{ color: "var(--muted-foreground)" }}
            >
              <Bookmark className="h-3 w-3" />
              {isSaved ? "Move to cart" : "Save for later"}
            </button>
            <button
              type="button"
              onClick={onRemove}
              aria-label="Remove"
              className="inline-flex h-7 w-7 items-center justify-center transition-colors hover:text-[var(--destructive)]"
              style={{ color: "var(--muted-foreground)" }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
