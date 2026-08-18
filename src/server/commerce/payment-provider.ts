/**
 * Payment provider adapter: disabled | test | stripe.
 *
 * Mirrors the image-generation provider shape so the selection rules are
 * familiar, with one difference that matters: `test` settles payments for free,
 * so boot preflight refuses it outside a test runtime. A `test` provider in
 * production would hand out furniture.
 *
 * Stripe is called over its REST API with fetch rather than the `stripe` npm
 * package, which stays in the eslint blocklist (docs/COMMERCE.md).
 */

import { createHmac, timingSafeEqual } from "node:crypto";
import { err, ok, type ServiceResult } from "@/server/result";
import { logOps } from "@/server/ops/log";
import { appOrigin } from "@/server/app-origin";
import { lineTotalCents } from "@/lib/commerce/money";

type PaymentProviderName = "disabled" | "test" | "stripe";

/** Provider-side lifecycle, deliberately narrower than the order status. */
type PaymentStatus = "requires_action" | "succeeded" | "failed";

type PaymentIntentResult = {
  /** Provider reference stored on the order and echoed by webhooks. */
  ref: string;
  status: PaymentStatus;
  /**
   * Where to send the shopper to pay. Hosted checkout means no card field is
   * ever mounted here, so no card data touches this app.
   */
  redirectUrl: string | null;
};

type PaymentError = "provider_disabled" | "provider_unavailable";

/** One charged line as the provider should display it. */
export type PaymentLine = {
  name: string;
  unitPriceCents: number;
  quantity: number;
};

type CreateIntentInput = {
  orderNumber: string;
  amountCents: number;
  currency: string;
  /** Reused as the provider idempotency key, so retries cannot double-charge. */
  idempotencyKey: string;
  userEmail: string;
  /**
   * Products plus shipping and tax as their own lines. The provider charges the
   * sum of these, so they must add up to `amountCents` — see the guard below.
   */
  lines: PaymentLine[];
};

export function paymentProviderName(): PaymentProviderName {
  const raw = (process.env.COMMERCE_PAYMENT_PROVIDER ?? "disabled")
    .trim()
    .toLowerCase();
  if (raw === "test" || raw === "stripe") return raw;
  return "disabled";
}

function stripeSecretKey(): string {
  return process.env.STRIPE_SECRET_KEY?.trim() ?? "";
}

export function stripeWebhookSecret(): string {
  return process.env.STRIPE_WEBHOOK_SECRET?.trim() ?? "";
}

/**
 * Deterministic local settlement. Amount and currency are echoed into the ref
 * so a test assertion can prove the right figure reached the provider.
 */
function createTestIntent(input: CreateIntentInput): PaymentIntentResult {
  return {
    ref: `test_pi_${input.orderNumber}_${input.currency}_${input.amountCents}`,
    status: "succeeded",
    redirectUrl: null,
  };
}

/**
 * Builds the form body for a hosted Checkout Session.
 *
 * Exported for tests: the encoding of `line_items[i][price_data]` is the part
 * most likely to silently charge the wrong amount, so it is asserted directly
 * rather than only through a mocked fetch.
 */
export function stripeCheckoutBody(input: CreateIntentInput): URLSearchParams {
  const currency = input.currency.toLowerCase();
  const body = new URLSearchParams({
    mode: "payment",
    // The shopper returns to Orders, where status comes from the webhook rather
    // than from having landed on this URL.
    success_url: `${appOrigin()}/account/orders?checkout=success&order=${encodeURIComponent(input.orderNumber)}`,
    cancel_url: `${appOrigin()}/account/orders?checkout=cancelled&order=${encodeURIComponent(input.orderNumber)}`,
    customer_email: input.userEmail,
    client_reference_id: input.orderNumber,
    "metadata[order_number]": input.orderNumber,
    "payment_intent_data[metadata][order_number]": input.orderNumber,
    // Tax is already a line item from COMMERCE_TAX_PERCENT. Leaving Stripe Tax
    // on would charge it twice.
    "automatic_tax[enabled]": "false",
  });

  input.lines.forEach((line, index) => {
    body.set(`line_items[${index}][quantity]`, String(line.quantity));
    body.set(`line_items[${index}][price_data][currency]`, currency);
    body.set(
      `line_items[${index}][price_data][unit_amount]`,
      String(line.unitPriceCents),
    );
    body.set(`line_items[${index}][price_data][product_data][name]`, line.name);
  });

  return body;
}

function linesTotalCents(lines: PaymentLine[]): number {
  return lines.reduce(
    (sum, line) => sum + lineTotalCents(line.unitPriceCents, line.quantity),
    0,
  );
}

/**
 * Re-fetches an open hosted session so a retried place-order can send the
 * shopper back. Expired or already-paid sessions have no URL worth following.
 */
export async function hostedCheckoutUrl(
  sessionId: string | null,
): Promise<string | null> {
  if (!sessionId || paymentProviderName() !== "stripe") return null;
  const key = stripeSecretKey();
  if (!key) return null;

  try {
    const response = await fetch(
      `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`,
      { headers: { Authorization: `Bearer ${key}` } },
    );
    if (!response.ok) return null;
    const payload = (await response.json()) as {
      status?: string;
      url?: string;
    };
    if (payload.status !== "open" || !payload.url) return null;
    return payload.url;
  } catch {
    return null;
  }
}

export async function retrieveCheckoutSession(sessionId: string): Promise<{
  status: string | null;
  paymentStatus: string | null;
} | null> {
  if (!sessionId || paymentProviderName() !== "stripe") return null;
  const key = stripeSecretKey();
  if (!key) return null;
  try {
    const response = await fetch(
      `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`,
      { headers: { Authorization: `Bearer ${key}` } },
    );
    if (!response.ok) return null;
    const payload = (await response.json()) as {
      status?: string;
      payment_status?: string;
    };
    return {
      status: payload.status ?? null,
      paymentStatus: payload.payment_status ?? null,
    };
  } catch {
    return null;
  }
}

async function createStripeCheckoutSession(
  input: CreateIntentInput,
): Promise<ServiceResult<PaymentIntentResult, PaymentError>> {
  const key = stripeSecretKey();
  if (!key) {
    return err("provider_unavailable", "Payments are temporarily unavailable.");
  }

  // Stripe charges the sum of the line items, not the figure we computed. If the
  // two ever disagree the shopper is billed something other than the order
  // total, so refuse the checkout instead of charging the wrong amount.
  if (linesTotalCents(input.lines) !== input.amountCents) {
    logOps("error", "commerce_payment_amount_mismatch", {
      orderNumber: input.orderNumber,
      expectedCents: input.amountCents,
      lineTotalCents: linesTotalCents(input.lines),
    });
    return err("provider_unavailable", "Payments are temporarily unavailable.");
  }

  try {
    const response = await fetch(
      "https://api.stripe.com/v1/checkout/sessions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/x-www-form-urlencoded",
          // Stripe replays the original response for a repeated key, which is
          // what makes a retried place-order safe.
          "Idempotency-Key": input.idempotencyKey,
        },
        body: stripeCheckoutBody(input),
      },
    );

    if (!response.ok) {
      logOps("error", "commerce_checkout_session_failed", {
        status: response.status,
        orderNumber: input.orderNumber,
      });
      return err(
        "provider_unavailable",
        "Payments are temporarily unavailable.",
      );
    }

    const payload = (await response.json()) as {
      id?: string;
      url?: string;
      payment_status?: string;
    };
    // Without a URL there is nowhere to send the shopper, so an order would be
    // stranded in pending_payment forever.
    if (!payload.id || !payload.url) {
      logOps("error", "commerce_checkout_session_incomplete", {
        orderNumber: input.orderNumber,
      });
      return err(
        "provider_unavailable",
        "Payments are temporarily unavailable.",
      );
    }

    return ok({
      ref: payload.id,
      // Never trust a fresh session as paid; only the webhook may say that.
      status: "requires_action",
      redirectUrl: payload.url,
    });
  } catch {
    logOps("error", "commerce_checkout_session_error", {
      orderNumber: input.orderNumber,
    });
    return err("provider_unavailable", "Payments are temporarily unavailable.");
  }
}

export async function createPaymentIntent(
  input: CreateIntentInput,
): Promise<ServiceResult<PaymentIntentResult, PaymentError>> {
  switch (paymentProviderName()) {
    case "test":
      return ok(createTestIntent(input));
    case "stripe":
      return createStripeCheckoutSession(input);
    default:
      return err("provider_disabled", "Checkout is not available yet.");
  }
}

export type WebhookEvent = {
  id: string;
  kind: string;
  /** The reference an order is matched on for this event family. */
  paymentRef: string;
  /**
   * The intent behind a completed session, learned here and stored so that
   * later charge-level events (refunds) can find the same order.
   */
  paymentIntentRef: string | null;
  /** Stripe's own `paid` / `unpaid` for a session; null for other families. */
  sessionPaymentStatus: string | null;
};

type WebhookRejection =
  | "signature_invalid"
  | "signature_missing"
  | "secret_missing"
  | "timestamp_out_of_tolerance"
  | "payload_invalid";

/** Stripe rejects replays older than five minutes; match that. */
const SIGNATURE_TOLERANCE_SECONDS = 300;

/**
 * Verifies a Stripe webhook signature by hand, since the SDK is not available.
 *
 * Header form: `t=<unix>,v1=<hex hmac>`, where the signed payload is
 * `${t}.${rawBody}` keyed with the endpoint secret. The timestamp check is what
 * stops a captured request being replayed later, and the comparison is
 * constant-time so the signature cannot be brute-forced byte by byte.
 */
export function verifyStripeSignature(
  rawBody: string,
  signatureHeader: string | null,
  now = new Date(),
): ServiceResult<true, WebhookRejection> {
  const secret = stripeWebhookSecret();
  if (!secret) return err("secret_missing");
  if (!signatureHeader) return err("signature_missing");

  const parts = new Map<string, string>();
  for (const segment of signatureHeader.split(",")) {
    const [key, value] = segment.split("=");
    if (key && value && !parts.has(key.trim())) {
      parts.set(key.trim(), value.trim());
    }
  }

  const timestamp = parts.get("t");
  const signature = parts.get("v1");
  if (!timestamp || !signature) return err("signature_missing");

  const timestampSeconds = Number(timestamp);
  if (!Number.isFinite(timestampSeconds)) return err("signature_invalid");
  const ageSeconds = Math.abs(
    Math.floor(now.getTime() / 1000) - timestampSeconds,
  );
  if (ageSeconds > SIGNATURE_TOLERANCE_SECONDS) {
    return err("timestamp_out_of_tolerance");
  }

  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");

  const expectedBuffer = Buffer.from(expected, "hex");
  const actualBuffer = Buffer.from(signature, "hex");
  if (
    expectedBuffer.length === 0 ||
    expectedBuffer.length !== actualBuffer.length ||
    !timingSafeEqual(expectedBuffer, actualBuffer)
  ) {
    return err("signature_invalid");
  }
  return ok(true);
}

/**
 * Narrows a provider payload to the fields the order state machine needs.
 * Unknown event kinds are returned as-is and ignored by the caller.
 *
 * Which field identifies the order depends on the event family, and guessing
 * wrong means an event that silently matches nothing:
 *
 * - `checkout.session.*` — the object is the session, and its id is what we
 *   stored as `paymentRef`. Its `payment_intent` is recorded for later.
 * - `payment_intent.*` — the object *is* the intent.
 * - `charge.*` (refunds) — the object is the charge, and the intent it belongs
 *   to sits in `payment_intent`; the charge's own id matches no order.
 */
export function parseStripeEvent(
  rawBody: string,
): ServiceResult<WebhookEvent, WebhookRejection> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return err("payload_invalid");
  }

  const event = parsed as {
    id?: unknown;
    type?: unknown;
    data?: {
      object?: {
        id?: unknown;
        payment_intent?: unknown;
        payment_status?: unknown;
      };
    };
  };
  const id = typeof event.id === "string" ? event.id : "";
  const kind = typeof event.type === "string" ? event.type : "";
  const object = event.data?.object;
  const objectId = typeof object?.id === "string" ? object.id : "";
  const intentRef =
    typeof object?.payment_intent === "string" ? object.payment_intent : null;

  let paymentRef: string;
  let paymentIntentRef: string | null = null;
  let sessionPaymentStatus: string | null = null;

  if (kind.startsWith("checkout.session.")) {
    paymentRef = objectId;
    paymentIntentRef = intentRef;
    sessionPaymentStatus =
      typeof object?.payment_status === "string" ? object.payment_status : null;
  } else if (kind.startsWith("payment_intent.")) {
    paymentRef = objectId;
  } else {
    paymentRef = intentRef ?? objectId;
  }

  if (!id || !kind || !paymentRef) return err("payload_invalid");
  return ok({ id, kind, paymentRef, paymentIntentRef, sessionPaymentStatus });
}
