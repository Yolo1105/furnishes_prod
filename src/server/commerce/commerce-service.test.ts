/**
 * Cart → checkout → order integration. Owns its user and its catalog rows, per
 * the convention in docs/DATABASE.md, so it cannot collide with other files.
 */

import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/server/db";
import {
  createTestUser,
  deleteTestUsers,
} from "@/server/test-support/db-fixtures";
import {
  addToCart,
  clearCart,
  getCart,
  setCartLineQuantity,
} from "./cart-service";
import { listCatalog } from "./catalog-service";
import { placeOrder } from "./checkout-service";
import {
  cancelOrder,
  listOrders,
  markOrderFailedByPaymentRef,
  markOrderFulfilled,
  markOrderPaidByPaymentRef,
  markOrderRefundedByPaymentRef,
} from "./order-service";

const hasDb = Boolean(process.env.DATABASE_URL);

describe.runIf(hasDb)("commerce cart and checkout", () => {
  let userId = "";
  let user = { id: "", email: "", currency: "SGD" };
  let productId = "";
  let sofaVariantId = "";
  let lampVariantId = "";
  let usdOnlyVariantId = "";

  const address = {
    recipient: "Test Shopper",
    line1: "12 Holland Drive",
    line2: "#08-21",
    city: "Singapore",
    postalCode: "271012",
    country: "sg",
    phone: "+6591234567",
  };

  beforeAll(async () => {
    process.env.COMMERCE_ENABLED = "1";
    process.env.COMMERCE_PAYMENT_PROVIDER = "test";
    process.env.COMMERCE_TAX_PERCENT = "9";
    process.env.COMMERCE_TAX_LABEL = "GST";
    process.env.COMMERCE_SHIPPING_FLAT_CENTS = "2000";
    delete process.env.COMMERCE_FREE_SHIPPING_THRESHOLD_CENTS;

    const created = await createTestUser("commerce");
    userId = created.id;
    user = { id: created.id, email: created.email, currency: "SGD" };

    // Own catalog rows: asserting on prices requires nobody else repricing them.
    const slug = `test-product-${randomUUID()}`;
    const product = await prisma.product.create({
      data: {
        slug,
        name: "Test sofa",
        category: "seating",
        status: "active",
        variants: {
          create: [
            {
              sku: `TST-SOFA-${randomUUID()}`,
              name: "3-seat",
              sortOrder: 0,
              prices: {
                create: [
                  { currency: "SGD", amountCents: 129900 },
                  { currency: "USD", amountCents: 99900 },
                ],
              },
            },
            {
              sku: `TST-LAMP-${randomUUID()}`,
              name: "Floor lamp",
              sortOrder: 1,
              prices: { create: [{ currency: "SGD", amountCents: 32900 }] },
            },
            {
              sku: `TST-USD-${randomUUID()}`,
              name: "USD only",
              sortOrder: 2,
              prices: { create: [{ currency: "USD", amountCents: 5000 }] },
            },
          ],
        },
      },
      select: {
        id: true,
        variants: { orderBy: { sortOrder: "asc" }, select: { id: true } },
      },
    });
    productId = product.id;
    sofaVariantId = product.variants[0]!.id;
    lampVariantId = product.variants[1]!.id;
    usdOnlyVariantId = product.variants[2]!.id;
  });

  afterAll(async () => {
    // Orders reference variants with SetNull, carts with Restrict, so clear the
    // user (cascading carts and orders) before removing the catalog rows.
    await deleteTestUsers(userId);
    await prisma.product.deleteMany({ where: { id: productId } });
  });

  it("hides the catalog and refuses writes when the flag is off", async () => {
    process.env.COMMERCE_ENABLED = "0";
    expect(await listCatalog("SGD")).toMatchObject({
      ok: false,
      error: "commerce_disabled",
    });
    expect(await getCart(user)).toMatchObject({
      ok: false,
      error: "commerce_disabled",
    });
    expect(await addToCart(user, { variantId: sofaVariantId })).toMatchObject({
      ok: false,
      error: "commerce_disabled",
    });
    process.env.COMMERCE_ENABLED = "1";
  });

  it("only offers variants priced in the shopper's currency", async () => {
    const sgd = await listCatalog("SGD");
    expect(sgd.ok).toBe(true);
    if (!sgd.ok) return;
    const mine = sgd.value.products.find((p) => p.id === productId);
    expect(mine?.variants.map((v) => v.name)).toEqual(["3-seat", "Floor lamp"]);
    expect(mine?.variants[0]!.priceLabel).toBe("S$1,299");

    // The USD-only variant must not appear to an SGD shopper, and must not be
    // addable either — there is no runtime conversion to fall back on.
    expect(
      await addToCart(user, { variantId: usdOnlyVariantId }),
    ).toMatchObject({ ok: false, error: "not_found" });
  });

  it("captures the price at add time and merges repeat adds", async () => {
    const first = await addToCart(user, { variantId: sofaVariantId });
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.value.lines).toHaveLength(1);
    expect(first.value.lines[0]!.unitPriceCents).toBe(129900);

    const second = await addToCart(user, {
      variantId: sofaVariantId,
      quantity: 2,
    });
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.value.lines).toHaveLength(1);
    expect(second.value.lines[0]!.quantity).toBe(3);

    // Reprice the catalog: the live cart must keep the captured amount.
    await prisma.variantPrice.updateMany({
      where: { variantId: sofaVariantId, currency: "SGD" },
      data: { amountCents: 149900 },
    });
    const held = await getCart(user);
    expect(held.ok).toBe(true);
    if (!held.ok) return;
    expect(held.value.lines[0]!.unitPriceCents).toBe(129900);
    // The held price is unchanged and the mismatch surfaces the new figure.
    expect(held.value.lines[0]!.catalogPriceLabel).toBe("S$1,499");

    await prisma.variantPrice.updateMany({
      where: { variantId: sofaVariantId, currency: "SGD" },
      data: { amountCents: 129900 },
    });
    await clearCart(user);
  });

  it("rejects invalid quantities and removes a line at zero", async () => {
    const added = await addToCart(user, { variantId: lampVariantId });
    expect(added.ok).toBe(true);
    if (!added.ok) return;
    const lineId = added.value.lines[0]!.id;

    expect(
      await setCartLineQuantity(user, { lineId, quantity: -1 }),
    ).toMatchObject({ ok: false, error: "validation" });
    expect(
      await setCartLineQuantity(user, { lineId, quantity: 999 }),
    ).toMatchObject({ ok: false, error: "validation" });
    expect(
      await addToCart(user, { variantId: sofaVariantId, quantity: 0 }),
    ).toMatchObject({ ok: false, error: "validation" });

    const removed = await setCartLineQuantity(user, { lineId, quantity: 0 });
    expect(removed.ok).toBe(true);
    if (!removed.ok) return;
    expect(removed.value.lines).toHaveLength(0);
  });

  it("will not touch another shopper's cart line", async () => {
    const other = await createTestUser("commerce-stranger");
    try {
      const mine = await addToCart(user, { variantId: lampVariantId });
      expect(mine.ok).toBe(true);
      if (!mine.ok) return;
      const result = await setCartLineQuantity(
        { id: other.id, currency: "SGD" },
        { lineId: mine.value.lines[0]!.id, quantity: 5 },
      );
      expect(result).toMatchObject({ ok: false, error: "not_found" });
    } finally {
      await deleteTestUsers(other.id);
      await clearCart(user);
    }
  });

  it("prices a cart with shipping and tax", async () => {
    await addToCart(user, { variantId: lampVariantId, quantity: 2 });
    const cart = await getCart(user);
    expect(cart.ok).toBe(true);
    if (!cart.ok) return;
    expect(cart.value.totals).toMatchObject({
      subtotalCents: 65800,
      shippingCents: 2000,
      taxCents: 6102,
      totalCents: 73902,
    });
    expect(cart.value.totalLabel).toBe("S$739.02");
  });

  it("places an order, charges the shown total, and empties the cart", async () => {
    const key = randomUUID();
    const placed = await placeOrder(user, { address, idempotencyKey: key });
    expect(placed.ok).toBe(true);
    if (!placed.ok) return;

    // Settled by the test provider, so it arrives already paid.
    expect(placed.value.order.status).toBe("paid");
    expect(placed.value.order.totalCents).toBe(73902);
    expect(placed.value.order.totalLabel).toBe("S$739.02");
    expect(placed.value.order.itemCount).toBe(2);
    expect(placed.value.order.number).toMatch(/^FZ-\d+$/);
    expect(placed.value.order.shipping.recipient).toBe("Test Shopper");
    // Country is normalised to an uppercase ISO code.
    expect(placed.value.order.shipping.lines).toContain("SG");

    const after = await getCart(user);
    expect(after.ok && after.value.lines).toHaveLength(0);

    // A replayed key returns the same order rather than charging again.
    const replay = await placeOrder(user, { address, idempotencyKey: key });
    expect(replay.ok).toBe(true);
    if (!replay.ok) return;
    expect(replay.value.order.id).toBe(placed.value.order.id);
    expect(await prisma.order.count({ where: { userId } })).toBe(1);
  });

  it("refuses checkout with an empty cart or a bad address", async () => {
    expect(
      await placeOrder(user, { address, idempotencyKey: randomUUID() }),
    ).toMatchObject({ ok: false, error: "cart_empty" });

    await addToCart(user, { variantId: lampVariantId });
    const bad = await placeOrder(user, {
      address: {
        ...address,
        recipient: "",
        line1: "x",
        postalCode: "",
        country: "SGP",
      },
      idempotencyKey: randomUUID(),
    });
    expect(bad).toMatchObject({ ok: false, error: "validation" });
    if (bad.ok) return;
    expect(Object.keys(bad.fieldErrors ?? {}).sort()).toEqual([
      "country",
      "line1",
      "postalCode",
      "recipient",
    ]);

    expect(
      await placeOrder(user, { address, idempotencyKey: "short" }),
    ).toMatchObject({ ok: false, error: "validation" });
  });

  it("refuses checkout when no payment provider is configured", async () => {
    process.env.COMMERCE_PAYMENT_PROVIDER = "disabled";
    expect(
      await placeOrder(user, { address, idempotencyKey: randomUUID() }),
    ).toMatchObject({ ok: false, error: "provider_disabled" });
    process.env.COMMERCE_PAYMENT_PROVIDER = "test";
    await clearCart(user);
  });

  it("moves an order through the state machine only along legal edges", async () => {
    await addToCart(user, { variantId: lampVariantId });
    const placed = await placeOrder(user, {
      address,
      idempotencyKey: randomUUID(),
    });
    expect(placed.ok).toBe(true);
    if (!placed.ok) return;
    const orderId = placed.value.order.id;
    const paymentRef = (
      await prisma.order.findUniqueOrThrow({
        where: { id: orderId },
        select: { paymentRef: true },
      })
    ).paymentRef as string;

    // Already paid by the test provider, so a duplicate webhook is a no-op
    // rather than a second transition.
    expect(await markOrderPaidByPaymentRef(paymentRef)).toBe(false);

    const fulfilled = await markOrderFulfilled(orderId);
    expect(fulfilled).toMatchObject({ ok: true });
    // Fulfilling twice is refused: the guard is in the WHERE clause.
    expect(await markOrderFulfilled(orderId)).toMatchObject({
      ok: false,
      error: "invalid_status",
    });

    // A shopper cannot cancel a paid order.
    expect(await cancelOrder(userId, orderId)).toMatchObject({
      ok: false,
      error: "invalid_status",
    });

    expect(await markOrderRefundedByPaymentRef(paymentRef)).toBe(true);
    expect(await markOrderRefundedByPaymentRef(paymentRef)).toBe(false);
    // A refunded order cannot fail backwards into cancelled.
    expect(await markOrderFailedByPaymentRef(paymentRef, "x")).toBe(false);

    const listed = await listOrders(userId);
    expect(listed.ok).toBe(true);
    if (!listed.ok) return;
    expect(listed.value.orders[0]!.status).toBe("refunded");
    expect(listed.value.orders[0]!.refundedAt).not.toBeNull();
  });

  it("lets a shopper cancel only while payment is outstanding", async () => {
    await addToCart(user, { variantId: lampVariantId });
    const placed = await placeOrder(user, {
      address,
      idempotencyKey: randomUUID(),
    });
    expect(placed.ok).toBe(true);
    if (!placed.ok) return;

    // Force the pending state the Stripe provider would produce.
    await prisma.order.update({
      where: { id: placed.value.order.id },
      data: { status: "pending_payment", paidAt: null },
    });

    const stranger = await createTestUser("commerce-cancel-stranger");
    try {
      expect(
        await cancelOrder(stranger.id, placed.value.order.id),
      ).toMatchObject({ ok: false, error: "not_found" });
    } finally {
      await deleteTestUsers(stranger.id);
    }

    const cancelled = await cancelOrder(userId, placed.value.order.id);
    expect(cancelled).toMatchObject({ ok: true });
    if (!cancelled.ok) return;
    expect(cancelled.value.status).toBe("cancelled");
    expect(cancelled.value.cancelledAt).not.toBeNull();

    // Cancelling an unpaid order hands the basket back, so a shopper who backs
    // out of the hosted payment page is not left with nothing.
    const restored = await getCart(user);
    expect(restored.ok).toBe(true);
    if (!restored.ok) return;
    expect(restored.value.lines).toHaveLength(1);
    expect(restored.value.lines[0]!.variantId).toBe(lampVariantId);
    await clearCart(user);
  });

  it("returns the basket when a hosted payment session expires", async () => {
    await addToCart(user, { variantId: lampVariantId, quantity: 2 });
    const placed = await placeOrder(user, {
      address,
      idempotencyKey: randomUUID(),
    });
    expect(placed.ok).toBe(true);
    if (!placed.ok) return;

    // Stand in for a hosted checkout: pending, keyed by a session id.
    const sessionRef = `cs_test_${randomUUID()}`;
    await prisma.order.update({
      where: { id: placed.value.order.id },
      data: {
        status: "pending_payment",
        paidAt: null,
        paymentRef: sessionRef,
      },
    });
    expect((await getCart(user)).ok).toBe(true);

    expect(
      await markOrderFailedByPaymentRef(sessionRef, "session_expired"),
    ).toBe(true);
    // A redelivered expiry does nothing, so the cart cannot be doubled.
    expect(
      await markOrderFailedByPaymentRef(sessionRef, "session_expired"),
    ).toBe(false);

    const cart = await getCart(user);
    expect(cart.ok).toBe(true);
    if (!cart.ok) return;
    expect(cart.value.lines).toHaveLength(1);
    expect(cart.value.lines[0]!.quantity).toBe(2);
    await clearCart(user);
  });

  it("matches a refund against the intent learned when the session completed", async () => {
    await addToCart(user, { variantId: lampVariantId });
    const placed = await placeOrder(user, {
      address,
      idempotencyKey: randomUUID(),
    });
    expect(placed.ok).toBe(true);
    if (!placed.ok) return;

    const sessionRef = `cs_test_${randomUUID()}`;
    const intentRef = `pi_test_${randomUUID()}`;
    await prisma.order.update({
      where: { id: placed.value.order.id },
      data: {
        status: "pending_payment",
        paidAt: null,
        paymentRef: sessionRef,
      },
    });

    // checkout.session.completed arrives keyed by session and teaches the order
    // its intent.
    expect(await markOrderPaidByPaymentRef(sessionRef, intentRef)).toBe(true);
    expect(
      await prisma.order.findUniqueOrThrow({
        where: { id: placed.value.order.id },
        select: { paymentIntentRef: true },
      }),
    ).toMatchObject({ paymentIntentRef: intentRef });

    // charge.refunded arrives keyed by intent only. Without the recorded intent
    // this would match no order and the refund would never be reflected.
    expect(await markOrderRefundedByPaymentRef(intentRef)).toBe(true);
    const listed = await listOrders(userId);
    expect(listed.ok).toBe(true);
    if (!listed.ok) return;
    expect(listed.value.orders[0]!.status).toBe("refunded");
    await clearCart(user);
  });
});
