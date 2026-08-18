/**
 * Money for commerce. Integer cents only, never floats (docs/COMMERCE.md).
 *
 * Prices are authored per market in `VariantPrice`. Nothing here converts
 * between currencies on the fly, because a converted figure could not be traced
 * back to a stored row — which is the rule every displayed price must satisfy.
 *
 * Shared by server and client, so it must stay free of Node-only imports.
 */

/**
 * All supported currencies have two decimal places, so a "cent" is always
 * 1/100 of a unit. Zero-decimal currencies (JPY, KRW) would need explicit
 * minor-unit handling here *and* in the payment provider, which expects the
 * smallest unit — adding one without that would overcharge by 100x.
 */
export const SUPPORTED_CURRENCIES = [
  "SGD",
  "USD",
  "EUR",
  "GBP",
  "AUD",
  "MYR",
] as const;

export type Currency = (typeof SUPPORTED_CURRENCIES)[number];

export const DEFAULT_CURRENCY: Currency = "SGD";

export function isSupportedCurrency(value: string): value is Currency {
  return (SUPPORTED_CURRENCIES as readonly string[]).includes(value);
}

/** Uppercases and validates; returns null for anything unsupported. */
export function normalizeCurrency(
  value: string | null | undefined,
): Currency | null {
  const upper = (value ?? "").trim().toUpperCase();
  return isSupportedCurrency(upper) ? upper : null;
}

/**
 * Explicit symbols rather than `Intl` currency style. No locale renders SGD as
 * "S$" the way the approved design does, and `en-SG` renders it as a bare "$" —
 * unacceptable when the same screen can show USD. Every symbol here is distinct,
 * and the output no longer shifts between ICU versions.
 */
const SYMBOLS: Record<Currency, string> = {
  SGD: "S$",
  USD: "US$",
  EUR: "€",
  GBP: "£",
  AUD: "A$",
  MYR: "RM",
};

/**
 * Display formatting. Whole amounts drop the decimals to match the design
 * ("S$1,719"); fractional amounts keep both places rather than rounding a
 * figure the user is about to be charged.
 */
export function formatMoney(amountCents: number, currency: string): string {
  const code = normalizeCurrency(currency) ?? DEFAULT_CURRENCY;
  const whole = amountCents % 100 === 0;
  const digits = whole ? 0 : 2;
  const magnitude = new Intl.NumberFormat("en-SG", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(Math.abs(amountCents) / 100);
  // Refunds read as -S$100, never S$-100.
  return `${amountCents < 0 ? "-" : ""}${SYMBOLS[code]}${magnitude}`;
}

/**
 * Line total. Quantities come from user input, so this rejects anything that
 * could silently produce a wrong or negative charge.
 */
export function lineTotalCents(
  unitPriceCents: number,
  quantity: number,
): number {
  if (!Number.isInteger(unitPriceCents) || unitPriceCents < 0) {
    throw new Error(`unitPriceCents must be a non-negative integer`);
  }
  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new Error(`quantity must be a positive integer`);
  }
  return unitPriceCents * quantity;
}

/**
 * Percentage of a cent amount, rounded half-up to the nearest cent. Used for
 * tax; kept here so no caller is tempted to reach for floating-point maths.
 */
export function percentOfCents(amountCents: number, percent: number): number {
  if (!Number.isInteger(amountCents) || amountCents < 0) {
    throw new Error("amountCents must be a non-negative integer");
  }
  if (!Number.isFinite(percent) || percent < 0) {
    throw new Error("percent must be a non-negative number");
  }
  return Math.round((amountCents * percent) / 100);
}
