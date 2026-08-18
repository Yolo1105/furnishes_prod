/**
 * Checkout: turn a cart into an order. Flag COMMERCE_ENABLED.
 *
 * Ordering of side effects is deliberate:
 *
 *   1. resolve the cart and compute totals server-side
 *   2. open the payment session (no money moves yet — the shopper has not
 *      reached the provider's page, and the test provider is local)
 *   3. write the order, its items, and empty the cart in one transaction
 *
 * A provider failure therefore leaves the cart untouched and nothing charged.
 * The reverse order would risk an order with no payment, or a cleared cart the
 * shopper cannot recover. If the shopper never pays, the order is released and
 * `restoreCartFromOrder` hands the basket back.
 *
 * Replays are handled by `idempotencyKey`: the same key returns the original
 * order instead of charging again, mirroring `Message.clientMessageId`.
 */

import { randomInt } from "node:crypto";
import { prisma } from "@/server/db";
import { err, ok, type ServiceResult } from "@/server/result";
import { logOps } from "@/server/ops/log";
import {
  isCommerceEnabled,
  settlementCurrency,
  taxLabel,
} from "./commerce-config";
import {
  createPaymentIntent,
  hostedCheckoutUrl,
  paymentProviderName,
  type PaymentLine,
} from "./payment-provider";
import { mapOrder, ORDER_SELECT, type OrderDto } from "./order-service";
import { computeTotals } from "./totals";

export type AddressInput = {
  recipient: string;
  line1: string;
  line2?: string;
  city?: string;
  postalCode: string;
  country: string;
  phone?: string;
};

type PlaceOrderResult = {
  order: OrderDto;
  /**
   * Where to send the shopper to pay. Null when the provider settled without a
   * hosted page, which is only ever the test provider.
   */
  redirectUrl: string | null;
};

type CheckoutError =
  | "commerce_disabled"
  | "validation"
  | "cart_empty"
  | "provider_disabled"
  | "provider_unavailable";

function trimmed(value: string | undefined): string {
  return (value ?? "").trim();
}

/** Nulls rather than optionals, so it maps straight onto the order columns. */
type ValidatedAddress = {
  recipient: string;
  line1: string;
  line2: string | null;
  city: string | null;
  postalCode: string;
  country: string;
  phone: string | null;
};

function validateAddress(
  input: AddressInput,
): ServiceResult<ValidatedAddress, "validation"> {
  const fieldErrors: Record<string, string> = {};
  const recipient = trimmed(input.recipient);
  const line1 = trimmed(input.line1);
  const postalCode = trimmed(input.postalCode);
  const country = trimmed(input.country).toUpperCase();

  if (recipient.length < 2) fieldErrors.recipient = "Enter a recipient name.";
  if (line1.length < 4) fieldErrors.line1 = "Enter a street address.";
  if (postalCode.length < 3) fieldErrors.postalCode = "Enter a postal code.";
  if (country.length !== 2) {
    fieldErrors.country = "Use a two-letter country code.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return err("validation", "Check the delivery details.", fieldErrors);
  }
  return ok({
    recipient,
    line1,
    line2: trimmed(input.line2) || null,
    city: trimmed(input.city) || null,
    postalCode,
    country,
    phone: trimmed(input.phone) || null,
  });
}

/**
 * Human-facing reference. Randomised rather than sequential so order volume is
 * not public, with the unique constraint as the real guarantee.
 */
function generateOrderNumber(): string {
  return `FZ-${randomInt(10_000, 100_000)}${randomInt(10, 100)}`;
}

export async function placeOrder(
  user: { id: string; email: string; currency: string },
  input: { address: AddressInput; idempotencyKey: string },
): Promise<ServiceResult<PlaceOrderResult, CheckoutError>> {
  if (!isCommerceEnabled()) {
    return err("commerce_disabled", "The store is not available yet.");
  }

  const idempotencyKey = trimmed(input.idempotencyKey);
  if (idempotencyKey.length < 8 || idempotencyKey.length > 128) {
    return err("validation", "A checkout key is required.");
  }

  // A retry — the network dropped, or the shopper double-clicked — must return
  // the original order rather than charge a second time.
  const existing = await prisma.order.findUnique({
    where: { idempotencyKey },
    select: { ...ORDER_SELECT, paymentRef: true },
  });
  if (existing) {
    // A retried place-order after the session was created but before the
    // browser left must still send the shopper to pay. Dropping the URL here
    // would strand a pending Stripe order with no way back to the hosted page.
    const redirectUrl =
      existing.status === "pending_payment"
        ? await hostedCheckoutUrl(existing.paymentRef)
        : null;
    return ok({ order: mapOrder(existing), redirectUrl });
  }

  const address = validateAddress(input.address);
  if (!address.ok) return address;

  if (paymentProviderName() === "disabled") {
    return err("provider_disabled", "Checkout is not available yet.");
  }

  const currency = settlementCurrency(user);
  const cart = await prisma.cart.findUnique({
    where: { userId: user.id },
    select: {
      id: true,
      currency: true,
      items: {
        orderBy: { createdAt: "asc" },
        select: {
          variantId: true,
          quantity: true,
          unitPriceCents: true,
          variant: {
            select: {
              sku: true,
              name: true,
              product: { select: { name: true } },
            },
          },
        },
      },
    },
  });

  if (!cart || cart.items.length === 0) {
    return err("cart_empty", "Your cart is empty.");
  }
  if (cart.currency !== currency) {
    return err(
      "validation",
      "Your cart currency no longer matches your account. Clear the cart to continue.",
    );
  }

  const totals = computeTotals(cart.items);
  const number = generateOrderNumber();

  // Shipping and tax are sent as their own lines so the provider's page shows
  // the same breakdown as our summary and charges the same total.
  const lines: PaymentLine[] = cart.items.map((item) => ({
    name: `${item.variant.product.name} — ${item.variant.name}`,
    unitPriceCents: item.unitPriceCents,
    quantity: item.quantity,
  }));
  if (totals.shippingCents > 0) {
    lines.push({
      name: "Delivery",
      unitPriceCents: totals.shippingCents,
      quantity: 1,
    });
  }
  if (totals.taxCents > 0) {
    lines.push({
      name: taxLabel(),
      unitPriceCents: totals.taxCents,
      quantity: 1,
    });
  }

  const intent = await createPaymentIntent({
    orderNumber: number,
    amountCents: totals.totalCents,
    currency,
    idempotencyKey,
    userEmail: user.email,
    lines,
  });
  if (!intent.ok) {
    return err(intent.error, intent.message);
  }

  const paid = intent.value.status === "succeeded";
  const now = new Date();

  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        userId: user.id,
        number,
        status: paid ? "paid" : "pending_payment",
        currency,
        subtotalCents: totals.subtotalCents,
        shippingCents: totals.shippingCents,
        taxCents: totals.taxCents,
        totalCents: totals.totalCents,
        shipRecipient: address.value.recipient,
        shipLine1: address.value.line1,
        shipLine2: address.value.line2,
        shipCity: address.value.city,
        shipPostalCode: address.value.postalCode,
        shipCountry: address.value.country,
        shipPhone: address.value.phone,
        paymentProvider: paymentProviderName(),
        paymentRef: intent.value.ref,
        idempotencyKey,
        ...(paid ? { paidAt: now } : {}),
        items: {
          create: cart.items.map((item) => ({
            variantId: item.variantId,
            sku: item.variant.sku,
            name: `${item.variant.product.name} — ${item.variant.name}`,
            quantity: item.quantity,
            unitPriceCents: item.unitPriceCents,
            totalCents: item.unitPriceCents * item.quantity,
          })),
        },
      },
      select: ORDER_SELECT,
    });

    await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
    return created;
  });

  logOps("info", "commerce_order_placed", {
    orderNumber: number,
    status: order.status,
    totalCents: totals.totalCents,
    currency,
    provider: paymentProviderName(),
  });

  return ok({
    order: mapOrder(order),
    redirectUrl: intent.value.redirectUrl,
  });
}
