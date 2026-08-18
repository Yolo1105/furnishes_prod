/**
 * Re-apply a Stripe event id that is already trusted (HMAC verified earlier).
 * Does not skip ProcessedPaymentEvent — if the id exists this is a no-op.
 *
 * Usage: pnpm commerce:order-resettle -- evt_...
 */

import { prisma } from "../src/server/db";
import { recordSecurityEvent } from "../src/server/auth/security-events";
import { parseStripeEvent } from "../src/server/commerce/payment-provider";
import {
  byPaymentRef,
  markOrderFailedByPaymentRef,
  markOrderPaidByPaymentRef,
  markOrderRefundedByPaymentRef,
} from "../src/server/commerce/order-service";

async function main() {
  const eventId = process.argv.slice(2).find((arg) => !arg.startsWith("-"));
  if (!eventId) {
    console.error("usage: pnpm commerce:order-resettle -- <stripe-event-id>");
    process.exit(1);
  }

  const raw = process.env.STRIPE_RESETTLE_EVENT_JSON?.trim();
  if (!raw) {
    console.error("Set STRIPE_RESETTLE_EVENT_JSON to the event payload.");
    process.exit(1);
  }

  const parsed = parseStripeEvent(raw);
  if (!parsed.ok || parsed.value.id !== eventId) {
    console.error("payload does not match event id");
    process.exit(1);
  }
  const event = parsed.value;

  let applied = false;
  switch (event.kind) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded":
    case "payment_intent.succeeded":
      applied = await markOrderPaidByPaymentRef(
        event.paymentRef,
        event.paymentIntentRef,
      );
      break;
    case "checkout.session.async_payment_failed":
      applied = await markOrderFailedByPaymentRef(
        event.paymentRef,
        "async_payment_failed",
      );
      break;
    case "checkout.session.expired":
      applied = await markOrderFailedByPaymentRef(
        event.paymentRef,
        "session_expired",
      );
      break;
    case "payment_intent.payment_failed":
      applied = await markOrderFailedByPaymentRef(
        event.paymentRef,
        "payment_failed",
      );
      break;
    case "charge.refunded":
      applied = await markOrderRefundedByPaymentRef(event.paymentRef);
      break;
    default:
      console.error(`unhandled kind ${event.kind}`);
      process.exit(1);
  }

  const order = await prisma.order.findFirst({
    where: byPaymentRef(event.paymentRef),
    select: { id: true, number: true, status: true },
  });

  await recordSecurityEvent({
    kind: "order_resettled",
    meta: { eventId, applied, orderId: order?.id ?? null },
  });

  console.info(JSON.stringify({ applied, order }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
