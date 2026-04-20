import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { verifyWebhookSignature } from "@/lib/payments/stripe";
import { sendOrderConfirmationEmail } from "@/lib/email/send";
import { formatSGD } from "@/lib/site/money";
import { getPublicOrigin } from "@/lib/eva/core/public-origin";

/**
 * POST /api/webhooks/stripe
 *
 * Handles Stripe webhook events. The most important ones for us:
 *   - payment_intent.succeeded → mark order paid, trigger fulfillment
 *   - payment_intent.payment_failed → mark order failed, refund
 *   - charge.refunded → mark order refunded
 *
 * SECURITY:
 *   - Signature verification is REQUIRED. Webhooks without a valid signature
 *     are rejected. This prevents an attacker forging "payment succeeded"
 *     for someone else's order.
 *   - Idempotency: same Stripe event can fire multiple times. We check
 *     the order's current status before mutating to avoid double-processing.
 *
 * NOTE: This endpoint is NOT subject to CSRF (Stripe POSTs, not the browser).
 * Excluded from middleware via the matcher pattern.
 */

// Stripe sends raw body; Next.js by default parses it. Disable parsing.
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  // Read raw body — required for signature verification
  const payload = await req.text();

  const verified = await verifyWebhookSignature({ payload, signature });
  if (!verified.ok) {
    console.error(
      "[stripe webhook] signature verification failed:",
      verified.error,
    );
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const event = verified.event;
  console.log(`[stripe webhook] received: ${event.type}`);

  const siteOrigin = getPublicOrigin(req);

  try {
    switch (event.type) {
      case "payment_intent.succeeded":
        await handlePaymentSucceeded(
          event.data.object,
          siteOrigin,
          (event as { id?: string }).id ?? "unknown",
        );
        break;
      case "payment_intent.payment_failed":
        await handlePaymentFailed(event.data.object);
        break;
      case "charge.refunded":
        await handleChargeRefunded(event.data.object);
        break;
      default:
        // Acknowledge unhandled events so Stripe doesn't retry them
        console.log(`[stripe webhook] ignoring event type: ${event.type}`);
    }
    return NextResponse.json({ received: true });
  } catch (e) {
    console.error("[stripe webhook] handler error:", e);
    try {
      const Sentry = await import("@sentry/nextjs");
      Sentry.captureException(e, {
        tags: { module: "stripe_webhook", event_type: event.type },
      });
    } catch {
      // ignore
    }
    // Return 500 — Stripe will retry with exponential backoff
    return NextResponse.json({ error: "handler failed" }, { status: 500 });
  }
}

/* ── Handlers ─────────────────────────────────────────────── */

function buildPaymentSummaryFromIntent(
  intent: Record<string, unknown>,
  intentId: string,
): Prisma.InputJsonValue {
  const charges = intent.charges as { data?: unknown[] } | undefined;
  const first = charges?.data?.[0] as Record<string, unknown> | undefined;
  const pmd = first?.payment_method_details as
    | Record<string, unknown>
    | undefined;
  const card = pmd?.card as
    | { brand?: string; last4?: string; funding?: string }
    | undefined;
  if (card?.last4) {
    return {
      kind: "card",
      brand: card.brand ?? null,
      last4: card.last4,
      funding: card.funding ?? null,
    };
  }
  return {
    kind: "stripe",
    paymentIntentId: intentId,
    recordedAt: new Date().toISOString(),
  };
}

async function sendOrderPaidEvent(orderId: string, context: string) {
  if (!process.env.INNGEST_EVENT_KEY) {
    console.warn(
      `[stripe webhook] ${context}: INNGEST_EVENT_KEY unset — skipping order/paid`,
    );
    return;
  }
  try {
    const { inngest } = await import("@/lib/jobs/inngest");
    await inngest.send({
      name: "order/paid",
      data: { orderId },
    });
  } catch (e) {
    console.error(`[stripe webhook] ${context}: inngest send failed:`, e);
    throw e;
  }
}

async function handlePaymentSucceeded(
  intent: Record<string, unknown>,
  siteOrigin: string,
  stripeEventId: string,
) {
  const intentId = intent.id as string;
  const metadata = (intent.metadata ?? {}) as Record<string, string>;
  // Set on PaymentIntent in `lib/payments/stripe.ts` (createPaymentIntent metadata).
  const orderId = metadata.order_id;

  if (!orderId) {
    console.warn(
      `[stripe webhook] payment_intent.succeeded ${intentId} has no order_id metadata`,
    );
    return;
  }

  // Look up order
  const order = await prisma.order.findFirst({
    where: { id: orderId },
    include: { user: { select: { email: true, name: true } } },
  });
  if (!order) {
    console.warn(`[stripe webhook] order ${orderId} not found`);
    return;
  }

  // Idempotency: fulfillment moves order to `processing` — skip duplicate work.
  if (
    order.status === "processing" ||
    order.status === "shipped" ||
    order.status === "delivered"
  ) {
    console.log(
      `[stripe webhook] order ${orderId} already in fulfillment pipeline — skipping (${stripeEventId})`,
    );
    return;
  }

  if (order.status === "refunded" || order.status === "cancelled") {
    console.warn(
      `[stripe webhook] order ${orderId} is ${order.status} — ignoring payment success (${stripeEventId})`,
    );
    return;
  }

  // Retry path: we marked paid but Inngest failed (webhook returned 500). Re-send only.
  if (order.status === "paid") {
    console.log(
      `[stripe webhook] order ${orderId} already paid — re-sending order/paid (${stripeEventId})`,
    );
    await sendOrderPaidEvent(order.id, "retry-paid");
    return;
  }

  if (order.status !== "placed") {
    console.warn(
      `[stripe webhook] order ${orderId} unexpected status "${order.status}" (${stripeEventId})`,
    );
    return;
  }

  const paymentSummary = buildPaymentSummaryFromIntent(
    intent as Record<string, unknown>,
    intentId,
  );

  // First success: placed → paid
  await prisma.$transaction([
    prisma.order.update({
      where: { id: orderId },
      data: {
        status: "paid",
        paidAt: new Date(),
        paymentSummary,
      },
    }),
    prisma.activityEvent.create({
      data: {
        userId: order.userId,
        category: "billing",
        label: `Order ${order.number} paid`,
      },
    }),
  ]);

  if (order.user.email) {
    await sendOrderConfirmationEmail({
      to: order.user.email,
      name: order.user.name,
      orderNumber: order.number,
      totalDisplay: formatSGD(order.totalCents),
      orderUrl: `${siteOrigin}/checkout/success/${order.id}`,
    });
  }

  await sendOrderPaidEvent(order.id, "placed→paid");
}

async function handlePaymentFailed(intent: Record<string, unknown>) {
  const intentId = intent.id as string;
  const metadata = (intent.metadata ?? {}) as Record<string, string>;
  const orderId = metadata.order_id;
  if (!orderId) return;

  await prisma.order.updateMany({
    where: { id: orderId, status: "placed" },
    data: { status: "cancelled", cancelledAt: new Date() },
  });
  console.log(
    `[stripe webhook] payment failed for order ${orderId} (intent ${intentId})`,
  );
}

async function handleChargeRefunded(charge: Record<string, unknown>) {
  // charges link back to PaymentIntents via `payment_intent`
  const intentId = charge.payment_intent as string | null;
  if (!intentId) return;

  await prisma.order.updateMany({
    where: { stripePaymentIntentId: intentId },
    data: { status: "refunded" },
  });
  console.log(`[stripe webhook] order refunded (intent ${intentId})`);
}
