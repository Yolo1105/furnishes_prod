"use client";

import { useContext } from "react";
import Link from "next/link";
import { Trash2, ArrowRight } from "lucide-react";
import { CartContext } from "@/contexts/CartContext";
import styles from "./CartContent.module.css";

// Mini SVG illustrations for common furniture categories (matches ShoppingAssistant style)
const CATEGORY_SVG: Record<string, (color: string) => React.ReactNode> = {
  Seating: (c) => (
    <svg viewBox="0 0 48 36" fill="none" width="48" height="36">
      <rect x="4" y="14" width="40" height="14" rx="5" fill={c} opacity=".8" />
      <rect x="2" y="16" width="8" height="10" rx="3" fill={c} opacity=".5" />
      <rect x="38" y="16" width="8" height="10" rx="3" fill={c} opacity=".5" />
      <rect x="8" y="8" width="32" height="8" rx="3" fill={c} opacity=".4" />
      <rect x="8" y="28" width="4" height="6" rx="1.5" fill={c} opacity=".6" />
      <rect x="36" y="28" width="4" height="6" rx="1.5" fill={c} opacity=".6" />
    </svg>
  ),
  Lighting: (c) => (
    <svg viewBox="0 0 48 48" fill="none" width="48" height="36">
      <line
        x1="24"
        y1="8"
        x2="24"
        y2="40"
        stroke={c}
        strokeWidth="2"
        opacity=".7"
      />
      <ellipse cx="24" cy="16" rx="12" ry="7" fill={c} opacity=".4" />
      <ellipse cx="24" cy="40" rx="5" ry="2" fill={c} opacity=".2" />
    </svg>
  ),
  Storage: (c) => (
    <svg viewBox="0 0 48 36" fill="none" width="48" height="36">
      <rect x="4" y="4" width="40" height="28" rx="3" fill={c} opacity=".6" />
      <line
        x1="4"
        y1="18"
        x2="44"
        y2="18"
        stroke="#fff"
        strokeWidth="1.5"
        opacity=".4"
      />
      <circle cx="24" cy="11" r="2" fill="#fff" opacity=".5" />
      <circle cx="24" cy="25" r="2" fill="#fff" opacity=".5" />
    </svg>
  ),
  Dining: (c) => (
    <svg viewBox="0 0 48 36" fill="none" width="48" height="36">
      <rect x="6" y="14" width="36" height="6" rx="2" fill={c} opacity=".8" />
      <rect
        x="12"
        y="20"
        width="4"
        height="12"
        rx="1.5"
        fill={c}
        opacity=".5"
      />
      <rect
        x="32"
        y="20"
        width="4"
        height="12"
        rx="1.5"
        fill={c}
        opacity=".5"
      />
    </svg>
  ),
  Bedroom: (c) => (
    <svg viewBox="0 0 48 36" fill="none" width="48" height="36">
      <rect x="4" y="16" width="40" height="14" rx="3" fill={c} opacity=".7" />
      <rect x="6" y="8" width="36" height="10" rx="4" fill={c} opacity=".5" />
      <rect x="4" y="30" width="40" height="4" rx="2" fill={c} opacity=".3" />
    </svg>
  ),
};

const DEFAULT_SVG = (c: string) => (
  <svg viewBox="0 0 48 36" fill="none" width="48" height="36">
    <rect x="6" y="8" width="36" height="24" rx="5" fill={c} opacity=".6" />
  </svg>
);

const ACCENT = "#C4622D";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);

export function CartContent() {
  const ctx = useContext(CartContext);
  const { items = [], subtotal = 0, removeItem } = ctx ?? {};

  if (items.length === 0) {
    return (
      <div className={styles.empty}>
        <div className={styles.emptyIllo} aria-hidden="true">
          <svg viewBox="0 0 80 80" fill="none" width="64" height="64">
            <circle cx="40" cy="40" r="36" fill="#fcf2e8" />
            <rect
              x="20"
              y="28"
              width="40"
              height="30"
              rx="5"
              stroke={ACCENT}
              strokeWidth="1.5"
            />
            <path
              d="M28 28v-6a12 12 0 0124 0v6"
              stroke={ACCENT}
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <circle cx="32" cy="44" r="3" fill={ACCENT} opacity=".4" />
            <circle cx="48" cy="44" r="3" fill={ACCENT} opacity=".4" />
          </svg>
        </div>
        <p className={styles.emptyTitle}>Your cart is empty</p>
        <p className={styles.emptySub}>
          Discover curated pieces for your space.
        </p>
        <Link href="/collections" className={styles.browseBtn}>
          Browse Collections <ArrowRight size={13} strokeWidth={2} />
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.root}>
      <p className={styles.eyebrow}>
        {items.length} item{items.length !== 1 ? "s" : ""} in your cart
      </p>

      <ul className={styles.list}>
        {items.map((item) => {
          const render = CATEGORY_SVG[item.variant ?? ""] ?? DEFAULT_SVG;
          return (
            <li key={item.id} className={styles.item}>
              {/* SVG illustration */}
              <div className={styles.illo} aria-hidden="true">
                {render(ACCENT)}
              </div>

              <div className={styles.details}>
                <p className={styles.itemName}>{item.name}</p>
                {item.variant && (
                  <p className={styles.itemVariant}>{item.variant}</p>
                )}
                <div className={styles.itemFoot}>
                  <span className={styles.itemPrice}>{fmt(item.price)}</span>
                  {item.quantity > 1 && (
                    <span className={styles.itemQty}>× {item.quantity}</span>
                  )}
                </div>
              </div>

              <button
                className={styles.removeBtn}
                onClick={() => removeItem?.(item.id)}
                aria-label={`Remove ${item.name}`}
              >
                <Trash2 size={12} strokeWidth={1.8} />
              </button>
            </li>
          );
        })}
      </ul>

      <div className={styles.footer}>
        <div className={styles.subtotalRow}>
          <span className={styles.subtotalLabel}>Subtotal</span>
          <span className={styles.subtotalValue}>{fmt(subtotal)}</span>
        </div>
        <p className={styles.subtotalNote}>
          Free white-glove delivery over $2,000
        </p>
        <button className={styles.checkoutBtn}>
          Checkout <ArrowRight size={13} strokeWidth={2} />
        </button>
        <Link href="/collections" className={styles.continueLink}>
          Continue shopping
        </Link>
      </div>
    </div>
  );
}
