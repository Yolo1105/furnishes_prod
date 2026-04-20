import type { DeliveryOption } from "@/lib/site/commerce/types";

/**
 * Browser session keys for the checkout wizard. Values are read on the
 * review step and sent to `POST /api/orders`.
 */
export const CHECKOUT_SESSION_KEYS = {
  shippingAddressId: "furnishes.checkout.shippingAddressId",
  /** JSON: `{ deliveryMethod, deliveryCents }` — Prisma `DeliveryMethod` + cents */
  delivery: "furnishes.checkout.delivery",
} as const;

export type CheckoutDeliveryPayload = {
  deliveryMethod: "standard" | "scheduled" | "white_glove";
  deliveryCents: number;
};

/** Map marketing checkout UI option → `POST /api/orders` body fields. */
export function deliveryOptionToPayload(
  option: DeliveryOption,
): CheckoutDeliveryPayload {
  const kindMap = {
    standard: "standard",
    scheduled: "scheduled",
    "white-glove": "white_glove",
  } as const;
  return {
    deliveryMethod: kindMap[option.kind],
    deliveryCents: option.priceCents,
  };
}

export function readCheckoutDelivery(): CheckoutDeliveryPayload | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(CHECKOUT_SESSION_KEYS.delivery);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as CheckoutDeliveryPayload;
  } catch {
    return null;
  }
}
