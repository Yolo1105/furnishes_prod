import "server-only";

/**
 * After Stripe marks an order paid, Inngest calls this to hand off to ops /
 * warehouse / 3PL. Configure an optional outbound webhook; otherwise we log
 * structured JSON + Sentry breadcrumb (stub mode).
 *
 * Env:
 * - `FULFILLMENT_WEBHOOK_URL` — if set, we POST JSON and require 2xx (else step fails → Inngest retries).
 * - `FULFILLMENT_WEBHOOK_SECRET` — optional `Authorization: Bearer …` for your receiver.
 */

const WEBHOOK_URL = process.env.FULFILLMENT_WEBHOOK_URL?.trim();
const WEBHOOK_SECRET = process.env.FULFILLMENT_WEBHOOK_SECRET?.trim();

export type FulfillmentDispatchOrder = {
  id: string;
  number: string;
  totalCents: number;
  currency: string;
  stripePaymentIntentId: string | null;
  items: Array<{
    productId: string;
    variantId: string | null;
    qty: number;
    snapshot: unknown;
  }>;
};

export async function dispatchPaidOrderFulfillment(
  order: FulfillmentDispatchOrder,
): Promise<{ channel: "webhook" | "stub"; httpStatus?: number }> {
  if (!WEBHOOK_URL) {
    const payload = {
      event: "commerce.fulfillment.stub" as const,
      orderId: order.id,
      orderNumber: order.number,
      itemCount: order.items.length,
      totalCents: order.totalCents,
      currency: order.currency,
    };
    console.log(JSON.stringify({ level: "info", ...payload }));

    try {
      const Sentry = await import("@sentry/nextjs");
      Sentry.addBreadcrumb({
        category: "commerce.fulfillment",
        message:
          "FULFILLMENT_WEBHOOK_URL unset — stub only; set webhook to notify warehouse",
        level: "info",
        data: { orderId: order.id, orderNumber: order.number },
      });
    } catch {
      // Sentry optional
    }

    return { channel: "stub" };
  }

  const body = {
    event: "furnishes.order.paid" as const,
    orderId: order.id,
    orderNumber: order.number,
    totalCents: order.totalCents,
    currency: order.currency,
    stripePaymentIntentId: order.stripePaymentIntentId,
    items: order.items.map((i) => ({
      productId: i.productId,
      variantId: i.variantId,
      qty: i.qty,
      snapshot: i.snapshot,
    })),
  };

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (WEBHOOK_SECRET) {
    headers.Authorization = `Bearer ${WEBHOOK_SECRET}`;
  }

  const res = await fetch(WEBHOOK_URL, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Fulfillment webhook returned ${res.status}: ${text.slice(0, 500)}`,
    );
  }

  return { channel: "webhook", httpStatus: res.status };
}
