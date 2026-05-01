import { describe, it, expect, vi, beforeEach } from "vitest";
import { Prisma } from "@prisma/client";
import { NextRequest } from "next/server";

const verifyWebhookSignature = vi.hoisted(() => vi.fn());

const prismaMock = vi.hoisted(() => ({
  processedStripeEvent: {
    create: vi.fn(),
    deleteMany: vi.fn(),
  },
  order: {
    findFirst: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
  activityEvent: { create: vi.fn() },
  $transaction: vi.fn(),
}));

vi.mock("@/lib/payments/stripe", () => ({
  verifyWebhookSignature,
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: prismaMock,
}));

vi.mock("@/lib/eva/core/public-origin", () => ({
  getPublicOrigin: () => "https://test.invalid",
}));

vi.mock("@/lib/email/send", () => ({
  sendOrderConfirmationEmail: vi.fn(),
}));

vi.mock("@/lib/site/money", () => ({
  formatSGD: (cents: number) => `S$${(cents / 100).toFixed(2)}`,
}));

import { POST } from "@/app/api/webhooks/stripe/route";

function uniqueViolation(): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
    code: "P2002",
    clientVersion: "test",
    meta: { target: ["stripeEventId"] },
  });
}

async function postStripeWebhook(body = "{}") {
  return POST(
    new NextRequest("http://localhost/api/webhooks/stripe", {
      method: "POST",
      headers: { "stripe-signature": "t=1,v1=x" },
      body,
    }),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  verifyWebhookSignature.mockResolvedValue({
    ok: true,
    event: {
      id: "evt_test_1",
      type: "customer.updated",
      data: { object: {} },
    },
  });
  prismaMock.processedStripeEvent.create.mockResolvedValue({});
});

describe("POST /api/webhooks/stripe", () => {
  it("returns 400 when stripe-signature is missing", async () => {
    const res = await POST(
      new NextRequest("http://localhost/api/webhooks/stripe", {
        method: "POST",
        body: "{}",
      }),
    );
    expect(res.status).toBe(400);
  });

  it("acknowledges duplicate Stripe event ids (P2002) without touching orders", async () => {
    prismaMock.processedStripeEvent.create.mockRejectedValueOnce(
      uniqueViolation(),
    );
    const res = await postStripeWebhook();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ received: true });
    expect(prismaMock.order.findFirst).not.toHaveBeenCalled();
  });

  it("deletes dedup row and returns 500 when the handler throws", async () => {
    verifyWebhookSignature.mockResolvedValue({
      ok: true,
      event: {
        id: "evt_fail",
        type: "payment_intent.succeeded",
        data: {
          object: {
            id: "pi_x",
            metadata: { order_id: "ord1" },
            charges: { data: [] },
          },
        },
      },
    });
    prismaMock.order.findFirst.mockResolvedValue({
      id: "ord1",
      status: "placed",
      number: "ORD-1",
      userId: "u1",
      totalCents: 1000,
      user: { email: "a@b.com", name: "N" },
    });
    prismaMock.$transaction.mockRejectedValue(new Error("tx failed"));

    const res = await postStripeWebhook();
    expect(res.status).toBe(500);
    expect(prismaMock.processedStripeEvent.deleteMany).toHaveBeenCalledWith({
      where: { stripeEventId: "evt_fail" },
    });
  });
});
