import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { randomBytes } from "crypto";
import type { Prisma } from "@prisma/client";
import { DeliveryMethod } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/auth";
import { apiError } from "@/lib/api/error";
import { strictRateLimit, CHECKOUT_LIMITS } from "@/lib/rate-limit";
import { clientIdentity } from "@/lib/api/identity";
import { isCommerceBackendEnabled } from "@/lib/site/commerce/server-flags";
import { addressToShippingSnapshot } from "@/lib/commerce/shipping-snapshot";
import { deliveryCentsForMethod } from "@/lib/commerce/delivery-options";
import { stripeIsConfigured } from "@/lib/payments/stripe";

const BodySchema = z.object({
  shippingAddressId: z.string().min(1),
  deliveryMethod: z.nativeEnum(DeliveryMethod),
  /** Shipping / handling in cents (from checkout delivery step). */
  deliveryCents: z.number().int().min(0),
});

function generateOrderNumber(): string {
  return `ORD-${Date.now().toString(36)}-${randomBytes(3).toString("hex").toUpperCase()}`;
}

/**
 * POST /api/orders
 *
 * Builds an `Order` (status `placed`) + `OrderItem` rows from the signed-in
 * user's cart, then clears those cart lines. Call `/api/checkout/intent` next
 * with the returned `orderId` to obtain a Stripe PaymentIntent.
 */
export async function POST(req: NextRequest) {
  try {
    if (!isCommerceBackendEnabled()) {
      return NextResponse.json(
        {
          error: "COMMERCE_DISABLED",
          message:
            "Orders API is disabled. Set COMMERCE_BACKEND_ENABLED=1 when ready.",
        },
        { status: 501 },
      );
    }

    if (!stripeIsConfigured) {
      return NextResponse.json(
        {
          error: "PAYMENTS_NOT_CONFIGURED",
          message:
            "Payment processing is not configured (STRIPE_SECRET_KEY). Orders cannot be placed until Stripe is configured.",
        },
        { status: 503 },
      );
    }

    const identity = clientIdentity(req);
    const limit = await strictRateLimit(identity, CHECKOUT_LIMITS.placeOrder);
    if (!limit.success) {
      return NextResponse.json(
        { error: "RATE_LIMIT", message: "Too many order attempts." },
        { status: 429 },
      );
    }

    const { userId } = await requireUser();
    const body = BodySchema.parse(await req.json());

    const expectedDelivery = deliveryCentsForMethod(body.deliveryMethod);
    if (body.deliveryCents !== expectedDelivery) {
      return NextResponse.json(
        {
          error: "DELIVERY_MISMATCH",
          message: "Delivery fee does not match the selected method.",
        },
        { status: 400 },
      );
    }

    const [address, cart] = await Promise.all([
      prisma.address.findFirst({
        where: { id: body.shippingAddressId, userId },
      }),
      prisma.cart.findUnique({
        where: { userId },
        include: {
          items: { where: { savedForLater: false } },
        },
      }),
    ]);

    if (!address) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Shipping address not found." },
        { status: 404 },
      );
    }
    if (!cart || cart.items.length === 0) {
      return NextResponse.json(
        {
          error: "EMPTY_CART",
          message: "Add items to your cart before placing an order.",
        },
        { status: 400 },
      );
    }

    const lines = cart.items;
    const currencies = new Set(lines.map((l) => l.currency));
    if (currencies.size > 1) {
      return NextResponse.json(
        {
          error: "MIXED_CURRENCY",
          message:
            "Cart contains mixed currencies; complete checkout separately.",
        },
        { status: 400 },
      );
    }

    const currency = lines[0]!.currency;
    const subtotalCents = lines.reduce(
      (sum, i) => sum + i.unitPriceCents * i.qty,
      0,
    );
    const discountCents = Math.min(cart.giftDiscountCents, subtotalCents);
    const totalCents = subtotalCents + body.deliveryCents - discountCents;

    if (totalCents < 1) {
      return NextResponse.json(
        {
          error: "INVALID_TOTAL",
          message: "Order total must be at least one cent after discounts.",
        },
        { status: 400 },
      );
    }

    const productIds = [...new Set(lines.map((l) => l.productId))];
    const shortlistRows = await prisma.shortlistItem.findMany({
      where: { userId, productId: { in: productIds } },
      select: {
        productId: true,
        productName: true,
        productCategory: true,
        coverHue: true,
      },
    });
    const shortlistByProductId = new Map(
      shortlistRows.map((s) => [s.productId, s]),
    );

    const number = generateOrderNumber();
    const shippingSnapshot = addressToShippingSnapshot({
      label: String(address.label),
      recipientName: address.recipientName,
      phone: address.phone,
      postalCode: address.postalCode,
      street: address.street,
      unit: address.unit,
      landmark: address.landmark,
      hasLiftAccess: address.hasLiftAccess,
    });

    const order = await prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          userId,
          number,
          status: "placed",
          subtotalCents,
          deliveryCents: body.deliveryCents,
          discountCents,
          totalCents,
          currency,
          shippingAddressId: address.id,
          paymentMethodId: null,
          deliveryMethod: body.deliveryMethod,
          shippingSnapshot,
          items: {
            create: lines.map(
              (line): Prisma.OrderItemCreateWithoutOrderInput => {
                const sl = shortlistByProductId.get(line.productId);
                const snapshot: Prisma.InputJsonValue = {
                  productId: line.productId,
                  variantId: line.variantId,
                  qty: line.qty,
                  unitPriceCents: line.unitPriceCents,
                  name:
                    sl?.productName ?? `Product ${line.productId.slice(0, 8)}`,
                  category: sl?.productCategory ?? "general",
                  coverHue: sl?.coverHue ?? 200,
                };
                return {
                  productId: line.productId,
                  variantId: line.variantId,
                  qty: line.qty,
                  unitPriceCents: line.unitPriceCents,
                  snapshot,
                };
              },
            ),
          },
        },
        select: {
          id: true,
          number: true,
          totalCents: true,
          currency: true,
          status: true,
        },
      });

      await tx.cartItem.deleteMany({
        where: { id: { in: lines.map((l) => l.id) } },
      });

      return created;
    });

    return NextResponse.json({
      orderId: order.id,
      number: order.number,
      totalCents: order.totalCents,
      currency: order.currency,
      status: order.status,
    });
  } catch (e) {
    return apiError(e);
  }
}
