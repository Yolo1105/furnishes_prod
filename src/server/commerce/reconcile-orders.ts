import { envInt } from "@/server/env";
import { prisma } from "@/server/db";
import { logOps } from "@/server/ops/log";
import { recordSecurityEvent } from "@/server/auth/security-events";
import {
  paymentProviderName,
  retrieveCheckoutSession,
} from "./payment-provider";
import {
  markOrderFailedByPaymentRef,
  markOrderPaidByPaymentRef,
} from "./order-service";

function staleMinutes(): number {
  return Math.max(1, envInt("COMMERCE_RECONCILE_STALE_MINUTES", 30) || 30);
}

export async function reconcilePendingOrders(now = new Date()): Promise<{
  examined: number;
  paid: number;
  cancelled: number;
  skipped: number;
}> {
  const cutoff = new Date(now.getTime() - staleMinutes() * 60 * 1000);
  const pending = await prisma.order.findMany({
    where: {
      status: "pending_payment",
      paymentRef: { not: null },
      placedAt: { lt: cutoff },
    },
    select: { id: true, paymentRef: true, paymentIntentRef: true },
    take: 100,
  });

  let paid = 0;
  let cancelled = 0;
  let skipped = 0;

  for (const order of pending) {
    const ref = order.paymentRef;
    if (!ref) {
      skipped += 1;
      continue;
    }
    if (paymentProviderName() !== "stripe") {
      skipped += 1;
      continue;
    }
    const session = await retrieveCheckoutSession(ref);
    if (!session) {
      skipped += 1;
      continue;
    }
    if (session.paymentStatus === "paid" || session.status === "complete") {
      if (await markOrderPaidByPaymentRef(ref, order.paymentIntentRef)) {
        paid += 1;
      } else {
        skipped += 1;
      }
      continue;
    }
    if (session.status === "expired") {
      if (await markOrderFailedByPaymentRef(ref, "session_expired")) {
        cancelled += 1;
      } else {
        skipped += 1;
      }
      continue;
    }
    skipped += 1;
  }

  logOps("info", "commerce_order_reconcile", {
    examined: pending.length,
    paid,
    cancelled,
    skipped,
  });
  await recordSecurityEvent({
    kind: "commerce_order_reconcile",
    meta: { examined: pending.length, paid, cancelled, skipped },
  });
  return { examined: pending.length, paid, cancelled, skipped };
}
