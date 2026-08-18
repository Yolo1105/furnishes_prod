/**
 * Print an order, its lines, payment refs, and processed webhook events.
 *
 * Usage: pnpm commerce:order-inspect -- FZ-1001
 */

import { prisma } from "../src/server/db";
import { recordSecurityEvent } from "../src/server/auth/security-events";

async function main() {
  const key = process.argv.slice(2).find((arg) => !arg.startsWith("-"));
  if (!key) {
    console.error("usage: pnpm commerce:order-inspect -- <order-number-or-id>");
    process.exit(1);
  }

  const order = await prisma.order.findFirst({
    where: { OR: [{ id: key }, { number: key }] },
    include: { items: true },
  });
  if (!order) {
    console.error("order not found");
    process.exit(1);
  }

  const events = await prisma.processedPaymentEvent.findMany({
    where: { orderId: order.id },
    orderBy: { processedAt: "asc" },
  });

  await recordSecurityEvent({
    kind: "order_inspected",
    meta: { orderId: order.id, number: order.number },
  });

  console.info(
    JSON.stringify(
      {
        order: {
          id: order.id,
          number: order.number,
          status: order.status,
          totalCents: order.totalCents,
          currency: order.currency,
          paymentRef: order.paymentRef,
          paymentIntentRef: order.paymentIntentRef,
          placedAt: order.placedAt,
        },
        items: order.items,
        processedEvents: events,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
