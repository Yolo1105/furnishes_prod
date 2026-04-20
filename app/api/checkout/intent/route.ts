import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/auth";
import { apiError } from "@/lib/api/error";
import { strictRateLimit, CHECKOUT_LIMITS } from "@/lib/rate-limit";
import { clientIdentity } from "@/lib/api/identity";
import {
  createPaymentIntent,
  ensureStripeCustomer,
} from "@/lib/payments/stripe";
import { isCommerceBackendEnabled } from "@/lib/site/commerce/server-flags";

const BodySchema = z.object({
  /**
   * Whose totals to use. The order is created on our side first (status=placed)
   * so that we have a stable ID to attach the payment intent to.
   */
  orderId: z.string().min(1),
});

/**
 * POST /api/checkout/intent
 *   body: { orderId }
 *
 * Creates (or retrieves, via idempotency) a Stripe PaymentIntent for the
 * given order. Returns the client_secret so the browser can confirm payment.
 *
 * Flow:
 *   1. Frontend creates an Order (status: placed) via `POST /api/orders`
 *      (body: shippingAddressId, deliveryMethod, deliveryCents)
 *   2. Frontend calls this endpoint with the orderId
 *   3. We look up the order, validate it belongs to the user
 *   4. We create-or-fetch Stripe Customer for the user
 *   5. We create-or-retrieve a PaymentIntent (idempotency keyed by orderId)
 *   6. Frontend uses client_secret with Stripe.js to collect payment
 *   7. Stripe webhook fires payment_intent.succeeded → /api/webhooks/stripe
 *      flips order status to "paid" and triggers fulfillment
 */
export async function POST(req: NextRequest) {
  try {
    if (!isCommerceBackendEnabled()) {
      return NextResponse.json(
        {
          error: "COMMERCE_DISABLED",
          message:
            "Checkout API is disabled. Set COMMERCE_BACKEND_ENABLED=1 (and NEXT_PUBLIC_COMMERCE_ENABLED for UI) when ready.",
        },
        { status: 501 },
      );
    }
    // Rate limit — checkout abuse / card-testing prevention
    const identity = clientIdentity(req);
    const limit = await strictRateLimit(identity, CHECKOUT_LIMITS.intent);
    if (!limit.success) {
      return NextResponse.json(
        { error: "RATE_LIMIT", message: "Too many checkout attempts." },
        { status: 429 },
      );
    }

    const { userId, email } = await requireUser();
    const { orderId } = BodySchema.parse(await req.json());

    // Lookup the order, scoped to this user
    const order = await prisma.order.findFirst({
      where: { id: orderId, userId },
      select: {
        id: true,
        number: true,
        status: true,
        totalCents: true,
        currency: true,
        stripePaymentIntentId: true,
      },
    });
    if (!order) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Order not found." },
        { status: 404 },
      );
    }
    if (order.status !== "placed") {
      return NextResponse.json(
        {
          error: "BAD_STATE",
          message: `Order is in status "${order.status}", cannot create payment.`,
        },
        { status: 409 },
      );
    }

    // Get-or-create Stripe customer
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });
    const customerResult = await ensureStripeCustomer({
      userId,
      email,
      name: user?.name,
    });
    if (!customerResult.ok) {
      return NextResponse.json(
        { error: "STRIPE_ERROR", message: customerResult.error },
        { status: 502 },
      );
    }

    // Create PaymentIntent (idempotent on orderId)
    const intentResult = await createPaymentIntent({
      orderId: order.id,
      userId,
      amountCents: order.totalCents,
      currency: order.currency.toLowerCase() as "sgd" | "usd",
      description: `Furnishes order ${order.number}`,
      stripeCustomerId: customerResult.customerId,
      metadata: { order_number: order.number },
    });
    if (!intentResult.ok) {
      return NextResponse.json(
        { error: "STRIPE_ERROR", message: intentResult.error },
        { status: 502 },
      );
    }

    // Persist the intent ID on the order so the webhook can find it
    if (order.stripePaymentIntentId !== intentResult.paymentIntentId) {
      await prisma.order.update({
        where: { id: order.id },
        data: { stripePaymentIntentId: intentResult.paymentIntentId },
      });
    }

    return NextResponse.json({
      clientSecret: intentResult.clientSecret,
      paymentIntentId: intentResult.paymentIntentId,
    });
  } catch (e) {
    return apiError(e);
  }
}
