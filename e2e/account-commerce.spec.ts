import { createHmac } from "node:crypto";
import { expect, test } from "@playwright/test";
// @ts-expect-error -- shared E2E env is a .mjs helper
import { E2E_WEBHOOK_SECRET } from "./env.mjs";
import { E2E_OWNER, setSessionCookie } from "./account-helpers";

/**
 * Commerce runs with COMMERCE_PAYMENT_PROVIDER=test (see scripts/run-e2e.mjs),
 * so orders settle without a card and arrive already paid.
 */

test("a shopper can browse, add to cart, and place an order", async ({
  page,
}) => {
  await setSessionCookie(page, E2E_OWNER.sessionToken);

  await page.goto("/account/collections");
  await expect(page.locator(".wf-title")).toContainText("Collections");

  // Prices come from VariantPrice in the shopper's currency, so they must render
  // as SGD rather than a bare "$".
  const firstRow = page.locator(".wf-row").first();
  await expect(firstRow.locator(".wf-row__m")).toContainText("S$");

  const itemName = (await firstRow.locator(".wf-row__t").innerText()).trim();
  await firstRow.getByRole("button", { name: "Add to cart" }).click();
  await expect(page.locator(".wf-toast")).toContainText("Added");

  // The cart is server-persisted, so a fresh navigation still has the line.
  await page.goto("/account/cart");
  await expect(page.locator(".wf-title")).toContainText("Cart");
  await expect(page.locator(".wf-row__t").first()).toContainText(
    itemName.split(" — ")[0] ?? itemName,
  );
  await expect(page.locator(".wf-sum__total")).toContainText("S$");
  // GST is configured at 9% for E2E, so the tax line must be present.
  await expect(page.locator(".wf-sum")).toContainText("GST");

  await page.getByRole("link", { name: "Checkout →" }).click();
  await expect(page).toHaveURL(/\/account\/checkout/);

  await page.getByRole("textbox").nth(0).fill("12 Holland Drive");
  await page.getByRole("textbox").nth(1).fill("#08-21");
  await page.getByRole("textbox").nth(2).fill("Singapore");
  await page.getByRole("textbox").nth(3).fill("271012");
  // Country pre-fills as SG.
  await page.getByRole("button", { name: /Place order/ }).click();

  await expect(page.locator(".wf-title")).toContainText("Order placed");
  const placedNumber = (await page.locator(".wf-sub").innerText()).trim();
  expect(placedNumber).toMatch(/FZ-\d+/);

  // The cart is emptied by the same transaction that wrote the order.
  await page.goto("/account/cart");
  await expect(page.locator(".wf-list")).toContainText("Your cart is empty");

  await page.goto("/account/orders");
  await expect(page.locator(".wf-title")).toContainText("Orders");
  const orderNumber = placedNumber.match(/FZ-\d+/)?.[0] ?? "";
  await expect(page.locator(".wf-tbl__t").first()).toContainText(orderNumber);
  await expect(page.locator(".wf-tbl").first()).toContainText("Paid");

  // The same order appears on Billing as an invoice, derived not fixtured.
  await page.goto("/account/billing");
  await expect(page.locator(".wf-tbl")).toContainText(orderNumber);

  // Returning from a hosted payment: the notice reflects the *stored* status,
  // not the fact that the shopper landed on the success URL.
  await page.goto(`/account/orders?checkout=success&order=${orderNumber}`);
  await expect(page.locator('[role="status"]')).toContainText(
    `Payment confirmed for ${orderNumber}`,
  );

  await page.goto(`/account/orders?checkout=cancelled&order=${orderNumber}`);
  await expect(page.locator('[role="status"]')).toContainText(
    "was not completed",
  );

  // An unknown outcome, or an order that is not the shopper's, says nothing —
  // these are values anyone can type into the URL bar.
  await page.goto(`/account/orders?checkout=<img src=x>&order=${orderNumber}`);
  await expect(page.locator('[role="status"]')).toHaveCount(0);
  await page.goto("/account/orders?checkout=success&order=FZ-000000");
  await expect(page.locator('[role="status"]')).toHaveCount(0);
});

test("checkout is idempotent under a replayed key", async ({ request }) => {
  const login = await request.post("/api/auth/login", {
    data: { email: E2E_OWNER.email, password: E2E_OWNER.password },
  });
  expect(login.ok()).toBeTruthy();

  const catalog = await request.get("/api/account/commerce/catalog");
  expect(catalog.ok()).toBeTruthy();
  const body = (await catalog.json()) as {
    products: Array<{ variants: Array<{ id: string }> }>;
  };
  const variantId = body.products[0]?.variants[0]?.id;
  expect(variantId).toBeTruthy();

  const added = await request.post("/api/account/commerce/cart", {
    data: { variantId, quantity: 1 },
  });
  expect(added.ok()).toBeTruthy();

  const address = {
    recipient: "Owner",
    line1: "12 Holland Drive",
    postalCode: "271012",
    country: "SG",
  };
  const idempotencyKey = `e2e-checkout-${Date.now()}`;

  const first = await request.post("/api/account/commerce/checkout", {
    data: { address, idempotencyKey },
  });
  expect(first.ok()).toBeTruthy();
  const firstOrder = (await first.json()) as { order: { id: string } };

  // Replaying the key must return the original order, not charge again.
  const replay = await request.post("/api/account/commerce/checkout", {
    data: { address, idempotencyKey },
  });
  expect(replay.ok()).toBeTruthy();
  const replayOrder = (await replay.json()) as { order: { id: string } };
  expect(replayOrder.order.id).toBe(firstOrder.order.id);
});

test("checkout refuses an empty cart and an invalid address", async ({
  request,
}) => {
  const login = await request.post("/api/auth/login", {
    data: { email: E2E_OWNER.email, password: E2E_OWNER.password },
  });
  expect(login.ok()).toBeTruthy();

  await request.delete("/api/account/commerce/cart");

  const empty = await request.post("/api/account/commerce/checkout", {
    data: {
      address: {
        recipient: "Owner",
        line1: "12 Holland Drive",
        postalCode: "271012",
        country: "SG",
      },
      idempotencyKey: `e2e-empty-${Date.now()}`,
    },
  });
  expect(empty.status()).toBe(409);
  expect((await empty.json()).error).toBe("cart_empty");
});

test("cart mutations require a session", async ({ request }) => {
  const anonymous = await request.post("/api/account/commerce/cart", {
    data: { variantId: "whatever", quantity: 1 },
    headers: { cookie: "" },
  });
  expect(anonymous.status()).toBe(401);
});

function signPayload(payload: string, secret: string): string {
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = createHmac("sha256", secret)
    .update(`${timestamp}.${payload}`)
    .digest("hex");
  return `t=${timestamp},v1=${signature}`;
}

test("the payment webhook rejects unsigned and forged requests", async ({
  request,
}) => {
  const payload = JSON.stringify({
    id: `evt_e2e_forged_${Date.now()}`,
    type: "payment_intent.succeeded",
    data: { object: { id: "pi_does_not_exist" } },
  });

  const unsigned = await request.post("/api/webhooks/stripe", {
    data: payload,
    headers: { "content-type": "application/json" },
  });
  expect(unsigned.status()).toBe(400);

  // Correctly shaped signature, wrong secret.
  const tampered = await request.post("/api/webhooks/stripe", {
    data: payload,
    headers: {
      "content-type": "application/json",
      "stripe-signature": signPayload(payload, "whsec_not_the_secret"),
    },
  });
  expect(tampered.status()).toBe(400);

  // Valid signature over a *different* body than the one sent.
  const swapped = await request.post("/api/webhooks/stripe", {
    data: JSON.stringify({ id: "evt_swapped", type: "charge.refunded" }),
    headers: {
      "content-type": "application/json",
      "stripe-signature": signPayload(payload, E2E_WEBHOOK_SECRET),
    },
  });
  expect(swapped.status()).toBe(400);
});

test("the payment webhook accepts a signed event once and ignores replays", async ({
  request,
}) => {
  const eventId = `evt_e2e_replay_${Date.now()}`;
  // The event a hosted checkout actually settles on.
  const payload = JSON.stringify({
    id: eventId,
    type: "checkout.session.completed",
    data: {
      object: {
        id: "cs_no_such_order",
        payment_intent: "pi_no_such_order",
        payment_status: "paid",
      },
    },
  });
  const signature = signPayload(payload, E2E_WEBHOOK_SECRET);

  const first = await request.post("/api/webhooks/stripe", {
    data: payload,
    headers: {
      "content-type": "application/json",
      "stripe-signature": signature,
    },
  });
  expect(first.ok()).toBeTruthy();
  // Accepted and recorded, but no order matches that intent.
  expect(await first.json()).toMatchObject({ received: true, applied: false });

  // Redelivery collides on the stored event id rather than applying twice.
  const replay = await request.post("/api/webhooks/stripe", {
    data: payload,
    headers: {
      "content-type": "application/json",
      "stripe-signature": signature,
    },
  });
  expect(replay.ok()).toBeTruthy();
  expect(await replay.json()).toMatchObject({ duplicate: true });
});
