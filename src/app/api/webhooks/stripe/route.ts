/**
 * Payment webhook — the only write surface in the app with no session.
 *
 * It must therefore establish trust itself, in this order:
 *
 *   1. HMAC signature over the *raw* body, with a timestamp tolerance
 *   2. replay protection, by inserting the provider's event id as a primary key
 *   3. only then a state transition, which is itself guarded by current status
 *
 * Insert and apply run in one transaction. A failure returns 5xx so Stripe
 * retries; a unique-constraint hit on the event id is a replay (200).
 *
 * `requireApiSession` is deliberately not used: Stripe has no session, and
 * reaching for it here would be the wrong fix for a 401. This route is also
 * exempt from the same-origin CSRF check — authenticity is the HMAC.
 */

import { Prisma } from "@prisma/client";
import { prisma } from "@/server/db";
import { jsonError, jsonOk } from "@/server/http";
import { logOps } from "@/server/ops/log";
import {
  parseStripeEvent,
  stripeWebhookSecret,
  verifyStripeSignature,
  type WebhookEvent,
} from "@/server/commerce/payment-provider";
import {
  byPaymentRef,
  markOrderFailedByPaymentRef,
  markOrderPaidByPaymentRef,
  markOrderRefundedByPaymentRef,
} from "@/server/commerce/order-service";

function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

async function applyPaymentEvent(
  tx: Prisma.TransactionClient,
  event: WebhookEvent,
): Promise<boolean> {
  switch (event.kind) {
    case "checkout.session.completed":
      if (event.sessionPaymentStatus === "unpaid") {
        logOps("info", "commerce_checkout_session_unpaid", {
          paymentRef: event.paymentRef,
        });
        return false;
      }
      return markOrderPaidByPaymentRef(
        event.paymentRef,
        event.paymentIntentRef,
        tx,
      );
    case "checkout.session.async_payment_succeeded":
      return markOrderPaidByPaymentRef(
        event.paymentRef,
        event.paymentIntentRef,
        tx,
      );
    case "checkout.session.async_payment_failed":
      return markOrderFailedByPaymentRef(
        event.paymentRef,
        "async_payment_failed",
        tx,
      );
    case "checkout.session.expired":
      return markOrderFailedByPaymentRef(
        event.paymentRef,
        "session_expired",
        tx,
      );
    case "payment_intent.succeeded":
      return markOrderPaidByPaymentRef(event.paymentRef, null, tx);
    case "payment_intent.payment_failed":
      return markOrderFailedByPaymentRef(
        event.paymentRef,
        "payment_failed",
        tx,
      );
    case "charge.refunded":
      return markOrderRefundedByPaymentRef(event.paymentRef, tx);
    default:
      logOps("info", "commerce_webhook_ignored_kind", { kind: event.kind });
      return false;
  }
}

export async function POST(request: Request) {
  if (!stripeWebhookSecret()) {
    logOps("error", "commerce_webhook_secret_missing", {});
    return jsonError(503, "disabled", "Webhooks are not configured.");
  }

  const rawBody = await request.text();
  const verified = verifyStripeSignature(
    rawBody,
    request.headers.get("stripe-signature"),
  );
  if (!verified.ok) {
    logOps("warn", "commerce_webhook_rejected", { reason: verified.error });
    return jsonError(400, "validation", "Invalid signature.");
  }

  const parsed = parseStripeEvent(rawBody);
  if (!parsed.ok) {
    logOps("warn", "commerce_webhook_unparsable", { reason: parsed.error });
    return jsonError(400, "validation", "Invalid payload.");
  }
  const event = parsed.value;

  let applied = false;
  let duplicate = false;

  try {
    applied = await prisma.$transaction(async (tx) => {
      await tx.processedPaymentEvent.create({
        data: { id: event.id, provider: "stripe", kind: event.kind },
      });
      const didApply = await applyPaymentEvent(tx, event);
      if (didApply) {
        const order = await tx.order.findFirst({
          where: byPaymentRef(event.paymentRef),
          select: { id: true },
        });
        if (order) {
          await tx.processedPaymentEvent.update({
            where: { id: event.id },
            data: { orderId: order.id },
          });
        }
      }
      return didApply;
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      logOps("info", "commerce_webhook_replay_ignored", {
        eventId: event.id,
        kind: event.kind,
      });
      duplicate = true;
    } else {
      logOps("error", "commerce_webhook_apply_failed", {
        eventId: event.id,
        kind: event.kind,
      });
      return jsonError(
        500,
        "provider_failed",
        "Could not apply payment event.",
      );
    }
  }

  return jsonOk({ received: true, applied, duplicate });
}
