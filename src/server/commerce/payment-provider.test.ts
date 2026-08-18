import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createPaymentIntent,
  hostedCheckoutUrl,
  parseStripeEvent,
  paymentProviderName,
  stripeCheckoutBody,
  verifyStripeSignature,
} from "./payment-provider";

const SECRET = "whsec_test_secret";

/** Checkout replay token — named this way so secret scanners do not treat it as an API key. */
const TEST_IDEMPOTENCY = "checkout-replay-aaaa-bbbb";

const LINES = [{ name: "Sofa", unitPriceCents: 1000, quantity: 1 }];

function sign(body: string, at: Date, secret = SECRET): string {
  const timestamp = Math.floor(at.getTime() / 1000);
  const signature = createHmac("sha256", secret)
    .update(`${timestamp}.${body}`)
    .digest("hex");
  return `t=${timestamp},v1=${signature}`;
}

describe("payment provider selection", () => {
  const saved = process.env.COMMERCE_PAYMENT_PROVIDER;
  afterEach(() => {
    if (saved === undefined) delete process.env.COMMERCE_PAYMENT_PROVIDER;
    else process.env.COMMERCE_PAYMENT_PROVIDER = saved;
  });

  it("defaults to disabled and refuses to create an intent", async () => {
    delete process.env.COMMERCE_PAYMENT_PROVIDER;
    expect(paymentProviderName()).toBe("disabled");
    const result = await createPaymentIntent({
      orderNumber: "FZ-1",
      amountCents: 1000,
      currency: "SGD",
      idempotencyKey: TEST_IDEMPOTENCY,
      userEmail: "shopper@example.com",
      lines: LINES,
    });
    expect(result).toMatchObject({ ok: false, error: "provider_disabled" });
  });

  it("treats an unknown provider name as disabled rather than guessing", () => {
    process.env.COMMERCE_PAYMENT_PROVIDER = "paypal";
    expect(paymentProviderName()).toBe("disabled");
  });

  it("settles immediately under the test provider", async () => {
    process.env.COMMERCE_PAYMENT_PROVIDER = "test";
    const result = await createPaymentIntent({
      orderNumber: "FZ-2",
      amountCents: 73902,
      currency: "SGD",
      idempotencyKey: TEST_IDEMPOTENCY,
      userEmail: "shopper@example.com",
      lines: [{ name: "Sofa", unitPriceCents: 73902, quantity: 1 }],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.status).toBe("succeeded");
    // The amount is echoed so a test can prove the right figure was charged.
    expect(result.value.ref).toContain("73902");
    // No hosted page to visit: the test provider settles locally.
    expect(result.value.redirectUrl).toBeNull();
  });
});

describe("stripe hosted checkout session", () => {
  const savedProvider = process.env.COMMERCE_PAYMENT_PROVIDER;
  const savedKey = process.env.STRIPE_SECRET_KEY;
  const savedOrigin = process.env.APP_ORIGIN;

  beforeEach(() => {
    process.env.COMMERCE_PAYMENT_PROVIDER = "stripe";
    process.env.STRIPE_SECRET_KEY = "sk_test_x";
    process.env.APP_ORIGIN = "https://furnishes.example";
  });
  afterEach(() => {
    if (savedProvider === undefined)
      delete process.env.COMMERCE_PAYMENT_PROVIDER;
    else process.env.COMMERCE_PAYMENT_PROVIDER = savedProvider;
    if (savedKey === undefined) delete process.env.STRIPE_SECRET_KEY;
    else process.env.STRIPE_SECRET_KEY = savedKey;
    if (savedOrigin === undefined) delete process.env.APP_ORIGIN;
    else process.env.APP_ORIGIN = savedOrigin;
    vi.restoreAllMocks();
  });

  const input = {
    orderNumber: "FZ-500",
    amountCents: 249_00 + 20_00 + 24_21,
    currency: "SGD",
    idempotencyKey: TEST_IDEMPOTENCY,
    userEmail: "shopper@example.com",
    lines: [
      { name: "Halden Sofa — Oat", unitPriceCents: 249_00, quantity: 1 },
      { name: "Delivery", unitPriceCents: 20_00, quantity: 1 },
      { name: "GST", unitPriceCents: 24_21, quantity: 1 },
    ],
  };

  it("encodes every line as its own price_data entry", () => {
    const body = stripeCheckoutBody(input);
    expect(body.get("mode")).toBe("payment");
    expect(body.get("line_items[0][price_data][product_data][name]")).toBe(
      "Halden Sofa — Oat",
    );
    expect(body.get("line_items[0][price_data][unit_amount]")).toBe("24900");
    // Stripe wants a lowercase currency code.
    expect(body.get("line_items[0][price_data][currency]")).toBe("sgd");
    expect(body.get("line_items[2][price_data][product_data][name]")).toBe(
      "GST",
    );
    expect(body.get("client_reference_id")).toBe("FZ-500");
    expect(body.get("automatic_tax[enabled]")).toBe("false");
  });

  it("returns the shopper to orders on both success and cancel", () => {
    const body = stripeCheckoutBody(input);
    expect(body.get("success_url")).toBe(
      "https://furnishes.example/account/orders?checkout=success&order=FZ-500",
    );
    expect(body.get("cancel_url")).toBe(
      "https://furnishes.example/account/orders?checkout=cancelled&order=FZ-500",
    );
  });

  it("hands back the hosted URL and never calls a fresh session paid", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          id: "cs_test_1",
          url: "https://checkout.stripe.com/c/pay/cs_test_1",
          payment_status: "unpaid",
        }),
        { status: 200 },
      ),
    );

    const result = await createPaymentIntent(input);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.ref).toBe("cs_test_1");
    expect(result.value.redirectUrl).toContain("checkout.stripe.com");
    expect(result.value.status).toBe("requires_action");

    // The idempotency key must reach Stripe, or a retry would open a second
    // session for the same order.
    const headers = new Headers(fetchMock.mock.calls[0]?.[1]?.headers);
    expect(headers.get("Idempotency-Key")).toBe(TEST_IDEMPOTENCY);
  });

  it("refuses when the line items do not add up to the order total", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    // A shopper must never be charged a figure other than the order total.
    const result = await createPaymentIntent({
      ...input,
      amountCents: input.amountCents + 5000,
    });
    expect(result).toMatchObject({ ok: false, error: "provider_unavailable" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("fails closed when the session comes back without a URL", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ id: "cs_test_2" }), { status: 200 }),
    );
    const result = await createPaymentIntent(input);
    expect(result).toMatchObject({ ok: false, error: "provider_unavailable" });
  });

  it("returns an open session URL and ignores expired ones", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          id: "cs_test_1",
          status: "open",
          url: "https://checkout.stripe.com/c/pay/cs_test_1",
        }),
        { status: 200 },
      ),
    );
    await expect(hostedCheckoutUrl("cs_test_1")).resolves.toBe(
      "https://checkout.stripe.com/c/pay/cs_test_1",
    );

    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ id: "cs_test_1", status: "expired" }), {
        status: 200,
      }),
    );
    await expect(hostedCheckoutUrl("cs_test_1")).resolves.toBeNull();
  });

  it("does not retrieve a session when payments are not stripe", async () => {
    process.env.COMMERCE_PAYMENT_PROVIDER = "test";
    const fetchMock = vi.spyOn(globalThis, "fetch");
    await expect(hostedCheckoutUrl("cs_test_1")).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("stripe webhook signature", () => {
  const saved = process.env.STRIPE_WEBHOOK_SECRET;
  beforeEach(() => {
    process.env.STRIPE_WEBHOOK_SECRET = SECRET;
  });
  afterEach(() => {
    if (saved === undefined) delete process.env.STRIPE_WEBHOOK_SECRET;
    else process.env.STRIPE_WEBHOOK_SECRET = saved;
  });

  const body = JSON.stringify({
    id: "evt_1",
    type: "payment_intent.succeeded",
  });
  const now = new Date("2026-08-14T00:00:00.000Z");

  it("accepts a correctly signed payload", () => {
    expect(verifyStripeSignature(body, sign(body, now), now)).toMatchObject({
      ok: true,
    });
  });

  it("rejects a payload signed with the wrong secret", () => {
    const forged = sign(body, now, "whsec_attacker");
    expect(verifyStripeSignature(body, forged, now)).toMatchObject({
      ok: false,
      error: "signature_invalid",
    });
  });

  it("rejects a tampered body under a valid signature", () => {
    const header = sign(body, now);
    const tampered = JSON.stringify({
      id: "evt_1",
      type: "charge.refunded",
    });
    expect(verifyStripeSignature(tampered, header, now)).toMatchObject({
      ok: false,
      error: "signature_invalid",
    });
  });

  it("rejects a replay outside the timestamp tolerance", () => {
    const header = sign(body, now);
    const muchLater = new Date(now.getTime() + 10 * 60_000);
    expect(verifyStripeSignature(body, header, muchLater)).toMatchObject({
      ok: false,
      error: "timestamp_out_of_tolerance",
    });
  });

  it("refuses when no secret or header is present", () => {
    expect(verifyStripeSignature(body, null, now)).toMatchObject({
      ok: false,
      error: "signature_missing",
    });
    expect(verifyStripeSignature(body, "t=1", now)).toMatchObject({
      ok: false,
      error: "signature_missing",
    });
    delete process.env.STRIPE_WEBHOOK_SECRET;
    expect(verifyStripeSignature(body, sign(body, now), now)).toMatchObject({
      ok: false,
      error: "secret_missing",
    });
  });
});

describe("stripe event parsing", () => {
  it("reads the intent id for payment_intent events", () => {
    const parsed = parseStripeEvent(
      JSON.stringify({
        id: "evt_1",
        type: "payment_intent.succeeded",
        data: { object: { id: "pi_123" } },
      }),
    );
    expect(parsed).toMatchObject({
      ok: true,
      value: {
        id: "evt_1",
        kind: "payment_intent.succeeded",
        paymentRef: "pi_123",
      },
    });
  });

  it("follows payment_intent for charge events rather than the charge id", () => {
    // Reading `id` here would look up a charge as an order's payment reference
    // and silently refund nothing.
    const parsed = parseStripeEvent(
      JSON.stringify({
        id: "evt_2",
        type: "charge.refunded",
        data: { object: { id: "ch_999", payment_intent: "pi_123" } },
      }),
    );
    expect(parsed).toMatchObject({ ok: true, value: { paymentRef: "pi_123" } });
  });

  it("uses the session id for checkout events and records the intent", () => {
    // The order stored the session id, so following `payment_intent` here would
    // match nothing and leave a paid order stuck in pending_payment.
    const parsed = parseStripeEvent(
      JSON.stringify({
        id: "evt_3",
        type: "checkout.session.completed",
        data: {
          object: {
            id: "cs_test_1",
            payment_intent: "pi_123",
            payment_status: "paid",
          },
        },
      }),
    );
    expect(parsed).toMatchObject({
      ok: true,
      value: {
        paymentRef: "cs_test_1",
        paymentIntentRef: "pi_123",
        sessionPaymentStatus: "paid",
      },
    });
  });

  it("keeps a session parseable before its intent exists", () => {
    const parsed = parseStripeEvent(
      JSON.stringify({
        id: "evt_4",
        type: "checkout.session.expired",
        data: { object: { id: "cs_test_9" } },
      }),
    );
    expect(parsed).toMatchObject({
      ok: true,
      value: { paymentRef: "cs_test_9", paymentIntentRef: null },
    });
  });

  it("rejects malformed payloads", () => {
    expect(parseStripeEvent("not json")).toMatchObject({
      ok: false,
      error: "payload_invalid",
    });
    expect(parseStripeEvent(JSON.stringify({ id: "evt" }))).toMatchObject({
      ok: false,
      error: "payload_invalid",
    });
  });
});
