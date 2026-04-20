/**
 * Stripe adapter — wraps the SDK with type-safe helpers.
 *
 * Design:
 *   - Lazy-loaded so `import { stripe }` doesn't crash if STRIPE_SECRET_KEY
 *     is missing (dev/CI/build time)
 *   - All money in cents (matches our internal model)
 *   - Singapore-specific: SGD currency default, PayNow alongside cards
 *   - Idempotency keys on every mutating call to prevent duplicates
 *
 * INSTALL:
 *   npm install stripe
 *
 * ACCOUNT SETUP:
 *   1. Create a Stripe account (https://dashboard.stripe.com)
 *   2. Verify your business via Stripe's onboarding (Singapore-specific)
 *   3. Enable PayNow in Settings → Payment methods (SG-only payment method)
 *   4. Get your secret key + publishable key from the API Keys page
 *   5. Set up a webhook endpoint pointing to /api/webhooks/stripe with the
 *      "payment_intent.succeeded", "payment_intent.payment_failed", and
 *      "charge.refunded" events. Get the signing secret.
 */

import "server-only";
import { randomUUID } from "crypto";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const isConfigured = !!STRIPE_SECRET_KEY;

/* ── Lazy SDK init ────────────────────────────────────────── */

// Use loose typing here so this file compiles even if `stripe` isn't installed.
// In production the import will resolve and the methods we call will exist.
type StripeLike = {
  paymentIntents: {
    create: (
      params: Record<string, unknown>,
      opts?: { idempotencyKey?: string },
    ) => Promise<{ id: string; client_secret: string | null; status: string }>;
    retrieve: (id: string) => Promise<{
      id: string;
      status: string;
      metadata: Record<string, string>;
    }>;
  };
  customers: {
    create: (
      params: Record<string, unknown>,
      opts?: { idempotencyKey?: string },
    ) => Promise<{ id: string }>;
    retrieve: (id: string) => Promise<{ id: string; email: string | null }>;
  };
  webhooks: {
    constructEvent: (
      payload: string | Buffer,
      signature: string,
      secret: string,
    ) => {
      type: string;
      data: { object: Record<string, unknown> };
    };
  };
};

let stripeInstance: StripeLike | null = null;

async function getStripe(): Promise<StripeLike | null> {
  if (stripeInstance) return stripeInstance;
  if (!isConfigured) return null;
  // Lazy import — avoids "stripe is not installed" errors during build/tests
  const stripeModule = (await import("stripe")) as unknown as {
    default: new (key: string, opts?: Record<string, unknown>) => StripeLike;
  };
  stripeInstance = new stripeModule.default(STRIPE_SECRET_KEY!, {
    apiVersion: "2025-02-24.acacia",
    typescript: true,
  });
  return stripeInstance;
}

/* ── Public API ───────────────────────────────────────────── */

/**
 * Create a PaymentIntent for a checkout. Returns the client_secret the
 * frontend uses to confirm payment via Stripe.js.
 *
 * Idempotency: keyed on orderId so a retry doesn't create two intents
 * for the same order.
 */
export async function createPaymentIntent(args: {
  orderId: string;
  userId: string;
  amountCents: number;
  currency?: "sgd" | "usd";
  /** PayNow + card. Apple/Google Pay auto-enabled via card. */
  paymentMethodTypes?: Array<"card" | "paynow">;
  /** Description that shows up in Stripe dashboard + customer's bank statement */
  description?: string;
  /** Stripe customer id if known — improves checkout UX */
  stripeCustomerId?: string;
  /** Tags propagated to Stripe for reporting + webhook routing */
  metadata?: Record<string, string>;
}): Promise<
  | { ok: true; clientSecret: string; paymentIntentId: string }
  | { ok: false; error: string }
> {
  const stripe = await getStripe();
  if (!stripe) {
    return {
      ok: false,
      error:
        "Stripe is not configured. Set STRIPE_SECRET_KEY in your environment.",
    };
  }

  try {
    const intent = await stripe.paymentIntents.create(
      {
        amount: args.amountCents,
        currency: args.currency ?? "sgd",
        payment_method_types: args.paymentMethodTypes ?? ["card", "paynow"],
        description: args.description ?? `Furnishes order ${args.orderId}`,
        ...(args.stripeCustomerId && { customer: args.stripeCustomerId }),
        metadata: {
          order_id: args.orderId,
          user_id: args.userId,
          ...args.metadata,
        },
      },
      { idempotencyKey: `pi:${args.orderId}` },
    );

    if (!intent.client_secret) {
      return { ok: false, error: "Stripe returned no client secret." };
    }
    return {
      ok: true,
      clientSecret: intent.client_secret,
      paymentIntentId: intent.id,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    try {
      const Sentry = await import("@sentry/nextjs");
      Sentry.captureException(e, {
        tags: { module: "stripe", op: "create_intent" },
      });
    } catch {
      // ignore
    }
    return { ok: false, error: message };
  }
}

/**
 * Retrieve a PaymentIntent — for verification after webhook receipt or
 * for manual reconciliation.
 */
export async function getPaymentIntent(
  paymentIntentId: string,
): Promise<
  | { ok: true; status: string; metadata: Record<string, string> }
  | { ok: false; error: string }
> {
  const stripe = await getStripe();
  if (!stripe) return { ok: false, error: "Stripe not configured" };
  try {
    const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
    return { ok: true, status: intent.status, metadata: intent.metadata };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * Get-or-create a Stripe customer for a user.
 * Idempotent — multiple calls with the same userId return the same customer.
 */
export async function ensureStripeCustomer(args: {
  userId: string;
  email: string;
  name?: string | null;
}): Promise<{ ok: true; customerId: string } | { ok: false; error: string }> {
  const stripe = await getStripe();
  if (!stripe) return { ok: false, error: "Stripe not configured" };
  try {
    const customer = await stripe.customers.create(
      {
        email: args.email,
        name: args.name ?? undefined,
        metadata: { user_id: args.userId },
      },
      { idempotencyKey: `cust:${args.userId}` },
    );
    return { ok: true, customerId: customer.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * Verify a webhook signature. Throws if invalid.
 * Used by the webhook route handler.
 */
export async function verifyWebhookSignature(args: {
  payload: string | Buffer;
  signature: string;
}): Promise<
  | {
      ok: true;
      event: { type: string; data: { object: Record<string, unknown> } };
    }
  | { ok: false; error: string }
> {
  const stripe = await getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) {
    return { ok: false, error: "Stripe webhook not configured" };
  }
  try {
    const event = stripe.webhooks.constructEvent(
      args.payload,
      args.signature,
      secret,
    );
    return { ok: true, event };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * Generate an idempotency key for any retry-safe operation.
 * Use when you don't have a natural one (orderId, userId).
 */
export function generateIdempotencyKey(prefix: string): string {
  return `${prefix}:${randomUUID()}`;
}

export const stripeIsConfigured = isConfigured;
