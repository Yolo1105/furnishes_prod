/**
 * Inngest client + scheduled job definitions.
 *
 * When adding **Furnishes Studio** background work, gate it with
 * `isStudioEnabled()` from `@/lib/studio/studio-enabled` so
 * `STUDIO_ENABLED=0` skips registration or no-ops inside the handler.
 *
 * Inngest is a typed event-driven scheduler that handles:
 *   - Scheduled crons (deletion finalization, token cleanup)
 *   - Event-triggered workflows (order paid → fulfillment)
 *   - Retry logic + exponential backoff
 *   - Step durability (resume mid-flow on crash)
 *
 * INSTALL:
 *   npm install inngest
 *
 * SETUP:
 *   1. Create an Inngest account (https://www.inngest.com)
 *   2. Get your INNGEST_EVENT_KEY + INNGEST_SIGNING_KEY from the dashboard
 *   3. Add them to .env.local
 *   4. Deploy — Inngest auto-discovers /api/inngest endpoint
 *   5. Cron jobs appear in dashboard within minutes
 *
 * LOCAL DEV:
 *   Run `npx inngest-cli@latest dev` in a separate terminal to see
 *   events flow + manually trigger jobs.
 */

import "server-only";
import { Inngest, EventSchemas } from "inngest";
import { getPublicOrigin } from "@/lib/eva/core/public-origin";

/* ── Event types ──────────────────────────────────────────── */

type Events = {
  "user/account.delete-requested": {
    data: { userId: string; scheduledFor: string };
  };
  "order/paid": {
    data: { orderId: string };
  };
  "support/staff.replied": {
    data: { threadId: string; messageId: string };
  };
};

/* ── Client ───────────────────────────────────────────────── */

export const inngest = new Inngest({
  id: "furnishes",
  schemas: new EventSchemas().fromRecord<Events>(),
  eventKey: process.env.INNGEST_EVENT_KEY,
});

/* ── Cron: account deletion finalization ─────────────────── */

/**
 * Runs daily at 02:00 SGT.
 * Permanently deletes accounts whose `deletionScheduledAt` is past.
 *
 * 7-day grace period: when a user requests deletion, we set
 * `deletionScheduledAt = now + 7 days`. Until then, sign-in is blocked
 * (see auth.ts signIn callback) but data is recoverable. After 7 days,
 * this cron purges everything.
 */
export const finalizeAccountDeletion = inngest.createFunction(
  { id: "finalize-account-deletion" },
  { cron: "TZ=Asia/Singapore 0 2 * * *" },
  async ({ step }) => {
    const { prisma } = await import("@/lib/db/prisma");

    const dueAccounts = await step.run("find-due-accounts", async () => {
      return prisma.user.findMany({
        where: {
          deletionScheduledAt: { lte: new Date() },
        },
        select: { id: true, email: true },
      });
    });

    if (dueAccounts.length === 0) {
      return { deleted: 0 };
    }

    let deleted = 0;
    for (const user of dueAccounts) {
      await step.run(`delete-${user.id}`, async () => {
        // Cascade deletes handle most rows. Storage cleanup separately.
        await prisma.user.delete({ where: { id: user.id } });
        deleted++;
      });
    }

    return { deleted, accounts: dueAccounts.map((a) => a.email) };
  },
);

/* ── Cron: cleanup expired tokens ────────────────────────── */

/**
 * Runs every 6 hours.
 * Deletes PasswordReset rows older than 7 days (well past 30-min expiry,
 * keeps the table from growing unbounded).
 */
export const cleanupExpiredTokens = inngest.createFunction(
  { id: "cleanup-expired-tokens" },
  { cron: "TZ=Asia/Singapore 0 */6 * * *" },
  async ({ step }) => {
    const { prisma } = await import("@/lib/db/prisma");
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const deleted = await step.run("delete-old-tokens", async () => {
      return prisma.passwordReset.deleteMany({
        where: { expiresAt: { lt: cutoff } },
      });
    });

    return { deleted: deleted.count };
  },
);

/* ── Cron: cleanup expired Auth.js sessions ──────────────── */

/**
 * Runs every 6 hours.
 * Auth.js Sessions have an `expires` column; deleting expired rows keeps
 * the table size bounded.
 */
export const cleanupExpiredSessions = inngest.createFunction(
  { id: "cleanup-expired-sessions" },
  { cron: "TZ=Asia/Singapore 30 */6 * * *" },
  async ({ step }) => {
    const { prisma } = await import("@/lib/db/prisma");
    const deleted = await step.run("delete-expired-sessions", async () => {
      return prisma.session.deleteMany({
        where: { expires: { lt: new Date() } },
      });
    });
    return { deleted: deleted.count };
  },
);

/* ── Event-driven: order paid → fulfillment ──────────────── */

/**
 * Triggered by the Stripe webhook handler when payment succeeds.
 *
 * **Fulfillment:** `dispatchPaidOrderFulfillment` (see `lib/commerce/fulfillment-dispatch.ts`)
 * — optional `FULFILLMENT_WEBHOOK_URL` POST; otherwise stub logging. Then `mark-processing`.
 */
export const handleOrderPaid = inngest.createFunction(
  { id: "handle-order-paid", retries: 3 },
  { event: "order/paid" },
  async ({ event, step }) => {
    const { prisma } = await import("@/lib/db/prisma");
    const order = await step.run("fetch-order", async () => {
      return prisma.order.findFirst({
        where: { id: event.data.orderId },
        include: { items: true },
      });
    });
    if (!order) return { skipped: true, reason: "order not found" };

    if (
      order.status === "processing" ||
      order.status === "shipped" ||
      order.status === "delivered"
    ) {
      return { skipped: true, reason: "already in fulfillment pipeline" };
    }
    if (order.status !== "paid") {
      return {
        skipped: true,
        reason: `expected status paid, got ${order.status}`,
      };
    }

    await step.run("fulfillment-integration", async () => {
      const { dispatchPaidOrderFulfillment } =
        await import("@/lib/commerce/fulfillment-dispatch");
      return dispatchPaidOrderFulfillment({
        id: order.id,
        number: order.number,
        totalCents: order.totalCents,
        currency: order.currency,
        stripePaymentIntentId: order.stripePaymentIntentId,
        items: order.items.map((i) => ({
          productId: i.productId,
          variantId: i.variantId,
          qty: i.qty,
          snapshot: i.snapshot,
        })),
      });
    });

    await step.run("ensure-delivery-row", async () => {
      const { ensureDeliveryForProcessingOrder } =
        await import("@/lib/commerce/ensure-delivery");
      await ensureDeliveryForProcessingOrder(order.id);
    });

    await step.run("mark-processing", async () => {
      await prisma.order.updateMany({
        where: { id: order.id, status: "paid" },
        data: { status: "processing" },
      });
    });

    return { orderId: order.id, status: "processing" as const };
  },
);

/* ── Event-driven: support staff replied → email user ───── */

/**
 * Triggered when a Furnishes staff member replies to a support thread.
 * Sends an email to the user (via Resend) so they're notified.
 *
 * Triggered from the future admin UI (NOT yet built) by:
 *   await inngest.send({
 *     name: "support/staff.replied",
 *     data: { threadId, messageId },
 *   });
 */
export const notifyUserOfStaffReply = inngest.createFunction(
  { id: "notify-user-of-staff-reply", retries: 3 },
  { event: "support/staff.replied" },
  async ({ event, step }) => {
    const { prisma } = await import("@/lib/db/prisma");
    const { sendSupportReplyEmail } = await import("@/lib/email/send");

    const data = await step.run("fetch-thread-and-message", async () => {
      const thread = await prisma.supportThread.findFirst({
        where: { id: event.data.threadId },
        include: {
          user: { select: { email: true, name: true } },
        },
      });
      const message = await prisma.supportMessage.findFirst({
        where: { id: event.data.messageId },
      });
      return { thread, message };
    });

    if (!data.thread || !data.message || !data.thread.user.email) {
      return { skipped: true };
    }

    await step.run("send-email", async () => {
      await sendSupportReplyEmail({
        to: data.thread!.user.email!,
        name: data.thread!.user.name,
        ticketNumber: data.thread!.number,
        ticketTitle: data.thread!.title,
        staffName: data.message!.staffName ?? "Furnishes Support",
        replyExcerpt: data.message!.content.slice(0, 500),
        threadUrl: `${getPublicOrigin()}/account/support/${data.thread!.id}`,
      });
    });

    return { sent: true };
  },
);

/* ── Function registry — exported for /api/inngest/route.ts ── */

export const inngestFunctions = [
  finalizeAccountDeletion,
  cleanupExpiredTokens,
  cleanupExpiredSessions,
  handleOrderPaid,
  notifyUserOfStaffReply,
];
