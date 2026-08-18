/**
 * Commerce flag plus the shipping and tax configuration.
 *
 * Shipping and tax are deliberately crude — a flat fee and a single percentage —
 * because the catalog is placeholder data. Real rates depend on destination and
 * on GST registration, so these are inputs to replace, not a tax engine.
 */

import { envBool, envInt } from "@/server/env";
import {
  DEFAULT_CURRENCY,
  normalizeCurrency,
  type Currency,
} from "@/lib/commerce/money";

/** Off by default: the storefront stays hidden until a real catalog exists. */
export function isCommerceEnabled(): boolean {
  return envBool("COMMERCE_ENABLED", false);
}

/** Flat shipping per order, charged in the order's own currency. */
export function shippingFlatCents(): number {
  return envInt("COMMERCE_SHIPPING_FLAT_CENTS", 0);
}

/** Orders at or above this subtotal ship free. 0 disables the threshold. */
export function freeShippingThresholdCents(): number {
  return envInt("COMMERCE_FREE_SHIPPING_THRESHOLD_CENTS", 0);
}

/** Tax percentage applied to the subtotal. 0 means no tax line at all. */
export function taxPercent(): number {
  const raw = Number(process.env.COMMERCE_TAX_PERCENT ?? "0");
  return Number.isFinite(raw) && raw >= 0 && raw <= 100 ? raw : 0;
}

/** Label for the tax line, e.g. GST in Singapore or VAT in the EU. */
export function taxLabel(): string {
  return process.env.COMMERCE_TAX_LABEL?.trim() || "Tax";
}

/**
 * Currency the account transacts in. Falls back to the default rather than
 * failing, so an unrecognised stored value cannot lock a user out of the cart.
 */
export function settlementCurrency(user: { currency: string }): Currency {
  return normalizeCurrency(user.currency) ?? DEFAULT_CURRENCY;
}
