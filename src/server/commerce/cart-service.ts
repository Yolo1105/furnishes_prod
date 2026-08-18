/**
 * Server-persisted cart. Flag COMMERCE_ENABLED.
 *
 * One open cart per user, holding a single currency: an order settles in one
 * currency, so mixing markets in a basket is refused rather than silently
 * converted. Unit prices are captured on add, so a catalog reprice never
 * changes a basket under the shopper.
 */

import { prisma } from "@/server/db";
import { err, ok, type ServiceResult } from "@/server/result";
import { formatMoney, type Currency } from "@/lib/commerce/money";
import { logOps } from "@/server/ops/log";
import { findPurchasableVariant } from "./catalog-service";
import { isCommerceEnabled, settlementCurrency } from "./commerce-config";
import { computeTotals, type Totals } from "./totals";

const MAX_QUANTITY_PER_LINE = 20;

type CartLineDto = {
  id: string;
  variantId: string;
  sku: string;
  productName: string;
  variantName: string;
  quantity: number;
  unitPriceCents: number;
  unitPriceLabel: string;
  lineTotalCents: number;
  lineTotalLabel: string;
  /**
   * The catalog's current price, set only when it no longer matches the amount
   * captured on add. Holds the *new* figure, since `unitPriceCents` is already
   * the one being charged.
   */
  catalogPriceLabel: string | null;
};

export type CartDto = {
  id: string | null;
  currency: Currency;
  lines: CartLineDto[];
  totals: Totals;
  subtotalLabel: string;
  shippingLabel: string;
  taxAmountLabel: string;
  totalLabel: string;
};

type CartError =
  "commerce_disabled" | "validation" | "not_found" | "currency_mismatch";

type CartUser = { id: string; currency: string };

function emptyCart(currency: Currency): CartDto {
  return decorate({ id: null, currency, lines: [] });
}

function decorate(base: {
  id: string | null;
  currency: Currency;
  lines: CartLineDto[];
}): CartDto {
  const totals = computeTotals(base.lines);
  return {
    ...base,
    totals,
    subtotalLabel: formatMoney(totals.subtotalCents, base.currency),
    shippingLabel:
      totals.shippingCents === 0
        ? "Free"
        : formatMoney(totals.shippingCents, base.currency),
    taxAmountLabel: formatMoney(totals.taxCents, base.currency),
    totalLabel: formatMoney(totals.totalCents, base.currency),
  };
}

async function loadCart(userId: string, currency: Currency): Promise<CartDto> {
  const cart = await prisma.cart.findUnique({
    where: { userId },
    select: {
      id: true,
      currency: true,
      items: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          variantId: true,
          quantity: true,
          unitPriceCents: true,
          variant: {
            select: {
              sku: true,
              name: true,
              product: { select: { name: true } },
              prices: { select: { currency: true, amountCents: true } },
            },
          },
        },
      },
    },
  });

  if (!cart) return emptyCart(currency);

  const cartCurrency = (cart.currency as Currency) ?? currency;
  const lines: CartLineDto[] = cart.items.map((item) => {
    const current =
      item.variant.prices.find((price) => price.currency === cartCurrency)
        ?.amountCents ?? null;
    return {
      id: item.id,
      variantId: item.variantId,
      sku: item.variant.sku,
      productName: item.variant.product.name,
      variantName: item.variant.name,
      quantity: item.quantity,
      unitPriceCents: item.unitPriceCents,
      unitPriceLabel: formatMoney(item.unitPriceCents, cartCurrency),
      lineTotalCents: item.unitPriceCents * item.quantity,
      lineTotalLabel: formatMoney(
        item.unitPriceCents * item.quantity,
        cartCurrency,
      ),
      catalogPriceLabel:
        current !== null && current !== item.unitPriceCents
          ? formatMoney(current, cartCurrency)
          : null,
    };
  });

  return decorate({ id: cart.id, currency: cartCurrency, lines });
}

export async function getCart(
  user: CartUser,
): Promise<ServiceResult<CartDto, CartError>> {
  if (!isCommerceEnabled()) {
    return err("commerce_disabled", "The store is not available yet.");
  }
  return ok(await loadCart(user.id, settlementCurrency(user)));
}

export async function addToCart(
  user: CartUser,
  input: { variantId: string; quantity?: number },
): Promise<ServiceResult<CartDto, CartError>> {
  if (!isCommerceEnabled()) {
    return err("commerce_disabled", "The store is not available yet.");
  }

  const variantId = input.variantId?.trim();
  if (!variantId) {
    return err("validation", "Choose an item to add.");
  }
  const quantity = input.quantity ?? 1;
  if (!Number.isInteger(quantity) || quantity < 1) {
    return err("validation", "Quantity must be a whole number of at least 1.");
  }

  const currency = settlementCurrency(user);
  const variant = await findPurchasableVariant(variantId, currency);
  if (!variant) {
    return err("not_found", "That item is not available in your currency.");
  }

  const existing = await prisma.cart.findUnique({
    where: { userId: user.id },
    select: { id: true, currency: true, _count: { select: { items: true } } },
  });

  // An empty cart adopts the shopper's current currency; a cart with lines in
  // another currency must be cleared first rather than mixing markets.
  if (existing && existing.currency !== currency) {
    if (existing._count.items > 0) {
      return err(
        "currency_mismatch",
        "Your cart holds items in a different currency. Clear it to switch.",
      );
    }
    await prisma.cart.update({
      where: { id: existing.id },
      data: { currency },
    });
  }

  const cart =
    existing ??
    (await prisma.cart.create({
      data: { userId: user.id, currency },
      select: { id: true },
    }));

  const line = await prisma.cartItem.findUnique({
    where: { cartId_variantId: { cartId: cart.id, variantId: variant.id } },
    select: { id: true, quantity: true },
  });

  const nextQuantity = Math.min(
    (line?.quantity ?? 0) + quantity,
    MAX_QUANTITY_PER_LINE,
  );

  if (line) {
    await prisma.cartItem.update({
      where: { id: line.id },
      data: { quantity: nextQuantity },
    });
  } else {
    await prisma.cartItem.create({
      data: {
        cartId: cart.id,
        variantId: variant.id,
        quantity: nextQuantity,
        unitPriceCents: variant.amountCents,
      },
    });
  }

  // Touch the cart so `updatedAt` reflects shopper activity, not just writes to
  // the cart row itself.
  await prisma.cart.update({
    where: { id: cart.id },
    data: { updatedAt: new Date() },
  });

  return ok(await loadCart(user.id, currency));
}

export async function setCartLineQuantity(
  user: CartUser,
  input: { lineId: string; quantity: number },
): Promise<ServiceResult<CartDto, CartError>> {
  if (!isCommerceEnabled()) {
    return err("commerce_disabled", "The store is not available yet.");
  }
  if (
    !Number.isInteger(input.quantity) ||
    input.quantity < 0 ||
    input.quantity > MAX_QUANTITY_PER_LINE
  ) {
    return err(
      "validation",
      `Quantity must be between 0 and ${MAX_QUANTITY_PER_LINE}.`,
    );
  }

  const line = await prisma.cartItem.findFirst({
    where: { id: input.lineId, cart: { userId: user.id } },
    select: { id: true },
  });
  if (!line) return err("not_found", "That cart item no longer exists.");

  if (input.quantity === 0) {
    await prisma.cartItem.delete({ where: { id: line.id } });
  } else {
    await prisma.cartItem.update({
      where: { id: line.id },
      data: { quantity: input.quantity },
    });
  }

  return ok(await loadCart(user.id, settlementCurrency(user)));
}

/**
 * Puts an abandoned order's items back in the cart.
 *
 * Checkout empties the cart when the order is created, because from that point
 * the order is the record of what was bought. If payment never completes, that
 * would leave the shopper with neither an order nor a basket, so a released
 * order hands its lines back.
 *
 * Prices come from the order, not today's catalog: the shopper saw those
 * figures, and a reprice mid-abandonment should not raise what they owe.
 */
export async function restoreCartFromOrder(orderId: string): Promise<boolean> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      userId: true,
      currency: true,
      items: {
        select: { variantId: true, quantity: true, unitPriceCents: true },
      },
    },
  });
  if (!order) return false;

  // Lines whose variant has since been deleted cannot go back; the order keeps
  // its snapshot of them either way.
  const restorable = order.items.filter(
    (item): item is typeof item & { variantId: string } =>
      item.variantId !== null,
  );
  if (restorable.length === 0) return false;

  const cart = await prisma.cart.findUnique({
    where: { userId: order.userId },
    select: { id: true, currency: true, _count: { select: { items: true } } },
  });

  // A cart already holding another market's items must not be mixed. The order
  // still exists with its history, so nothing is lost by declining.
  if (cart && cart.currency !== order.currency && cart._count.items > 0) {
    logOps("warn", "commerce_cart_restore_skipped", {
      orderId,
      reason: "currency_conflict",
    });
    return false;
  }

  const cartId = cart
    ? cart.id
    : (
        await prisma.cart.create({
          data: { userId: order.userId, currency: order.currency },
          select: { id: true },
        })
      ).id;

  if (cart && cart.currency !== order.currency) {
    await prisma.cart.update({
      where: { id: cartId },
      data: { currency: order.currency },
    });
  }

  const variantIds = restorable.map((item) => item.variantId);
  const existingLines = await prisma.cartItem.findMany({
    where: { cartId, variantId: { in: variantIds } },
    select: { id: true, variantId: true, quantity: true },
  });
  const existingByVariant = new Map(
    existingLines.map((line) => [line.variantId, line]),
  );

  await prisma.$transaction(
    restorable.map((item) => {
      const existing = existingByVariant.get(item.variantId);
      const quantity = Math.min(
        (existing?.quantity ?? 0) + item.quantity,
        MAX_QUANTITY_PER_LINE,
      );
      if (existing) {
        return prisma.cartItem.update({
          where: { id: existing.id },
          data: { quantity },
        });
      }
      return prisma.cartItem.create({
        data: {
          cartId,
          variantId: item.variantId,
          quantity,
          unitPriceCents: item.unitPriceCents,
        },
      });
    }),
  );

  logOps("info", "commerce_cart_restored", {
    orderId,
    lines: restorable.length,
  });
  return true;
}

export async function clearCart(
  user: CartUser,
): Promise<ServiceResult<CartDto, CartError>> {
  if (!isCommerceEnabled()) {
    return err("commerce_disabled", "The store is not available yet.");
  }
  const cart = await prisma.cart.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });
  if (cart) {
    await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    await prisma.cart.update({
      where: { id: cart.id },
      data: { currency: settlementCurrency(user) },
    });
  }
  return ok(await loadCart(user.id, settlementCurrency(user)));
}
