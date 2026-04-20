/**
 * Money formatting helpers. All internal money lives in cents as Int
 * (protects against float precision). Display conversions happen here.
 */

export type Currency = "SGD" | "MYR" | "USD";

const DISPLAY_CURRENCIES = new Set<Currency>(["SGD", "MYR", "USD"]);

/** Map loose DB/UI codes to a supported display currency (defaults to SGD). */
export function currencyFromCode(code: string | null | undefined): Currency {
  const u = (code ?? "SGD").toUpperCase();
  return DISPLAY_CURRENCIES.has(u as Currency) ? (u as Currency) : "SGD";
}

/** Format cents using a loose currency code (same rules as {@link currencyFromCode}). */
export function formatMoneyCentsLoose(
  cents: number,
  currencyCode: string | null | undefined,
  withDecimals = false,
): string {
  return formatMoney(cents, currencyFromCode(currencyCode), withDecimals);
}

/**
 * Format cents as SGD via Intl (e.g. "$2,980" for en-SG).
 * Pass `withDecimals` for invoices / detailed breakdowns.
 */
export function formatSGD(cents: number, withDecimals = false): string {
  return new Intl.NumberFormat("en-SG", {
    style: "currency",
    currency: "SGD",
    minimumFractionDigits: withDecimals ? 2 : 0,
    maximumFractionDigits: withDecimals ? 2 : 0,
  }).format(cents / 100);
}

/**
 * Generic currency formatter (for multi-currency support later).
 */
export function formatMoney(
  cents: number,
  currency: Currency = "SGD",
  withDecimals = false,
): string {
  const locale =
    currency === "SGD" ? "en-SG" : currency === "MYR" ? "en-MY" : "en-US";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: withDecimals ? 2 : 0,
    maximumFractionDigits: withDecimals ? 2 : 0,
  }).format(cents / 100);
}
